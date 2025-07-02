//CRUD操作に対応した実践的なAPI実装

import * as http from 'http';
import { stripTypeScriptTypes } from 'module';
import { parse } from 'path';
import * as url from 'url';

//TODO項目の型定義
interface Todo {
    id: number;
    text: string;
    completed: boolean;
    createdAt: string;
    updatedAt: string;
    priority:'high'|'medium'|'low';
    category?:string | undefined;
}

//APIレスポンスの型定義
interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

//リクエストボディの型定義
interface CreateTodoRequest {
    text: string;
    priority:'high'|'medium'|'low';
    category?:string|undefined;
}

interface UpdateTodoRequest {
    text?: string;
    completed?: boolean;
}

interface TodoQuery{
    search?:string;
    category?:string;
    priority?:string;
    completed?:boolean;
    sortBy?:'createdAt'|'priority';
    order?:'asc'|'desc'
}

//TODOデータを格納する配列（メモリ内）
let todos: Todo[] = [
    {
        id: 1,
        text: 'Learn Node.js',
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        priority:'high',
        category:'default'
    },
    {
        id: 2,
        text: 'Create API with TypeScript',
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        priority:'low',
        category:'Learn'
    }
];

let nextId: number = 3;

//URLからIDを抽出するヘルパー関数
function extractId(pathName: string): number | null {
    const parts: string[] = pathName.split('/');
    if (parts.length === 3 && parts[1] === 'todos') {
        const id: number = parseInt(parts[2]);
        return isNaN(id) ? null : id;
    }
    return null;
}

//TODOを検索するヘルパー関数
function findTodoById(id: number): Todo | undefined {
    return todos.find(todo => todo.id === id);
}

//レスポンス送信のヘルパー関数
function sendResponse(res: http.ServerResponse, statusCode: number, data: ApiResponse): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json;charset=utf-8' });
    res.end(JSON.stringify(data, null, 2));
}

//リクエストボディを取得するヘルパー関数
function getRequestBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve) => {
        let body: string = '';
        req.on('data', (chunk: Buffer) => {
            body += chunk;
        });
        req.on('end', () => {
            resolve(body);
        });
    });
}

