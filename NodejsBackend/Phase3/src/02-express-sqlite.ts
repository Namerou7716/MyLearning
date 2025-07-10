import express,{Request,Response} from 'express';
import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import { error } from 'console';

//データベースのtodosテーブルのレコードを表す型
interface  Todo{
    id:number;
    text:string;
    completed: boolean;
    priority: 'low'|'medium'|'high';//特定の文字列のみを許容するユニオン型
    created_at:string;
    updated_at:string;
}

//Todo作成リクエスト用の型
interface TodoCreateRequest{
    text:string;
    priority?:'low'|'medium'|'high';//？は省略可能なプロパティ
}

//Todo更新用の型
interface TodoUpdateRequest{
    text?:string;
    completed?:boolean;
    priority?:'high'|'medium'|'low';
}

// GET/api.todosのクエリパラメータの型
interface QueryParams{
    completed?:string;
    priority?:string;
    search?:string;
}

//db.runの結果を格納する型
interface RunResult{
    id:number;//INSERT操作で生成されたID
    changes:number;//UPDATE/DELETE操作で影響を受けた行数
}

//expressアプリケーションを宣言
const app = express();
//ミドルウェア使用
//JSONリクエストボディを解析するミドルウェア
app.use(express.json());

//データベース接続
const dbPath:string = path.join(__dirname,'express_todo.db');
const db:sqlite3.Database = new sqlite3.Database(dbPath);

//テーブル初期化
db.serialize(()=>{
    db.run(
        `
        CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            completed INTEGER NOT NULL DEFAULT 0,
            priority TEXT DEFAULT 'medium',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) 
        `
    );
});

//ヘルパー関数

//db.runをPromise化
//ラップしている関数の返り値に合わせたPromiseの型
const runQuery = (sql:string, params:any[]=[]):Promise<RunResult>=>{
    return new Promise((resolve,reject)=>{
        //sql:実行するクエリ
        //params:SQLのプレースホルダー(?)にバインドするパラメータの配列
        //function():実行結果を受け取るコールバック関数
        //db.runはコールバック関数のthisにRunResultを明示的にバインドする。
        //このthisを受け取るためにfunctionでコールバック関数を定義する

        //db.run : SQLiteデータベースに対してSQLをじっこうする
        db.run(sql,params,function(this:sqlite3.RunResult,err:Error | null):void{
            if(err)reject(err);
            else resolve({id:this.lastID,changes:this.changes});
        });
    });
};

//db.allをPromise化
const getAllQuery = <T>(sql:string,params:any[]=[]):Promise<T[]>=>{
    return new Promise((resolve,reject)=>{
        //db.all : 複数の結果行を配列として取得する
        db.all(sql,params,(err:Error|null,rows:T[]):void=>{
            if(err)reject(err);
            else resolve(rows);
        });
    });
};

//db.getをPromise化
//結果が見つからない可能性もあるためundefinedも許容している
const getQuery = <T>(sql:string,params:any[] = []):Promise<T | undefined>=>{
    return new Promise((resolve,reject)=>{
        //db.get : 単一の結果行を取得する。
        db.get(sql,params,(err:Error | null,row:T):void=>{
            if(err)reject(err);
            else resolve(row);
        });
    });
}

//APIエンドポイント

//全TODO取得
//Requestオブジェクトが持つジェネリック型パラメータを利用して、リクエストがどのような構造のデータを持つかを明示的に定義する
//Requestは4つのジェネリック型型パラメータを受け取る
//Request<P, ResBody,ReqBody,ReqQuery>
//P:パスパラメータ /api/todos/:idの場合{id:string}のようになる
//ResBody: リクエストハンドラが返すレスポンスボディの型。通常リクエストハンドラ内ではあまり使われず、res.json()などで返すデータの型は別途定義されることが多い。
//ReqBody:POST,PUTリクエストで送信されるデータ
//ReqQuery:クエリパラメータの型(/api/todos/:id?completed=trueのcompleted=trueの部分)

