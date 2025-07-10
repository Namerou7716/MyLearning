import * as sqlite3 from 'sqlite3';
import * as path from 'path';

interface Todo{
    id:number;
    text: string;
    completed:boolean;
    created_at:string;
    updated_at:string;
}

interface TodoInput{
    text:string;
    completed:number;//sqliteでは0/1で表す
}

const dbPath:string = path.join(__dirname,'todo.db');
//データベース接続
const db:sqlite3.Database = new sqlite3.Database(dbPath,(err)=>{
    if(err){
        console.error('データベース接続エラー:',err.message);
    }else{
        console.log('データベース接続成功');
    }
});

//テーブル作成
const createTodosTable = ():void=>{
    const sql:string = `
    CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        completed BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;
    db.run(sql,(err:Error|null):void=>{
        if(err){
            console.error('テーブル作成エラー:',err.message);
        }else{
            console.log('todosテーブルを作成しました');
            insertSampleData();
        }
    });
};

//サンプルデータ挿入
const insertSampleData = ():void=>{
    const todos : TodoInput[] = [
        {text:'SQLiteを学ぶ',completed:0},
        {text:'データベース設計を理解する',completed:0},
        {text:'ORMを使ってみる',completed:1}
    ];
    const sql:string = `
    INSERT INTO todos (text, completed) VALUES (?, ?)
    `;

    todos.forEach((todo:TodoInput):void=>{
        db.run(sql,[todo.text,todo.completed],function(this:sqlite3.RunResult,err:Error|null):void{
            if(err){
                console.error('データ挿入エラー:',err.message);
            }else{
                console.log('TODOを挿入しました:ID'+`${this.lastID}`);
            }
        });
    });

    setTimeout(queryAllTodos,1000);
};

//データ取得
const queryAllTodos = ():void=>{
    const sql:string = 'SELECT * FROM todos ORDER BY created_at DESC';

    db.all(sql,[],(err:Error | null,rows:Todo[]):void=>{
        if(err){
            console.error('データ取得エラー:',err.message);
        }else{
            console.log('\nTodo list');
            rows.forEach((row:Todo):void=>{
                const status:string = row.completed ? '✅':'⌛';
                console.log(`${status} [${row.id} ${row.text}]`);
            });
        }

        //データベース接続を閉じる
        db.close((err:Error|null):void=>{
            if(err){
                console.error('接続終了エラー:',err.message);
            }else{
                console.log('\nデータベース接続を終了しました');
            }
        })
    })
};

//実行
createTodosTable();