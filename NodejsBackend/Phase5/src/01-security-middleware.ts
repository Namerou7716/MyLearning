import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { body, validationResult, query, param } from 'express-validator';
import xss from 'xss';

//TypeScript型定義
interface SecurityConfig {
    cors: {
        origin: string[] | boolean;
        credentials: boolean;
        methods: string[];
        allowedHeaders: string[];
    };
    rateLimit: {
        windowMs: number;
        max: number;
        message: string;
    };
    slowDown: {
        windowMs: number;
        delayAfter: number;
        delayMs: number;
    };
    helmet: {
        contentSecurityPolicy: boolean;
        crossOriginEmbedderPolicy: boolean;
    };
}

interface ValidationError {
    field: string;
    message: string;
    value?: any;
}

//セキュリティ脅威を除去した安全なデータ
interface SanitizedRequest extends Request {
    sanitized?: {
        body: any; //安全に処理されたリクエストボディ
        query: any; //安全に処理されたクエリパラメータ
        params: any; //安全に処理されたパスパラメータ
    };
}

//セキュリティ設定
const securityConfig: SecurityConfig = {
    cors: {
        origin: process.env.NODE_ENV === 'production' ?//APIにアクセスできるオリジンの設定
            ['https://yourdomain.com', 'https://api.yourdomain.com'] //本番環境
            : ['http://localhost:3000', 'http://localhost:3001'],//開発環境
        credentials: true,//Cookie,Authoriizationヘッダーを含むリクエストを許可、認証情報付きリクエストを許可
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],//TRACE以外のメソッドを使用可能に
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']//クライアントが送信可能なヘッダーを制限
    },
    rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: 'リクエスト回数が上限に達しました。後でもう一度お試しください'
    },
    slowDown: {
        windowMs: 15 * 60 * 1000,
        delayAfter: 50,//50リクエスト後から遅延開始
        delayMs: 500//500ms遅延
    },
    helmet: {
        contentSecurityPolicy: process.env.NODE_ENV === 'production',
        crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production'
    }
};

//セキュリティミドルウェア関数

/**
 * CORS設定を適用する
 */
const configureCORS = (): express.RequestHandler => {
    return cors({
        origin: (origin, callback) => {
            //開発環境ではundefined（同一オリジン）を許可
            if (process.env.NODE_ENV !== 'production' && !origin) {
                return callback(null, true);
            }

            const allowedOrigins = securityConfig.cors.origin as string[];
            if (allowedOrigins.includes(origin || '')) {
                callback(null, true);
            } else {
                callback(new Error('CORS policy violation'));
            }
        },
        credentials: securityConfig.cors.credentials,
        methods: securityConfig.cors.methods,
        allowedHeaders: securityConfig.cors.allowedHeaders,
        optionsSuccessStatus: 200
    });
}

/**
 * レート制限を設定する
 * @param options デフォルト値を上書き
 * @returns 
 */
const configureRateLimit = (options?: Partial<typeof securityConfig.rateLimit>): express.RequestHandler => {
    const config = { ...securityConfig.rateLimit, ...options };

    //express-rate-limitライブラリのrateLimit関数
    return rateLimit({
        windowMs: config.windowMs,
        max: config.max,
        message: {
            error: config.message,
            retryAfter: Math.ceil(config.windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req: Request, res: Response) => {
            res.status(429).json({
                error: config.message,
                retryAfter: Math.ceil(config.windowMs / 1000)
            });
        }
    });
}

/**
 * レスポンス遅延を設定する
 * @param options デフォルト値を上書きする
 * @returns 
 */
const configureSlowDown = (options?: Partial<typeof securityConfig.slowDown>): express.RequestHandler => {
    //デフォルト値とのマージ
    const config = { ...securityConfig.slowDown, ...options };

    return slowDown({
        windowMs: config.windowMs,
        delayAfter: config.delayAfter,
        delayMs: config.delayMs,
        maxDelayMs: 10000
    });
}

/**
 * セキュリティヘッダーを設定する
 */
const configureHelmet = (): express.RequestHandler => {
    return helmet({
        contentSecurityPolicy: securityConfig.helmet.contentSecurityPolicy ? {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                objectSrc: ["'none'"],
                upgradeInsecureRequest: []
            }
        } : false,
        crossOriginEmbedderPolicy: securityConfig.helmet.crossOriginEmbedderPolicy,
        hsts: {
            maxAge: 31536000,//1年
            includeSubDomains: true,
            preload: true
        }
    })
}

/**
 * XSS防止のためのサニタイゼーション
 * @param req 
 * @param res 
 * @param next 
 */
const sanitizeInput = (req: SanitizedRequest, res: Response, next: NextFunction): void => {
    //ネスト↓オブジェクトを再帰的にサニタイズする関数を定義
    const sanitizeObject = (obj: any): any => {
        if (typeof obj === 'string') {
            return xss(obj, {
                whiteList: {},//HTMLタグを一切許可しない
                stripIgnoreTag: true,//不明なタグを削除
                stripIgnoreTagBody: ['script']//scriptタグの中身を削除
            });
        }

        //配列の場合→各要素を再帰的にサニタイズ
        if (Array.isArray(obj)) {
            return obj.map(sanitizeObject);
        }

        //オブジェクトの場合→各プロパティを再帰的にサニタイズ
        if (obj && typeof obj === 'object') {
            const sanitized: any = {};
            for (const [key, value] of Object.entries(obj)) {
                sanitized[key] = sanitizeObject(value);
            }
            return sanitized;
        }
        //その他→数値、booleanをそのまま返す
        return obj;
    }

    //リクエストの各部分をサニタイズして保存
    req.sanitized = {
        body: sanitizeObject(req.body),
        query: sanitizeObject(req.query),
        params: sanitizeObject(req.params)
    };

    next();

}

