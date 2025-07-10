import { Sequelize,DataType,Model, FindOptions, DataTypes } from "sequelize";
import * as path from 'path';
import { BOOLEAN } from "sequelize";

//TS type definition
interface TodoAttributes{
    id:number;
    text:string;
    completed:boolean;
    priority:'low' | 'medium' | 'high';
    dueDate?:string;
    user_id?:number;
    createdAt:Date;
    updatedAt:Date;
}

//Omit<T>:Tから特定プロパティを除いて新しい型を作るTSの機能
interface TodoCreationAttributes extends Omit<TodoAttributes,'id'|'createdAt'|'updatedAt'>{
    id?:number;
    createdAt?:Date;
    updatedAt?:Date;
}

interface UserAttributes{
    id:number;
    name:string;
    email:string;
    createdAt:Date;
    updatedAt:Date;
}

interface UserCreationAttributes extends Omit<UserAttributes,'id'|'createdAt'|'updatedAt'>{
    id?:number;
    createdAt?:Date;
    updatedAt?:Date;
}

//Sequelizeインスタンス作成
const sequelize : Sequelize = new Sequelize({
    dialect:'sqlite',
    storage:path.join(__dirname,'sequelize_todo.db'),
    logging:console.log//SQL文をログ出力
});

//モデル定義
class Todo extends Model<TodoAttributes,TodoCreationAttributes> implements TodoAttributes{
    //!:non null assertion operator
    public id!:number;
    public text!:string;
    public completed!: boolean;
    public priority!: "low" | "medium" | "high";
    //?:optional property
    public dueDate?: string;
    public user_id?: number;
    //readonly => const
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    //アソシエーション
    public readonly user?:User;
}

class User extends Model<UserAttributes,UserCreationAttributes>implements UserAttributes{
    public id!: number;
    public name!: string;
    public email!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    //アソシエーション
    public readonly todos?:Todo[];
}

Todo.init({
    id:{
        type:DataTypes.INTEGER,
        primaryKey:true,
        autoIncrement:true
    },
    text:{
        type:DataTypes.STRING,
        allowNull:false,
        validate:{
            notEmpty:{
                msg:'TODO内容は必須です'
            },
            len:{
                args:[1,500],
                msg:'TODOは1文字以上500文字以内で入力してください'
            }
        }
    },
    completed:{
        type:DataTypes.BOOLEAN,
        defaultValue:false
    },
    priority:{
        type:DataTypes.ENUM('low','medium','high'),
        defaultValue:'medium'
    },
    dueDate:{
        type:DataTypes.DATE,
        allowNull:true
    },
    user_id:{
        type:DataTypes.INTEGER,
        allowNull:true
    },
    createdAt:{
        type:DataTypes.DATE,
        allowNull:false
    },
    updatedAt:{
        type:DataTypes.DATE,
        allowNull:false
    }
},{
    sequelize,
    tableName:'todos',
    timestamps:true,
    underscored:true
});

User.init({
    id:{
        type:DataTypes.INTEGER,
        primaryKey:true,
        autoIncrement:true
    },
    name:{
        type:DataTypes.STRING,
        allowNull:false,
        validate:{
            notEmpty:{
                msg:'ユーザー名は必須です'
            }
        }
    },
    email:{
        type:DataTypes.STRING,
        allowNull:false,
        unique:true,
        validate:{
            isEmail:{
                msg:'有効なメールアドレスを入力してください'
            }
        }
    },
    createdAt:{
        type:DataTypes.DATE,
        allowNull:false
    },
    updatedAt:{
        type:DataTypes.DATE,
        allowNull:false
    }
},
{
    sequelize,
    tableName:'users',
    timestamps:true,
    underscored:true
});

//アソシエーション(関連付け)
User.hasMany(Todo,{foreignKey:'user_id',as:'todos'});
Todo.belongsTo(User,{foreignKey:'user_id',as:'user'});

//データベース初期化
const initDatabase = async():Promise<void>=>{
    try{
        //データベース接続テスト
        await sequelize.authenticate();
        console.log('データベース接続に成功しました');

        //テーブル作成（既存テーブルは変更しない）
        await sequelize.sync({alter:true});
        console.log('テーブルの同期が完了しました。');

        //サンプルデータ作成
        await createSampleData();
    }catch(error){
        console.error('データベース初期化エラー')
    }
}

