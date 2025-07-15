import express, { Request, Response, NextFunction, response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit';

import {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    refreshTokenStore,
    type User,
    type JwtPayload
} from './02-jwt-basic'
import { errorMonitor } from 'events';
import { access } from 'fs';

//TypeScript型定義（03-auth-express.ts専用）
interface AuthUser extends User {
    password: string;
    isActive: boolean;
    createdAt: Date;
    lastLoginAt?: Date;
}

interface AuthRequest extends Request {
    user?: {
        userId: number;
        email: string;
        role: 'user' | 'admin';
    };
}

interface RegisterRequest {
    email: string;
    password: string;
    name: string;
}

interface LoginRequest {
    email: string;
    password: string;
}

//設定
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-key';

//インメモリストレージ
const users: AuthUser[] = [];
let nextUserId = 1;

//Express設定
const app = express();
app.use(express.json());


//レート制限設定
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,//15分
    max: 5,//最大5回の試行
    message: {
        error: 'ログイン試行回数が上限に達しました。15分後に再試行してください。'
    }
});

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,//15分
    max: 100,//一般的なAPIは100回
    message: {
        error: 'リクエスト回数が上限に達しました。後でもう一度お試しください。'
    }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api', generalLimiter);

//ユーティリティ関数
const hashPassword = async (password: string): Promise<string> => {
    return await bcrypt.hash(password, 12);
};

const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
    return await bcrypt.compare(password, hashedPassword);
};

const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePassword = (password: string): { isValid: boolean, errors: string[] } => {
    const errors: string[] = [];

    if (password.length < 8) {
        errors.push('パスワードは8文字以上である必要があります');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('大文字を1文字以上含む必要があります');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('小文字を1文字以上含む必要があります');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('数字を1文字以上含む必要があります');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

//認証ミドルウェア
const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];//Bearer TOKEN

    if (!token) {
        res.status(401).json({ error: 'アクセストークンが必要です' });
        return;
    }

    const verification = verifyAccessToken(token);
    if (!verification.valid || !verification.payload) {
        res.status(401).json({ error: verification.error || '無効なトークンです' });
        return;
    }

    req.user = {
        userId: verification.payload.userId,
        email: verification.payload.email,
        role: verification.payload.role
    };

    next();
};

const requireRole = (requiredRole: 'user' | 'admin') => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: '認証が必要です。' });
            return;
        }

        if (req.user.role === 'admin' || req.user.role === requiredRole) {
            next();
        } else {
            res.status(403).json({ error: '権限が不足しています' });
        }
    };
};

//認証エンドポイント

//ユーザー登録
app.post('/api/auth/register', async (req: Request<{}, {}, RegisterRequest>, res: Response) => {
    try {
        const {email,password,name} = req.body;

        //バリデーション
        if(!email || !password || !name){
            return res.status(400).json({
                error:'メールアドレス、パスワード、名前は必須です'
            });
        }

        if(!validateEmail(email)){
            return res.status(400).json({
                error:'有効なメールアドレスを入力してください'
            });
        }

        const passwordValidation = validatePassword(password);
        if(!passwordValidation.isValid){
            return res.status(400).json({
                error:'パスワードの要件を満たしていません',
                details:passwordValidation.errors
            });
        }

        //重複チェック
        const existingUser = users.find(user=>user.email === email);
        if(existingUser){
            return res.status(400).json({
                error:'このメールアドレスは既に使用されています'
            });
        }

        //パスワードハッシュ化
        const hashedPassword = await hashPassword(password);

        //ユーザー作成
        const newUser:AuthUser = {
            id:nextUserId++,
            email,
            password:hashedPassword,
            name,
            role:'user',
            isActive:true,
            createdAt:new Date()
        };
        users.push(newUser);

        //トークン生成
        const accessToken = generateAccessToken(newUser);
        const refreshToken = generateRefreshToken(newUser);

        //パスワードを除き返却
        const {password:_,...userWithoutPassword} = newUser;

        res.status(201).json({
            message:'ユーザー登録が完了しました',
            user:userWithoutPassword,
            tokens:{
                accessToken,
                refreshToken
            }
        });
    } catch (error) {
        console.error('ユーザー登録エラー:',error);
        res.status(500).json({
            error:'サーバーエラーが発生しました'
        });
    }
})