//今回はRequest<{},{},{},QueryParams>のため
//パスを指定せず、レスポンスの型を指定せず、リクエスを受け取らない。
//クエリパラメータのみ事前に定義されたQueryParams形に従うことを表している
app.get('/api/todos',async(req:Request<{},{},{},QueryParams>,res:Response):Promise<void>=>{
    try{
        const{completed,priority,search}= req.query;

        let sql:string = 'SELECT * FROM todos WHERE 1=1 ';
        const params:any[] = [];

        if(completed !== undefined){
            sql+='AND completed = ?';
            params.push(completed === 'true'?1:0);
        }

        if(priority){
            sql+='AND priority = ? ';
            params.push(priority);
        }

        if(search){
            sql += 'AND text LIKE ? ';
            params.push(`%${search}%`);
        }

        sql += 'ORDER BY created_at DESC ';

        const todos:Todo[]=await getAllQuery<Todo>(sql,params);

        res.json({
            todos:todos.map((todo:Todo)=>({
                ...todo,
                completed:Boolean(todo.completed)
            }))
        })
    }catch(error){
        console.error('TODO取得エラー:',error);
        res.status(500).json({error:'データベースエラー'});
    }
});

//統計情報取得
app.get('/api/todos/stats',async(req:Request,res:Response):Promise<void>=>{
    try{
        const totalTodos:{count:number}|undefined = await getQuery<{count:number}>('SELECT COUNT(*) as count FROM todos');
        const completedTodos:{count:number}|undefined = await getQuery<{count:number}>('SELECT COUNT(*) as count FROM todos WHERE completed=1');
        const priorityStats:{priority:string,count:number}[] = await getAllQuery<{priority:string,count:number}>(
            `SELECT priority, COUNT(*) as count
            FROM todos
            GROUP BY priority`
        );

        res.json(
            {
                total:totalTodos?.count||0,
                completed:completedTodos?.count||0,
                pending:(totalTodos?.count||0)-(completedTodos?.count||0),
                byPriority:priorityStats
            }
        );
    }catch(error){
        console.error('統計取得エラー',error);
        res.status(500).json({error:'データベースエラー'});
    }
});
//特定TODO取得
app.get('/api/todos/:id',async(req:Request<{id:string}>,res:Response):Promise<void>=>{
    try{
        const id:number = parseInt(req.params.id);
        if(isNaN(id)){
            res.status(400).json({error:'Invalid ID'});
            return;
        }

        const todo:Todo|undefined = await getQuery<Todo>('SELECT * FROM todos WHERE id = ?',[id]);

        if(!todo){
            res.status(404).json({error:'TODOが見つかりません'});
            return;
        }

        res.json({
            todo:{
                ...todo,
                completed:Boolean(todo.completed)
            }
        });
    }catch(error){
        console.error('TODO取得エラー',error);
        res.status(500).json({error:'データベースエラー'});
    }
})

//TODO作成
app.post('/api/todos',async(req:Request<{},{},TodoCreateRequest>,res:Response):Promise<void>=>{
    try{
        const{text,priority='medium'}=req.body;

        //入力値のバリデーション
        if(!text || typeof text !== 'string'){
            res.status(400).json({error:'textフィールドは必須です'});
            return;
        }

        const result:RunResult = await runQuery(
            'INSERT INTO todos (text,priority) VALUES (?,?)',
            [text.trim(),priority]
        );
        //作成したTODOを改めて取得して返す
        const newTodo:Todo | undefined = await getQuery<Todo>('SELECT * FROM todos WHERE id=?',[result.id]);

        res.status(201).json({
            message:'TODOが作成されました',
            todo:newTodo?{
                ...newTodo,
                completed:Boolean(newTodo.completed)
            }:null
        });
    }catch(error){
        console.error('TODO作成エラー',error);
        res.status(500).json(
            {error:'データベースエラー'}
        );
    }
});