//次のミドルウェアに回す
const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const validationErrors: ValidationError[] = errors.array().map(error => ({
            field: error.type === 'field' ? error.path : 'unknown',
            message: error.msg,
            value: error.type === 'field' ? error.value : undefined
        }));

        res.status(400).json({
            error: 'バリデーションエラー',
            details: validationErrors
        })
        return;
    }

    next();
}

/**
 * SQLインジェクション対策のバリデーション
 * @param value 
 * @returns 
 */
const validationSQLSafe = (value: string): boolean => {
    const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
        /(;|\|\||&&)/,
        /('|(\\x27)|(\\x2D\\x2D)|(%27)|(%2D%2D))/
    ];

    return !sqlPatterns.some(pattern => pattern.test(value));
}

/**
 * 共通バリデーションルール
 */
const validationRules = {
    email: body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('有効なメールアドレスを入力してください'),

    password: body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('パスワードは8文字以上128文字以下である必要があります')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('パスワードは小文字、大文字、数字を含む必要があります'),

    name: body('name')
        .isLength({ min: 1, max: 100 })
        .withMessage('名前は1文字以上100文字以下である必要があります')
        .custom((value: string) => {
            if (!validationSQLSafe(value)) {
                throw new Error('不正な文字が含まれています')
            }
            return true;
        }),
    
    id:param('id')
        .isInt({min:1})
        .withMessage('有効なIDを指定してください'),
    
    text:body('text')
        .isLength({min:1,max:1000})
        .withMessage('テキストは1文字以上1000文字以下である必要があります')
        .custom((value:string)=>{
            if(!validationSQLSafe(value)){
                throw new Error('不正な文字が含まれています');
            }
            return true;
        }),
    
    priority:body('priority')
        .optional()
        .isIn(['low','medium','high']) 
        .withMessage('優先度はlow,medium,highのいずれかである必要があります'),

    page:query('page')
        .optional()
        .isInt({min:1,max:1000})
        .withMessage('リミットは1以上1000以下である必要があります'),

    limit: query('limit')
        .optional()
        .isInt({min:1,max:100})
        .withMessage('リミットは1以上100以下である必要があります'),

    search:query('search')
        .optional()
        .isLength({max:100})
        .withMessage('検索文字列は100文字以下である必要があります')
        .custom((value:string)=>{
            if(value && !validationSQLSafe(value)){
                throw new Error('検索文字列に不正な文字が含まれています');
            }

            return true;
        })
}


const validateApiKey = (req:Request,res:Response,next:NextFunction):void=>{
    const apiKey = req.headers['x-api-key'] as string;
    const validateApiKey = process.env.VALID_API_KEYS?.split(',')||[];

    if(!apiKey || ! validateApiKey.includes(apiKey)){
        res.status(401).json({error:'無効なAPIキーです'});
        return;
    }

    next();
};


/**
 * Content-Type検証
 * @param expectedType 
 * @returns 
 */
const validateContentType = (expectedType:string)=>{
    return (req:Request,res:Response,next:NextFunction):void=>{
        if(req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH'){
            const contentType = req.headers['content-type'];

            if(!contentType || !contentType.includes(expectedType)){
                res.status(400).json({
                    error:'Content-Type must be' +`${expectedType}`
                });
                return;
            }
        }
        next();
    }
}

const limitRequestSize = (maxSize:string = '1mb')=>{
    return express.json({limit:maxSize});
};

/**
 * セキュリティミドルウェアを一括適用
 * @param app 
 */
const applySecurityMiddleware = (app:express.Application):void=>{
    //セキュリティヘッダ
    app.use(configureHelmet());
    //CORS設定
    app.use(configureCORS());
    //リクエストサイズ制限
    app.use(limitRequestSize('1mb'));
    //Content-Type検証
    app.use(validateContentType('application/json'));
    //基本的なレート制限
    app.use(configureRateLimit());
    //レスポンス遅延
    app.use(configureSlowDown());
    //入力サニタイゼーション
    app.use(sanitizeInput);

    //セキュリティログ出力
    app.use((req:Request,res:Response,next:NextFunction)=>{
        console.log(`${new Date().toISOString()}-${req.method} ${req.path} = IP: ${req.ip}`);
        next();
    });
};

/**
 * 特定エンドポイント用のセキュリティ設定
 */
const securityPresets = {
    //認証エンドポイント用（厳しい制限）
    auth:[
        configureRateLimit({
            windowMs:15*60*1000,
            max:5,
            message:'ログイン試行回数が上限に達しました'
        }),
        configureSlowDown({delayAfter:2,delayMs:1000})
    ],

    public:[
        configureRateLimit({
            windowMs:15*60*1000,
            max:50
        })
    ],

    admin:[
        configureRateLimit({
            windowMs:15*60*1000,
            max:200
        }),
        validateApiKey
    ]
}

// ========== エクスポート ==========
export {
    applySecurityMiddleware,
    configureCORS,
    configureRateLimit,
    configureSlowDown,
    configureHelmet,
    sanitizeInput,
    handleValidationErrors,
    validateApiKey,
    validateContentType,
    limitRequestSize,
    validationRules,
    securityPresets,
    type SecurityConfig,
    type ValidationError,
    type SanitizedRequest
};