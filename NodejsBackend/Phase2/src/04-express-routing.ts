import express, { Request, Response, Router } from 'express';

//TypeScript型定義
interface Todo {
    id: number;
    text: string;
    completed: boolean;
    createdAt?: string;
    updatedAt?: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    createdAt?: string;
}

interface TodosResponse {
    todos: Todo[];
    count: number;
    completed: number;
}

interface TodoResponse {
    todo: Todo;
}

interface CreateTodoRequest {
    text: string;
    completed: boolean;
}
interface CreateTodoResponse {
    message: string;
    todo: Todo;
}

interface UpdateTodoResponse {
    message: string;
    todo: Todo;
}

interface DeleteTodoResponse {
    message: string;
    todo: Todo;
}

interface UsersResponse {
    users: User[];
    count: number;
}

interface UserResponse {
    user: User;
}

interface CreateUserRequest {
    name: string;
    email: string;
}

interface CreateUserResponse {
    message: string;
    user: User;
}

interface ErrorResponse {
    error: string;
}

interface ApiInfo {
    message: string;
    endpoints: {
        todos: string;
        users: string;
    };
    version: string;
}

interface NotFoundResponse {
    error: string;
    requestedUrl: string;
    method: string;
}

//express関数を使用してExpressアプリケーションを作成
//Expressアプリケーション→ミドルウェアやルートを設定する中心となるオブジェクト
const app = express();

//express.jsonミドルウェアを使用
app.use(express.json());

//ルーター分離
//ルート責任を分離
const todoRouter: Router = express.Router();
const userRouter: Router = express.Router();

//TODOデータ(メモリ内)
let todos: Todo[] = [
    { id: 1, text: 'Learn Express', completed: false },
    { id: 2, text: 'Undestand Routing', completed: false }
];

let nextTodoId = 3;

//ユーザーデータ
let users: User[] = [
    { id: 1, name: 'Taro Yamada', email: 'tanaka@email.com' },
    { id: 2, name: 'Hanako Sato', email: 'hanako@email.com' }
];

let nextUserId = 3;

//全TODO表示
//Todoルーター
todoRouter.get('/', (req: Request, res: Response<TodosResponse>) => {
    res.json({
        todos,
        count: todos.length,
        completed: todos.filter(t => t.completed).length
    });
});

//特定TODO表示
//Request<{id:string}>idがURLパラメータに含まれているかを確認
todoRouter.get('/:id', (req: Request<{ id: string }>, res: Response<TodoResponse | ErrorResponse>) => {
    const id = parseInt(req.params.id);
    const todo = todos.find(t => t.id === id);
    if (!todo) {
        res.status(404).json({ error: 'TODOが見つかりません' });
        return;
    }

    res.json({ todo });
});

//TODO追加
todoRouter.post('/', (req: Request<{}, any, CreateTodoRequest>, res: Response<CreateTodoResponse | ErrorResponse>) => {
    //分割代入,text,completedにbodyオブジェクトからそれぞれ代入している
    const { text, completed = false } = req.body;
    if (!text || typeof text !== 'string') {
        res.status(400).json({
            error: 'need text field'
        });
        return;
    }

    const newTodo: Todo = {
        id: nextTodoId++,
        text: text.trim(),
        completed,
        createdAt: new Date().toISOString()
    };
    todos.push(newTodo);

    res.status(201).json({
        message: 'TODO created',
        todo: newTodo
    });
});

//todo編集
todoRouter.put('/:id', (req: Request<{ id: string }, any, Partial<Todo>>, res: Response<UpdateTodoResponse | ErrorResponse>) => {
    const id = parseInt(req.params.id);
    const todoIndex = todos.findIndex(t => t.id === id);

    if (todoIndex === -1) {
        res.status(404).json({ error: 'Todo not found' });
        return;
    }
    const updatedTodo: Todo = {
        ...todos[todoIndex],
        ...req.body,
        id,
        updatedAt: new Date().toISOString()
    };

    todos[todoIndex] = updatedTodo;

    res.json({
        message: 'TODO updated',
        todo: updatedTodo
    });
});

//TODO削除
todoRouter.delete('/:id',(req:Request<{id:string}>,res:Response<DeleteTodoResponse|ErrorResponse>)=>{
    const id = parseInt(req.params.id);
    const todoIndex = todos.findIndex(t=>t.id === id);

    if(todoIndex === -1){
        res.status(404).json({error:'Todo not found'});
        return;
    }

    const deletedTodo = todos.splice(todoIndex,1)[0];
    
    res.json({
        message:'TODO deleted',
        todo:deletedTodo
    });
});

//ユーザールーター
userRouter.get('/', (req: Request, res: Response<UsersResponse>) => {
    res.json({ users, count: users.length });
});

userRouter.get('/:id', (req: Request<{ id: string }>, res: Response<UserResponse | ErrorResponse>) => {
    const id = parseInt(req.params.id);
    const user = users.find(u => u.id === id);

    if (!user) {
        res.status(404).json({ error: 'ID not found' });
        return;
    }

    res.json({ user });
});

userRouter.post('/', (req: Request<{}, any, CreateUserRequest>, res: Response<CreateUserResponse | ErrorResponse>) => {
    const { name, email } = req.body;
    if (!name || !email) {
        res.status(400).json({ error: 'need name & email field' });
        return;
    }

    const newUser: User = {
        id: nextUserId++,
        name,
        email,
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    res.status(201).json({
        message: 'ユーザーが作成されました',
        user: newUser
    });

});

//ルーター適用
app.use('/api/todos', todoRouter);
app.use('/api/users', userRouter);

//メインルート
app.get('/', (req: Request, res: Response<ApiInfo>) => {
    res.json({
        message: 'Express.js + TypeScript Routing demo API',
        endpoints: {
            todos: '/api/todos',
            users: '/api/users'
        },
        version: '1.0.0'
    });
});

//404 handler
app.use('*',(req:Request,res:Response<NotFoundResponse>)=>{
    res.status(404).json({
        error:'endpoint not found',
        requestedUrl:req.originalUrl,
        method:req.method
    });
});
app.listen(3000,()=>{
        console.log('Express.js + TypeScript ルーティングサーバー起動: http://localhost:3000');
    console.log('利用可能なエンドポイント:');
    console.log('  GET    /api/todos     - TODO一覧');
    console.log('  POST   /api/todos     - TODO作成');
    console.log('  GET    /api/todos/:id - TODO詳細');
    console.log('  PUT    /api/todos/:id - TODO更新');
    console.log('  DELETE /api/todos/:id - TODO削除');
    console.log('  GET    /api/users     - ユーザー一覧');
    console.log('  POST   /api/users     - ユーザー作成');
});

export{app};