import express,{Request,Response,NextFunction} from 'express';

//type definition
interface CustomRequest extends Request{
    id?:string;
    startTime?:number;
}

interface AdminApiResponse{
    message:string;
    admin:boolean;
}

interface PublicApiResponse{
    message:string;
}

interface EchoApiResponse{
    message:string;
    received:any;
    timestamp:string;
}

const app = express();

//ミドルウェア定義

//ログ出力ミドルウェア
const requestLogger = (req:Request,res:Response,next:NextFunction):void=>{
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
};

//認証チェックミドルウェア（デモ）
const authCheck = (req:Request,res:Response,next:NextFunction):void=>{
    const token = req.headers.authorization;

    if(req.url.startsWith('/api/admin')){
        if(!token || token !=='Bearer secret123'){
            res.status(401).json({error:'Authorization required'});
            return;
        }
    }
    next();
};

//レスポンス時間計測ミドルウェア
const responseTime = (req:CustomRequest,res:Response,next:NextFunction):void=>{
    const start = Date.now();

    res.on('finish',()=>{
        const duration = Date.now() - start;
        console.log(` progress time : ${duration}ms`);
    });
    next();
};

//ミドルウェア適用
//全リクエストに適用
app.use(requestLogger);
app.use(responseTime);
app.use(authCheck);

//JSONパース用ミドルウェア(Express標準)
app.use(express.json());

//ルート定義
app.get('/',(req:Request,res:Response)=>{
    res.json({
        message:'ミドルウェアテストサーバー'
    });
});
app.get('/api/public',(req:Request,res:Response<PublicApiResponse>)=>{
    res.json({
        message:'誰でもアクセス可能'
    });
});
app.get('/api/admin',(req:Request,res:Response<AdminApiResponse>)=>{
    res.json({
        message:'管理者のみアクセス可能',
        admin:true
    });
});
app.get('/api/echo',(req:Request,res:Response<EchoApiResponse>)=>{
    res.json({
        message:'POSTデータのエコー',
        received:req.body,
        timestamp:new Date().toISOString()
    });
});

app.listen(3000,()=>{
        console.log('ミドルウェアデモサーバー起動: http://localhost:3000');
    console.log('テスト例:');
    console.log('  curl http://localhost:3000/api/public');
    console.log('  curl http://localhost:3000/api/admin');
    console.log('  curl -H "Authorization: Bearer secret123" http://localhost:3000/api/admin');
})

export{app};