import express, { Request, Response } from 'express'
import { Sequelize, DataTypes, Model, Op } from 'sequelize'
import * as path from 'path'
import { BOOLEAN } from 'sequelize';
import { deflateSync } from 'zlib';
import { create } from 'lodash';
import { error } from 'console';

//TypeScript型定義
interface TodoAttributes {
    id: number;
    text: string;
    completed: boolean;
    priority: 'low' | 'medium' | 'high';
    dueDate?: string;
    user_id?: number;
    createdAt: Date;
    updatedAt: Date;
}

interface TodoCreationAttributes extends Omit<TodoAttributes, 'id' | 'createdAt' | 'updatedAt'> {
    id?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface UserAttributes {
    id: number;
    name: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
}

interface UserCreationAttributes extends Omit<UserAttributes, 'id' | 'createdAt' | 'updatedAt'> {
    id?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface TodoQueryParms {
    completed?: string;
    priority?: string;
    user_id?: string;
    search?: string;
    sort?: string;
    order?: string;
    page?: string;
    limit?: string;
}

interface TodoCreateRequest {
    text: string;
    priority?: 'low' | 'medium' | 'high';
    user_id?: number;
    dueDate?: string;
}

interface TodoUpdateRequest {
    text: string;
    completed?: boolean;
    priority?: 'low' | 'medium' | 'high';
    user_id?: number;
    dueDate?: string;
}

interface UserCreateRequest {
    name: string;
    email: string;
}

//expressアプリケーションの宣言とミドルウェアの設定
const app = express();
app.use(express.json());

//sequelize設定
const sequelize: Sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'express_sequelize.db'),
    logging: false
});

//モデル定義
class Todo extends Model<TodoAttributes, TodoCreationAttributes> implements TodoAttributes {
    public id!: number;
    public text!: string;
    public completed!: boolean;
    public priority!: 'low' | 'medium' | 'high';
    public dueDate?: string;
    public user_id?: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    public readonly user?: User;
};

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    public id!: number;
    public name!: string;
    public email!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    public readonly todos?: Todo[];
}

Todo.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    text: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'text space is necessary'
            },
            len: {
                args: [1, 500],
                msg: 'text len is 1<=n<500'
            }
        }
    },
    completed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high'),
        defaultValue: 'medium'
    },
    dueDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    sequelize,
    tableName: 'todos',
    underscored: true
});

User.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'nameフィールドは必須です'
            }
        }
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: {
                msg: 'emailフィールドは必須です'
            }
        }
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    sequelize,
    tableName: 'users',
    underscored: false
})

//アソシエーション
User.hasMany(Todo, { foreignKey: 'user_id', as: 'todos' });
Todo.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

//データベース初期化
const initDB = async (): Promise<void> => {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ alter: true });
        console.log('database init completed');
    } catch (error) {
        console.error('database init failed:', error);
        process.exit(1);
    }
}

//ユーザーAPI
app.get('/api/users', async (req: Request, res: Response): Promise<void> => {
    try {
        const users: User[] = await User.findAll({
            include: [{
                model: Todo,
                as: 'todos',
                attributes: ['id', 'text']
            }]
        });
        res.json({ users });
    } catch (error) {
        console.error('User get error : ', error);
        res.status(500).json({ error: 'database error' });
    }
});

app.post('/api/users', async (req: Request<{}, {}, UserCreateRequest>, res: Response): Promise<void> => {
    try {
        const { name, email } = req.body;
        const user: User = await User.create({ name, email });

        res.status(201).json({
            message: 'User created',
            user
        });
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
            res.status(400).json({
                error: 'バリデーションエラー',
                details: error.errors.map((e: any) => e.message)
            });
        } else if (error.name === 'SequelizeUniqueConstraintError') {
            res.status(400).json({
                error: 'this email address is used by another user'
            });
        } else {
            console.error('ユーザー作成エラー', error);
            res.status(500).json({ error: 'データベースエラー' });
        }
    }
});

//TODO API
app.get('/api/todos', async (req: Request<{}, {}, {}, TodoQueryParms>, res: Response) => {
    try {
        const {
            completed,
            priority,
            user_id,
            search,
            sort = 'createdAt',
            order = 'DESC',
            page = '1',
            limit = '10'
        } = req.query;

        //検索条件構築
        const where: Record<string, any> = {};
        if (completed !== undefined) {
            where.completed = completed === 'true';
        }
        if (priority) {
            where.priority = priority;
        }
        if (user_id) {
            where.user_id = parseInt(user_id);
        }
        if (search) {
            where.text = { [Op.like]: `%${search}%` }
        }
        //ページネーション
        const offset: number = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows: todos }: { count: number, rows: Todo[] } = await Todo.findAndCountAll({
            where,
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'email']
            }],
            order: [[sort, order.toUpperCase() as 'ASC' | 'DESC']],
            limit: parseInt(limit),
            offset
        });

        res.json({
            todos,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                totalPages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Todo取得エラー:', error);
        res.status(500).json({ error: 'データベースエラー' });
    }
})

app.get('/api/todos/:id', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
        const id: number = parseInt(req.params.id);
        const todo: Todo | null = await Todo.findByPk(id, {
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'email']
            }]
        });
        if (!todo) {
            res.status(404).json({ error: 'TODO not found' });
            return;
        }
        res.json({ todo });
    } catch (error) {
        console.error('TODO取得エラー:', error);
        res.status(500).json({ error: 'データベースエラー' });
    }
});

