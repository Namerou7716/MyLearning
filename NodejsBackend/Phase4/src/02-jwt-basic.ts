import jwt from 'jsonwebtoken';
import { userInfo } from 'os';
import { getJSDocReturnType } from 'typescript';
import { pathToFileURL } from 'url';

//型定義
interface User {
    id: number;
    email: string;
    name: string;
    role: 'user' | 'admin';
}

interface JwtPayload {
    userId: number;
    email: string;
    role: 'user' | 'admin';
    iat?: number;//issued at（発行時刻）
    exp?: number;//expires at（有効期限）
}

interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

interface TokenValidationResult {
    valid: boolean,
    payload?: JwtPayload,
    error?: string;
}

//JWT設定
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key';
const ACCESS_TOKEN_EXPIRES_IN = '15m';//15分
const REFRESH_TOKEN_EXPIRES_IN = '7d'//7日

//リフレッシュトークンストレージ(本番環境ではRedisやデータベースを使用)
const refreshTokenStore = new Set<string>();

//JWTユーティリティ関数

/**
 * 
 * アクセストークンを生成する
 * @param user ユーザー情報
 * @returns アクセストークン
 */
const generateAccessToken = (user: User): string => {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
        userId: user.id,
        email: user.email,
        role: user.role
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        issuer: 'todo-api',
        audience: 'todo-app'
    });
};

/**
 * リフレッシュトークンを生成する
 * @param user ユーザー情報
 * @returns リフレッシュトークン
 */
const generateRefreshToken = (user: User): string => {
    const payload: Omit<JwtPayload, 'lat' | 'exp'> = {
        userId: user.id,
        email: user.email,
        role: user.role
    };

    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        issuer: user.email,
        audience: 'todo-app'
    })
    //リフレッシュトークンをストレージに保存
    refreshTokenStore.add(refreshToken);
    return refreshToken;
};


/**
 * 
 * アクセストークンとリフレッシュトークンのペアを生成する
 * @param user ユーザー情報
 * @returns トークンペア
 */
const generateTokenPair = (user: User): TokenPair => {
    return {
        accessToken: generateAccessToken(user),
        refreshToken: generateRefreshToken(user)
    }
}

/**
 * アクセストークンを検証する
 * @param token JWTトークン
 * @returns 検証結果
 */
const verifyAccessToken = (token: string): TokenValidationResult => {
    try {

        const payload = jwt.verify(token, JWT_SECRET, {
            issuer: 'todo-api',
            audience: 'todo-app'
        }) as JwtPayload;

        return {
            valid: true,
            payload
        };
    }catch(error){
        let errorMessage = 'トークンが無効です';
        if(error instanceof jwt.TokenExpiredError){
            errorMessage += 'トークンの通行期限がきれてます'
        }else if(error instanceof jwt.JsonWebTokenError){
            errorMessage += 'トークンの形式が正しくありません'
        }
        return {
            valid:false,
            error:errorMessage
        }
    }
}

/**
 * リフレッシュトークンを検証する
 * @param token リフレッシュトークン
 * @returns 検証結果
 */
const verifyRefreshToken = (token:string):TokenValidationResult=>{
    try{
        //ストレージに存在するかチェック
        if(!refreshTokenStore.has(token)){
            return{
                valid:false,
                error:'リフレッシュトークンが無効です'
            }
        }

        const payload = jwt.verify(token,JWT_REFRESH_SECRET,{
            issuer:'todo-api',
            audience:'todo-app'
        })as JwtPayload;

        return{
            valid:true,
            payload
        };
    }catch(error){
        let errorMessage = 'リフレッシュトークンが無効です';
        if(error instanceof jwt.TokenExpiredError){
            errorMessage = 'リフレッシュトークンの有効期限が切れています';
        }

        return{
            valid:false,
            error:errorMessage
        }
    }
}

/**
 * リフレッシュトークンを使用して新しいアクセストークンを生成する
 * @param refreshToken リフレッシュトークン
 * @returns 新しいアクセストークンまたはエラー
 */
const refreshAccessToken = (refreshToken:string):{success:boolean,accessToken?:string,error?:string}=>{
    const verification = verifyRefreshToken(refreshToken); 

    if(!verification.valid || !verification.payload){
        return{
            success:false,
            error:verification.error
        }
    }
    //ユーザー情報を再構築(実際にはDBから取得する)
    const user:User = {
        id:verification.payload.userId,
        email:verification.payload.email,
        name:'User Name',//実際にはDBから取得する
        role:verification.payload.role
    };
    const newAccessToken = generateAccessToken(user);

    return{
        success:true,
        accessToken:newAccessToken
    };
};