const createSampleData = async():Promise<void>=>{
    try{
        //ユーザーが存在しない場合のみ作成
        const userCount:number = await User.count();
        if(userCount === 0){
            const user1:User = await User.create({
                name:'Taro Tanaka',
                email:'ttaro@emaple.com'
            });

            const user2:User = await User.create({
                name:'Hanako Yamada',
                email:'yhanako@emaple.com'
            });

            //サンプルTODOレコード作成
            await Todo.bulkCreate([
                {
                    text:'Learn Sequelize',
                    completed:false,
                    priority:'high',
                    user_id:user1.id,
                    dueDate:new Date().toISOString()
                },
                {
                    text:'Understand Database structure',
                    completed:false,
                    priority:'medium',
                    user_id:user1.id,
                },
                {
                    text:'Learn ORM advantage',
                    completed:false,
                    priority:'low',
                    user_id:user2.id
                }
            ]);
            console.log('サンプルデータを作成しました');
        }

        //データ確認
        //findAll:テーブ条件を指定して複数レコードを取得する SQLのSELECT
        const todos:Todo[] = await Todo.findAll({
            include:[{model:User,as:'user'}],
            order:[['createdAt','DESC']]
        });

        console.log('\nTODO一覧')
        todos.forEach((todo:Todo):void=>{
            const status :string = todo.completed ? '✅':'⌛';
            const priority:string = `[${todo.priority.toUpperCase()}]`;
            const user:string = todo.user ? `(${todo.user.name})`:'';
            console.log(`${status} ${priority} ${todo.text} ${user}`);     
        });
    }catch(error){
        console.error('サンプルデータ作成エラー: ',error);
    }
}

//基本操作のデモ
const demonstrateOperations = async():Promise<void>=>{
    try{
        console.log('\nSequelize操作デモ');

        //1.TODO作成
        const newTodo:Todo = await Todo.create({
            text:'New Task',
            priority:'low',
            user_id:2
        });

        console.log('新しいタスク生成完了');

        //2.条件での検索
        const highPriorityTodos:Todo[]=await Todo.findAll({
            where:{
                priority:'high',
                completed:false
            },
            include:[{model:User,as:'user'}]
        });
        console.log('高優先度の未完了TODO:',highPriorityTodos.length,'件');

        //3.更新
        //[type]タプル型
        const [updatedCount]:[number]=await Todo.update(
            {completed:true},
            {where:{id:newTodo.id}}
        );
        console.log('TODOを完了に更新しました');

        //4.集計
        const stats:Todo[] = await Todo.findAll({
            attributes:[
                'priority',
                [sequelize.fn('COUNT',sequelize.col('id')),'count']
            ],
            group:['priority']
        });

        //テスト
        // const userStats:Todo[]=await Todo.findAll({
        //     attributes:[
        //         'user',
        //         [sequelize.fn('COUNT',sequelize.col('user_id')),'userTask']
        //     ],
        //     group:['user_id']
        // });
        const userStats:any[]=await Todo.findAll({
            //UserモデルをJOIN
            include:[{
                model:User,
                as:'user',
                //そのまま抽出
                attributes:[]
            }
            ],
            attributes:[
                //JOINしたuserモデルのname列を取得し、'userName'という別名をつける
                [sequelize.col('user.name'),'userName'],
                //user_idをカウントし、'taskCount'という別名をつける
                [sequelize.fn('COUNT',sequelize.col('Todo.user_id')),'taskCount']
            ],
            //user_id,user.nameでグループ化する
            group:['Todo.user_id',sequelize.col('user.name')],
            raw:true
        });
        console.log('優先度別統計:',stats.map((s:Todo)=>s.toJSON()));
        console.log('ユーザー別タスク数:',userStats);
    }catch(error){
        console.error('操作デモエラー',error);
    }
};

//実行
const main = async():Promise<void>=>{
    await initDatabase();
    await demonstrateOperations();

    //接続終了
    await sequelize.close();
    console.log('\nデータベース接続を終了しました。');
};

export{sequelize,Todo,User};

if(require.main === module){
    main().catch((error:Error)=>{
        console.error('アプリケーションエラー:',error);
        process.exit(0);
    })
}