app.post('/api/todos', async (req: Request<{}, {}, TodoCreateRequest>, res: Response): Promise<void> => {
    try {

        const { text, priority, user_id, dueDate } = req.body

        //ユーザー存在確認
        if (user_id) {
            const user: User | null = await User.findByPk(user_id);
            if (!user) {
                res.status(400).json({ error: '指定されたユーザーが存在しません' });
                return;
            }
        }

        //Todo新規作成
        const todo: Todo = await Todo.create({
            text,
            priority,
            user_id,
            dueDate
        });

        //作成したTODOを関連データと一緒に取得
        const createdTodo: Todo | null = await Todo.findByPk(todo.id, {
            include: [{ model: User, as: 'user' }]
        });

        res.status(201).json({
            messge: 'TODOが作成されました',
            todo: createdTodo
        })
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
            res.status(400).json({
                error: 'バリデーションエラー',
                details: error.errors.map((e: any) => e.message)
            });
        } else {
            console.error('TODO作成エラー', error);
            res.status(500).json({
                error: 'データベースエラー'
            });
        }
    }
});

app.put('/api/todos/:id', async (req: Request<{ id: string }, {}, TodoUpdateRequest>, res: Response): Promise<void> => {
    try {
        const id: number = parseInt(req.params.id);
        const { text, completed, priority, user_id, dueDate } = req.body;

        const todo: Todo | null = await Todo.findByPk(id);
        if (!todo) {
            res.status(404).json({
                error: 'TODOが見つけりません'
            });
            return;
        }
        //ユーザー存在確認
        if (user_id) {
            const user: User | null = await User.findByPk(user_id);
            if (!user) {
                res.status(404).json({
                    error: 'ユーザーが見つかりません'
                });
                return;
            }
        }

        await todo.update({
            text,
            completed,
            priority,
            user_id,
            dueDate
        });
        //更新後のTODO表示
        const updatedTodo: Todo | null = await Todo.findByPk(todo.id, {
            include: [{ model: User, as: 'user' }]
        });
        res.status(201).json({
            message: 'TODOを更新しました',
            todo: updatedTodo
        });
    } catch (error) {
        if(error.name === 'SequelizeValidationError'){
            res.status(400).json({
                error:'バリデーションエラー',
                details:error.errors.map((e:any)=>e.message)
            });
        }else{
            console.error('TODO更新エラー:',error);
            res.status(500).json({error:'データベースエラー'});
        }
    }
});

app.delete('/api/todos/:id',async(req:Request<{id:string}>,res:Response):Promise<void>=>{
    try{
        const id :number = parseInt(req.params.id);
        const todo:Todo | null = await Todo.findByPk(id);
        if(!todo){
            res.status(404).json({
                error:'TODOが見つかりません'
            });
            return;
        }
        await todo.destroy();

        res.json(201).json({
            message:'TODOが削除されました',
            todo
        });
    }catch(error){
        console.error('TODO削除エラー');
        res.status(500).json({
            error:'データベースエラー'
        })
    }
});

app.get('/api/stats',async(req:Request,res:Response):Promise<void>=>{
    try{
        const totalTodos:number = await Todo.count();
        const completedTodos:number = await Todo.count({where:{completed:true}});

        const priorityStats: Todo[] = await Todo.findAll({
            attributes:[
                'priority',
                [sequelize.fn('COUNT',sequelize.col('id')),'count']
            ],
            group:['priority']
        });
        const userStats:User[] = await User.findAll({
            attributes:[
                'id',
                'name',
                [sequelize.fn('COUNT',sequelize.col('todos.id')),'todoCount']
            ],
            include:[{
                model:Todo,
                as:'todos',
                attributes:[]
            }],
            group:['User.id']
        });

        res.json({
            totalTodos,
            completedTodos,
            pendingTodos:totalTodos-completedTodos,
            priorityBreakdown:priorityStats,
            userBreakdown:userStats
        });
    }catch(error){
        console.error('統計取得エラー',error);
        res.status(500).json({error:'データベースエラー'});
    }
})


// ========== サーバー起動 ==========
const PORT = 3000;

const startServer = async (): Promise<void> => {
    await initDB();
    
    app.listen(PORT, () => {
        console.log(`Sequelize TODO APIサーバー起動: http://localhost:${PORT}`);
        console.log('利用可能なエンドポイント:');
        console.log('  GET    /api/users           - ユーザー一覧');
        console.log('  POST   /api/users           - ユーザー作成');
        console.log('  GET    /api/todos           - TODO一覧');
        console.log('  GET    /api/todos/:id       - TODO詳細');
        console.log('  POST   /api/todos           - TODO作成');
        console.log('  PUT    /api/todos/:id       - TODO更新');
        console.log('  DELETE /api/todos/:id       - TODO削除');
        console.log('  GET    /api/stats           - 統計情報');
    });
};

startServer();

// クリーンアップ
process.on('SIGINT', async (): Promise<void> => {
    console.log('\nアプリケーションを終了します...');
    await sequelize.close();
    process.exit(0);
});