//TODO更新
app.put('/api/todos/:id',async(req:Request<{id:string},{},TodoUpdateRequest>,res:Response):Promise<void>=>{
    try{
        //パスパラメータのIDを取得
        const id:number = parseInt(req.params.id);
        if(isNaN(id)){
            res.status(400).json({error:'Invalid ID'});
            return;
        }
        //既存TODOがあるかの確認
        const existingTodo:Todo|undefined = await getQuery<Todo>('SELECT * FROM todos WHERE id = ?',[id]);
        if(!existingTodo){
            res.status(404).json({error:'ID task not found'});
            return;
        }
        const{text,completed,priority} = req.body;

        //更新フィールドを動的に構築
        const updates:string[] = [];
        const params:any[] = [];

        if(text !== undefined){
            updates.push('text = ?');
            params.push(text);
        }

        if(completed !== undefined){
            updates.push('completed = ?');
            params.push(completed? 1 : 0);
        }

        if(priority !== undefined){
            const validPriorities:string[] = ['low','medium','high'];
            if(!validPriorities.includes(priority)){
                res.status(400).json({
                    error:'priorityはhigh,medium,lowのいずれかで指定すること'
                });
                return;
            }
            updates.push('priority = ?');
            params.push(priority);
        }

        if(updates.length === 0){
            res.status(400).json({
                error:'更新するフィールドが入力されていません'
            });
            return;
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);

        await runQuery(
            `UPDATE todos SET ${updates.join(',')} WHERE id = ?`,
            params
        );
        const updateTodo:Todo = await getQuery<Todo>('SELECT * FROM todos WHERE id = ?',[id]);

        res.json({
            mesage:'TODO updated',
            todo:updateTodo?{
                ...updateTodo,
                completed:Boolean(updateTodo.completed)
            }:null
        });
    }catch(error){
        console.error('TODO更新エラー:',error);
        res.status(500).json({error:'データベースエラー'});
    }
});

app.delete('/api/todos/:id',async(req:Request<{id:string}>,res:Response):Promise<void>=>{
    try{
        //パスパラメータからIDを抽出、有効なIDかを確認
        const id:number = parseInt(req.params.id);
        if(isNaN(id)){
            res.status(400).json({
                error:'Invalid ID'
            });
            return;
        }

        //削除前にTODOが存在するか確認
        const existingTodo:Todo = await getQuery<Todo>('SELECT * FROM todos WHERE id = ?',[id]);
        if(!existingTodo){
            res.status(404).json({
                error:'Todo not found'
            });
            return;
        }

        await runQuery('DELETE FROM todos WHERE id = ?',[id]);

        res.json({
            message:'TODOが削除されました',
            todo:{
                ...existingTodo,
                completed:Boolean(existingTodo.completed)
            }
        });
    }catch(error){
        console.error('TODO削除エラー:',error);
        res.status(500).json({error:'データベースエラー'});
    }
});


//サーバー起動
const PORT = 3000;
app.listen(PORT,()=>{
        console.log(`SQLite TODO APIサーバー起動: http://localhost:${PORT}`);
    console.log('利用可能なエンドポイント:');
    console.log('  GET    /api/todos       - TODO一覧');
    console.log('  GET    /api/todos/:id   - TODO詳細');
    console.log('  POST   /api/todos       - TODO作成');
    console.log('  PUT    /api/todos/:id   - TODO更新');
    console.log('  DELETE /api/todos/:id   - TODO削除');
    console.log('  GET    /api/todos/stats - 統計情報');
});

//アプリケーション終了のクリーンアップ
//'SIGINT'はCtrl+Cでアプリケーションが終了するときに実行される処理
process.on('SIGINT',():void=>{
    console.log('\nアプリケーション終了');
    db.close((err:Error|null):void=>{
        if(err){
            console.error('データベース接続終了エラー:',err.message);
        }else{
            console.log('データベース接続終了');
        }
        process.exit(0);
    })
})