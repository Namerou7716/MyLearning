import express ,{Request,Response,NextFunction} from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'
import {body,param,query} from 'express-validator';
import{
    applySecurityMiddleware,
    handleValidationErrors,
    validationRules,
    securityPresets,
    type SanitizedRequest
}from './01-security-middleware';
import { create } from 'domain';
import { userInfo } from 'os';

//型定義
interface User{
    id:number;
    email:string;
    password:string;
    name:string;
    role:'user'|'admin';
    isActive:boolean;
    loginAttempts:number;
    lockedUntil?:Date;
    createdAt:Date;
    lastLoginAt?:Date;
}

interface Todo{
    id:string;
    text:string;
    completed:boolean;
    priority:'low'|'medium'|'high';
    userId:number;
    createdAt:Date;
    updatedAt:Date;
}

interface AuthRequest extends SanitizedRequest{
    user?:{
        userId:number;
        email:string;
        role:'user'|'admin';
    };
}

interface AuditLog{
    id:number;
    userId?:number;
    action:string;
    resource:string;
    ip:string;
    userAgent:string;
    timestamp:Date;
    success:boolean;
    details?:string;
}

//設定
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const MAX_LOGIN_ATTEMPTS = 5;
const LCOK_TIME = 30*60*1000;//30分

//開発用、インメモリストレージ
const users:User[] = [];
const todos:Todo[] = [];
const auditLogs:AuditLog[] = [];
const refreshTokenStore = new Set<string>();
let nextUserId = 1;
let nextTodoId = 1;
let nextAuditId = 1;

//Express設定
const app = express();

//セキュリティミドルウェアを適用
applySecurityMiddleware(app);

//監査ログ機能
const createAuditLog = (
    action:string,
    resource: string,
    req:Request,
    success:boolean,
    userId?:number,
    details?:string
):void=>{
    const log:AuditLog = {
        id:nextAuditId++,
        userId,
        action,
        resource,
        ip:req.ip || 'unknown',
        userAgent:req.headers['user-agent'] || 'unknown',
        timestamp: new Date(),
        success,
        details
    };

    auditLogs.push(log);

    //セキュリティイベントの場合はコンソールにも出力
    if(!success || action.includes('SECURITY')){
        console.warn(`[SECURITY] ${log.timestamp.toISOString()} - ${action}  on ${resource} from ${log.ip} 0 Success : ${success}`);
    }
};


//認証・認可ミドルウェア
const authenticateToken = (req:AuthRequest,res:Response,next:NextFunction):void => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if(!token){
        createAuditLog('AUTH_MISSING_TOKEN','authentication',req,false);
        res.status(401).json({error : 'アクセストークンが必要です'});
        return;
    }

    try{
        const payload = jwt.verify(token,JWT_SECRET) as any;

        //ユーザーがアクティブかチェック
        const user = users.find(u=>u.id === payload.userId && u.isActive);
        if(!user){
            createAuditLog('AUTH_INVALID_USER','authentication',req,false,payload.userId);
            res.status(403).json({error:'ユーザーが無効です'})
            return;
        }

        req.user = {
            userId: payload.userId,
            email:payload.email,
            role:payload.role
        };

        next();
    }catch(error){
        const errorType = error instanceof jwt.TokenExpiredError ? 'AUTH_TOKEN_EXPIRED' : 'AUTH_TOKEN_INVALID';
        createAuditLog(errorType,'authentication',req,false);

        if(error instanceof jwt.TokenExpiredError){
            res.status(401).json({error:'トークンの有効期限が切れています'});
        }else{
            res.status(403).json({error:'無効なトークンです'});
        }
    }
};

const requireRole = (requiredRole:'user' | 'admin')=>{
    return (req:AuthRequest,res:Response,next:NextFunction):void=>{
        if(!req.user){
            createAuditLog('AUTH_NO_USER','authorization',req,false);
            res.status(401).json({error:'認証が必要です'});
            return;
        }

        if(req.user.role === 'admin' || req.user.role === requiredRole){
            next();
        }else{
            createAuditLog('AUTHZ_UBSUFFICIENT_ROLE','authorization',req,false,req.user.userId,
                `Required: ${requireRole}, Actual: ${req.user.role}`);
        }
    };
};

//ユーティリティ関数
const hashPassword = async(password:string):Promise<string>=>{
    return await bcrypt.hash(password,12);
}

const verifyPassword = async(password:string,hashedPassword:string):Promise<boolean>=>{
    return await bcrypt.compare(password,hashedPassword);
}

const generateAccessToken = (user:User):string=>{
    return jwt.sign(
        {userId:user.id,email:user.email,role:user.role},
        JWT_SECRET,
        {expireIn:'15m'}
    );
};

const isAccountLocked = (user:User):boolean=>{
    return user.lockedUntil ? user.lockedUntil>new Date() : false;
};

const lockAccount = (user:User):void =>{
    user.lockedUntil = new Date(Date.now() + LCOK_TIME);
    user.loginAttempts = 0;
};

const incrementLoginAttempts = (user:User):void =>{
    user.loginAttempts += 1;
    if(user.loginAttempts >= MAX_LOGIN_ATTEMPTS){
        lockAccount(user);
    }
}

const resetLoginAttempts = (user:User):void =>{
    user.loginAttempts = 0;
    user.lockedUntil = undefined;
};

//バリデーション
const registerValidation = [
    validationRules.email,
    validationRules.password,
    validationRules.name
];

const loginValidation = [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
];

const todoValidation = [
    validationRules.text,
    validationRules.priority
];

const todoUpdateValidation = [
    validationRules.id,
    body('text').optional().isLength({min:1,max:1000}),
    body('completed').optional().isBoolean(),
    validationRules.priority
];

const queryValidation = [
    validationRules.page,
    validationRules.limit,
    validationRules.search
];


//認証エンドポイント
app.post('/api/auth/register',
    ...securityPresets.auth,
    registerValidation,
    handleValidationErrors,
    async(req:SanitizedRequest,res:Response)=>{

    }
)