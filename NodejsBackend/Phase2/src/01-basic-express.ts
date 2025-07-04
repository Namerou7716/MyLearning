import express,{Request,Response} from 'express';

//TypeScript型定義
interface HealthResponse{
    status:string;
    uptime:number;
    memory:NodeJS.MemoryUsage;
}

interface ApiResponse{
    message:string;
    version:string;
    timestamp:string;
}

//Expressアプリケーションを作成
const app = express();
const PORT = 3000;

//基本的なルート
app.get('/',(req:Request,res:Response<ApiResponse>)=>{
    res.json({
        message:'Express.js TODO API (TS)',
        version:'1.0.0',
        timestamp:new Date().toISOString()
    });
});

app.get('/health',(req:Request,res:Response<HealthResponse>)=>{
    res.json({
        status:'OK',
        uptime:process.uptime(),
        memory:process.memoryUsage()
    });
});

//server launch
app.listen(PORT,()=>{
    console.log('Server launched');
    console.log(`URL : http://localhost:${PORT}`);
    console.log(`Health URL : http://localhost:${PORT}/health`);
})