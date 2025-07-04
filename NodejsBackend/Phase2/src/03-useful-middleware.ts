import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// TypeScript型定義
interface ExtendedRequest extends Request {
    id?: string;
}

interface ApiDataResponse {
    message: string;
    requestId: string;
    data: any;
}

interface HomeResponse {
    message: string;
    requestId: string;
    timestamp: string;
    ip: string;
    userAgent: string;
}

const app = express();

// ========== セキュリティミドルウェア ==========
// Helmet: セキュリティヘッダーを自動設定
app.use(helmet());

// CORS: クロスオリジンリクエストを許可
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:8080'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ========== ログミドルウェア ==========
// Morgan: アクセスログを自動出力
app.use(morgan('combined')); // 詳細ログ
// app.use(morgan('tiny')); // 簡潔ログ

// ========== データ処理ミドルウェア ==========
// JSON解析
app.use(express.json({ limit: '10mb' }));

// URL-encoded形式解析（HTMLフォーム用）
app.use(express.urlencoded({ extended: true }));

// ========== カスタムミドルウェア ==========
// リクエストIDを追加
app.use((req: ExtendedRequest, res: Response, next: NextFunction) => {
    req.id = Math.random().toString(36).substr(2, 9);
    res.setHeader('X-Request-ID', req.id);
    next();
});

// レート制限（簡易版）
const requestCounts = new Map<string, number>();

app.use((req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const count = requestCounts.get(ip) || 0;
    
    if (count > 100) { // 1分間に100リクエスト制限
        res.status(429).json({ error: 'レート制限に達しました' });
        return;
    }
    
    requestCounts.set(ip, count + 1);
    
    // 1分後にカウントリセット
    setTimeout(() => {
        requestCounts.delete(ip);
    }, 60000);
    
    next();
});

// ========== ルート ==========
app.get('/', (req: ExtendedRequest, res: Response<HomeResponse>) => {
    res.json({
        message: 'Express.js + TypeScript ミドルウェアデモ',
        requestId: req.id || 'unknown',
        timestamp: new Date().toISOString(),
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown'
    });
});

app.post('/api/data', (req: ExtendedRequest, res: Response<ApiDataResponse>) => {
    res.json({
        message: 'データを受信しました',
        requestId: req.id || 'unknown',
        data: req.body
    });
});

app.listen(3000, () => {
    console.log('Express.js + TypeScript ミドルウェアサーバー起動: http://localhost:3000');
});

export { app };