//ログイン
app.post('/api/auth/login',async(req:Request<{},{},LoginRequest>,res:Response)=>{
    try{
        const {email,password} = req.body;

        //バリデーション
        if(!email||!password){
            return res.status(400).json({
                error:'メールアドレスとパスワードは必須です'
            });
        }

        //ユーザー検索
        const user = users.find(u=>u.email === email && u.isActive);
        if(!user){
            return res.status(401).json({
                error:'メールアドレスまたはパスワードが正しくありません'
            });
        }

        //最終ログイン時刻更新
        user.lastLoginAt = new Date();

        //トークン生成
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        //パスワードを除いて返却
        const {password:_,...userWithoutPassword} = user;

        res.json({
            message:'ログインに成功しました',
            user:userWithoutPassword,
            tokens:{
                accessToken,
                refreshToken
            }
        });
    }catch(error){
        console.error('ログインエラー:',error);
        res.status(500).json({
            error:'サーバーエラーが発生しました。'
        });
    }
})
// トークンリフレッシュ
app.post('/api/auth/refresh', (req: Request<{}, {}, {refreshToken: string}>, res: Response) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(400).json({ error: 'リフレッシュトークンが必要です' });
        }
        
        // ストレージに存在するかチェック
        if (!refreshTokenStore.has(refreshToken)) {
            return res.status(403).json({ error: '無効なリフレッシュトークンです' });
        }
        
        // トークン検証
        const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET, {
            issuer: 'todo-api',
            audience: 'todo-app'
        }) as JwtPayload;
        
        // ユーザー検索
        const user = users.find(u => u.id === payload.userId && u.isActive);
        if (!user) {
            refreshTokenStore.delete(refreshToken); // 無効なトークンを削除
            return res.status(403).json({ error: 'ユーザーが見つかりません' });
        }
        
        // 新しいアクセストークンを生成
        const newAccessToken = generateAccessToken(user);
        
        res.json({
            accessToken: newAccessToken
        });
        
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(403).json({ error: 'リフレッシュトークンの有効期限が切れています' });
        } else {
            res.status(403).json({ error: '無効なリフレッシュトークンです' });
        }
    }
});

// ログアウト
app.post('/api/auth/logout', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
        const { refreshToken } = req.body;
        
        if (refreshToken) {
            refreshTokenStore.delete(refreshToken);
        }
        
        res.json({ message: 'ログアウトしました' });
        
    } catch (error) {
        console.error('ログアウトエラー:', error);
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

// 全デバイスからログアウト
app.post('/api/auth/logout-all', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: '認証が必要です' });
        }
        
        // そのユーザーの全リフレッシュトークンを削除
        let revokedCount = 0;
        for (const token of refreshTokenStore) {
            try {
                const payload = jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
                if (payload.userId === req.user.userId) {
                    refreshTokenStore.delete(token);
                    revokedCount++;
                }
            } catch (error) {
                refreshTokenStore.delete(token); // 無効なトークンは削除
            }
        }
        
        res.json({ 
            message: '全デバイスからログアウトしました',
            revokedTokens: revokedCount
        });
        
    } catch (error) {
        console.error('全ログアウトエラー:', error);
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

// ========== 保護されたエンドポイント ==========

// プロフィール取得
app.get('/api/auth/profile', authenticateToken, (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: '認証が必要です' });
    }
    
    const user = users.find(u => u.id === req.user!.userId);
    if (!user) {
        return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
});

// 管理者専用エンドポイント
app.get('/api/admin/users', authenticateToken, requireRole('admin'), (req: AuthRequest, res: Response) => {
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);
    res.json({ users: usersWithoutPasswords });
});

// ユーザー専用エンドポイント（自分の情報のみ）
app.get('/api/user/info', authenticateToken, requireRole('user'), (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: '認証が必要です' });
    }
    
    res.json({ 
        message: 'ユーザー専用エンドポイントにアクセスしました',
        user: req.user
    });
});

// ========== エラーハンドリング ==========
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('サーバーエラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
});

// ========== サーバー起動 ==========
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`認証APIサーバー起動: http://localhost:${PORT}`);
    console.log('利用可能なエンドポイント:');
    console.log('  POST   /api/auth/register    - ユーザー登録');
    console.log('  POST   /api/auth/login       - ログイン');
    console.log('  POST   /api/auth/refresh     - トークンリフレッシュ');
    console.log('  POST   /api/auth/logout      - ログアウト');
    console.log('  POST   /api/auth/logout-all  - 全デバイスからログアウト');
    console.log('  GET    /api/auth/profile     - プロフィール取得');
    console.log('  GET    /api/admin/users      - 全ユーザー取得（管理者専用）');
    console.log('  GET    /api/user/info        - ユーザー情報取得');
    
    // デモ用管理者ユーザー作成
    createDemoAdmin();
});

// ========== デモデータ ==========
const createDemoAdmin = async (): Promise<void> => {
    const hashedPassword = await hashPassword('Admin123!');
    
    const adminUser: AuthUser = {
        id: nextUserId++,
        email: 'admin@example.com',
        password: hashedPassword,
        name: '管理者',
        role: 'admin',
        isActive: true,
        createdAt: new Date()
    };
    
    users.push(adminUser);
    console.log('\nデモ用管理者アカウントが作成されました:');
    console.log('  Email: admin@example.com');
    console.log('  Password: Admin123!');
};

export { app, authenticateToken, requireRole };