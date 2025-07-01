//CRUD操作に対応した実践的なAPI実装

import * as http from 'http';
import * as url from 'url';

//TODO項目の型定義
interface Todo{
    id:number;
    text:string;
    completed:boolean;
    createdAt:string;
    updatedAt:string;
}

//APIレスポンスの型定義
interface ApiResponse<T=any>{
    success:boolean;
    data?:T;
    message?:string;
    error?:string;
}

//リクエストボディの型定義
interface CreateTodoRequest{
    text:string;
}

interface UpdateTodoRequest{
    text?:string;
    completed?:boolean;
}

//TODOデータを格納する配列（メモリ内）
let todos: Todo[] = [
    {
        id:1,
        text:'Learn Node.js',
        completed:false,
        createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString()
    },
    {
        id:2,
        text:'Create API with TypeScript',
        completed:false,
        createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString()
    }
];

let nextId:number = 3;

//URLからIDを抽出するヘルパー関数
function extractId(pathName:string):number | null {
    const parts:string[] = pathName.split('/');
    if(parts.length === 3 && parts[1] === 'todos'){
        const id:number = parseInt(parts[2]);
        return isNaN(id)?null:id;
    }
    return null;
}

//TODOを検索するヘルパー関数
function findTodoById(id:number):Todo | undefined {
    return todos.find(todo=>todo.id === id);
}

//レスポンス送信のヘルパー関数
function sendResponse(res:http.ServerResponse,statusCode:number,data:ApiResponse):void{
    res.writeHead(statusCode,{'Content-Type':'application/json;charset=utf-8'});
    res.end(JSON.stringify(data,null,2));
}

//リクエストボディを取得するヘルパー関数
function getRequestBody(req:http.IncomingMessage):Promise<string>{
    return new Promise((resolve)=>{
        let body:string = '';
        req.on('data',(chunk:Buffer)=>{
            body+=chunk;
        });
        req.on('end',()=>{
            resolve(body);
        });
    });
}

//ルートハンドラーの型定義
type RouteHandler = (req:http.IncomingMessage,res:http.ServerResponse)=>Promise<void>|void;

//静的ルート定義
const routes:Record<string,RouteHandler>={
    //全TODO取得
    'GET /todos':(req:http.IncomingMessage,res:http.ServerResponse):void=>{
        const response: ApiResponse<Todo[]>={
            success:true,
            data:todos,
            message:`${todos.length}件のTODOを取得`
        };
        sendResponse(res,200,response);
    },
    //TODO作成
    'POST /todos':async(req:http.IncomingMessage,res:http.ServerResponse):Promise<void>=>{
        try{
            const body:string=await getRequestBody(req);
            const data:CreateTodoRequest = JSON.parse(body);

            //バリデーション
            if(!data.text || typeof data.text !== 'string' || data.text.trim() === ''){
                const response:ApiResponse = {
                    success : false,
                    error:'textフィールドは必須で、空文字は許可されない'
                };
                sendResponse(res,400,response);
                return;
            }
            const newTodo: Todo={
                id:nextId++,
                text:data.text.trim(),
                completed:false,
                createdAt:new Date().toISOString(),
                updatedAt:new Date().toISOString()
            };

            todos.push(newTodo);

            const response:ApiResponse<Todo>={
                success:true,
                data:newTodo,
                message:'Todoは正常に作成されました'
            };
            sendResponse(res,201,response);
        }catch(error){
            const response : ApiResponse = {
                success:false,
                error:'Invalid JSON data',
            };
            sendResponse(res,400,response);
        }
    }
};

//動的ルート処理
async function handleDynamicRoutes(req: http.IncomingMessage,res:http.ServerResponse):Promise<boolean>{
    const parsedUrl = url.parse(req.url || '',true);
    const pathname:string = parsedUrl.pathname || '';
    const method:string = req.method || '';

    //number or null type
    const id:number | null = extractId(pathname);
    if(id === null)
        return false;
}