//ルートハンドラーの型定義
type RouteHandler = (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void> | void;

//静的ルート定義
const routes: Record<string, RouteHandler> = {
    //全TODO取得
    'GET /todos': (req: http.IncomingMessage, res: http.ServerResponse): void => {
        const parsedUrl = url.parse(req.url || '',true);
        console.log(parsedUrl.query);
        //検索機能
        let result:Todo[] = todos;
        const search = parsedUrl.query.search as string;
        if(search)
        {
            result = todos.filter(t=>t.text.includes(search));
        }
        const category = parsedUrl.query.category as string;
        if(category){
            result = result.filter(t=>t.category === category);
        }
        const priority = parsedUrl.query.priority as string;
        if(priority){
            result = result.filter(t=>t.priority === priority);
        }
        const completed = parsedUrl.query.completed as string;
        if(completed){
            result = result.filter(t=>t.completed === (completed === 'true'));
        }
        const sortBy = parsedUrl.query.sortBy as string;
        const order = parsedUrl.query.order as string;
        if(sortBy){
            switch(sortBy){
                case 'priority':
                    const priorityOrder = {high:3,medium:2,low:1};
                    result.sort((a,b)=>{
                        if(order === 'desc'){
                            return priorityOrder[b.priority]-priorityOrder[a.priority];
                        }else{
                            return priorityOrder[a.priority] - priorityOrder[b.priority];
                        }
                    })
                    break;
                case 'createdAt':
                    result.sort((a,b)=>{
                        if(order === 'desc'){
                            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                        }else{
                            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                        }
                    })
                    break;
                default:
                    break;
            }
        }
        const response: ApiResponse<Todo[]> = {
            success: true,
            data: result,
            message: `${result.length}件のTODOを取得`
        };
        sendResponse(res, 200, response);
    },
    //TODO作成
    'POST /todos': async (req: http.IncomingMessage, res: http.ServerResponse): Promise<void> => {
        try {
            const body: string = await getRequestBody(req);
            const data: CreateTodoRequest = JSON.parse(body);

            //バリデーション
            if (!data.text || typeof data.text !== 'string' || data.text.trim() === '') {
                const response: ApiResponse = {
                    success: false,
                    error: 'textフィールドは必須で、空文字は許可されない'
                };
                sendResponse(res, 400, response);
                return;
            }
            if(!data.priority || typeof data.priority !== 'string' || data.priority.trim() === ''){
                const response: ApiResponse = {
                    success:false,
                    error:'priorityフィールドは必須です。空文字も禁止です'
                };
                sendResponse(res,400,response);
                return;
            }
            const newTodo: Todo = {
                id: nextId++,
                text: data.text.trim(),
                completed: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                priority:data.priority,
                category:data.category
            };

            todos.push(newTodo);

            const response: ApiResponse<Todo> = {
                success: true,
                data: newTodo,
                message: 'Todoは正常に作成されました'
            };
            sendResponse(res, 201, response);
        } catch (error) {
            const response: ApiResponse = {
                success: false,
                error: 'Invalid JSON data',
            };
            sendResponse(res, 400, response);
        }
    }
};

//動的ルート処理
async function handleDynamicRoutes(req: http.IncomingMessage, res: http.ServerResponse): Promise<boolean> {
    const parsedUrl = url.parse(req.url || '', true);
    const pathname: string = parsedUrl.pathname || '';
    const method: string = req.method || '';

    //number or null type
    const id: number | null = extractId(pathname);
    if (id === null)
        return false;

    try {
        switch (method) {
            case 'GET':
                //特定TODO取得
                const todo: Todo | undefined = findTodoById(id);
                if (!todo) {
                    const response: ApiResponse = {
                        success: false,
                        error: `ID: ${id}が見つかりません。`
                    };
                    sendResponse(res, 404, response);
                    return true;
                }

                const getResponse: ApiResponse<Todo> = {
                    success: true,
                    data: todo,
                    message: 'TODOを取得しました'
                };
                sendResponse(res, 200, getResponse);
                return true;
            case 'PUT':
                //TODO更新
                const targetTodo: Todo | undefined = findTodoById(id);
                if (!targetTodo) {
                    const response: ApiResponse = {
                        success: false,
                        error: `ID:${id}が見つかりません`
                    };
                    sendResponse(res, 404, response);
                    return true;
                }

                const body: string = await getRequestBody(req);
                const updateData: UpdateTodoRequest = JSON.parse(body);

                //更新処理
                if (updateData.text !== undefined) {
                    if (typeof updateData.text !== 'string' || updateData.text.trim() === '') {
                        const response: ApiResponse = {
                            success: false,
                            error: 'text フィールドは空文字は許可されません。'
                        };
                        sendResponse(res, 400, response);
                        return true;
                    }
                }
                if (updateData.completed !== undefined) {
                    if (typeof updateData.completed !== 'boolean') {
                        const response: ApiResponse = {
                            success: false,
                            error: 'cpompletedフィールドはboolean型である必要があります'
                        };
                        sendResponse(res, 400, response);
                        return true;
                    }
                    targetTodo.completed = updateData.completed;
                }
                targetTodo.updatedAt = new Date().toISOString();
                const putResponse: ApiResponse<Todo> = {
                    success: true,
                    data: targetTodo,
                    message: 'TODOが正常に更新されました'
                };
                sendResponse(res, 200, putResponse);
                return true;

                case 'DELETE':
                    //TODO削除
                    const todoIndex: number = todos.findIndex(t=>t.id===id);
                    if(todoIndex === -1)
                    {
                        const response:ApiResponse={
                            success:false,
                            error:`ID: ${id} is not found`
                        };
                        sendResponse(res,404,response);
                        return true;
                    }

                    const deletedTodo:Todo = todos.splice(todoIndex,1)[0];
                    const deleteResponse: ApiResponse<Todo> = {
                        success:true,
                        data:deletedTodo,
                        message:'TODOが正常に削除されました'
                    };
                    sendResponse(res,200,deleteResponse);
                    return true;

                default:
                    return false;
        }
    } catch (error) {
        const response: ApiResponse = {
            success:false,
            error:'Invalid JSON data'
        };
        sendResponse(res,400,response);
        return true;
    }
}

const server: http.Server = http.createServer(async(req:http.IncomingMessage,res:http.ServerResponse):Promise<void>=>{
    //CORS設定
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-AAllow-Headers','Content-Type,Authorization');

    //OPTIONリクエスト（プリフライトリクエスト）への対応
    if(req.method === 'OPTIONS'){
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl= url.parse(req.url||'',true);
    const routeKey :string = `${req.method} ${parsedUrl.pathname}`;
    const handler: RouteHandler | undefined = routes[routeKey];

    try{
        if(handler){
            await handler(req,res);
        }else{
            const handled:boolean = await handleDynamicRoutes(req,res);

            if(!handled){
                //404 error
                const response:ApiResponse={
                    success:false,
                    error:'page not found 404',
                    message:'利用可能なエンドポイント: GET|POST /todos, GET|PUT|DELETE /todos/:id'
                };
                sendResponse(res,404,response);
            }
        }
    }catch(error){
        //server error
        console.error('server error:',error);
        const response:ApiResponse = {
            success:false,
            error:'server error occured'
        };
        sendResponse(res,500,response);
    }
});

const PORT:number = 3000;

server.listen(PORT,():void=>{
    console.log(`TODO API server start : http://localhost:${PORT}`);
    console.log('available end point');
    console.log(' -GET/todos (get all todo)');
    console.log(' -POST/todos (create todo)');
    console.log(' -GET/todos/:id (get particular todo)');
    console.log(' -PUT/todos/:id (update todo)');
    console.log(' -DELETE/todos/id (delete todo)');
});

process.on('SIGINT',():void=>{
    console.log(`\nserver stop ....`);
    server.close(():void=>{
        console.log('server stopped');
        process.exit(0);
    });
});