"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var sqlite3 = require("sqlite3");
var path = require("path");
//expressアプリケーションを宣言
var app = (0, express_1.default)();
//ミドルウェア使用
//JSONリクエストボディを解析するミドルウェア
app.use(express_1.default.json());
//データベース接続
var dbPath = path.join(__dirname, 'express_todo.db');
var db = new sqlite3.Database(dbPath);
//テーブル初期化
db.serialize(function () {
    db.run("\n        CREATE TABLE IF NOT EXISTS todos (\n            id INTEGER PRIMARY KEY AUTOINCREMENT,\n            text TEXT NOT NULL,\n            priority TEXT DEFAULT 'medium',\n            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n        ) \n        ");
});
//ヘルパー関数
//db.runをPromise化
//ラップしている関数の返り値に合わせたPromiseの型
var runQuery = function (sql, params) {
    if (params === void 0) { params = []; }
    return new Promise(function (resolve, reject) {
        //sql:実行するクエリ
        //params:SQLのプレースホルダー(?)にバインドするパラメータの配列
        //function():実行結果を受け取るコールバック関数
        //db.runはコールバック関数のthisにRunResultを明示的にバインドする。
        //このthisを受け取るためにfunctionでコールバック関数を定義する
        //db.run : SQLiteデータベースに対してSQLをじっこうする
        db.run(sql, params, function (err) {
            if (err)
                reject(err);
            else
                resolve({ id: this.lastID, changes: this.changes });
        });
    });
};
//db.allをPromise化
var getAllQuery = function (sql, params) {
    if (params === void 0) { params = []; }
    return new Promise(function (resolve, reject) {
        //db.all : 複数の結果行を配列として取得する
        db.all(sql, params, function (err, rows) {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
//db.getをPromise化
//結果が見つからない可能性もあるためundefinedも許容している
var getQuery = function (sql, params) {
    if (params === void 0) { params = []; }
    return new Promise(function (resolve, reject) {
        //db.get : 単一の結果行を取得する。
        db.get(sql, params, function (err, row) {
            if (err)
                reject(err);
            else
                resolve(row);
        });
    });
};
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
app.get('/api/todos', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, completed, priority, search, sql, params, todos, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.query, completed = _a.completed, priority = _a.priority, search = _a.search;
                sql = 'SELECT * FROM todos WHERE 1=1';
                params = [];
                if (completed !== undefined) {
                    sql += 'AND completed = ?';
                    params.push(completed === 'true' ? 1 : 0);
                }
                if (priority) {
                    sql += 'AND priority = ?';
                    params.push(priority);
                }
                if (search) {
                    sql += 'AND text LIKE ?';
                    params.push("%".concat(search, "%"));
                }
                sql += 'ORDER BY created_at DESC';
                return [4 /*yield*/, getAllQuery(sql, params)];
            case 1:
                todos = _b.sent();
                res.json({
                    todos: todos.map(function (todo) { return (__assign(__assign({}, todo), { completed: Boolean(todo.completed) })); })
                });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _b.sent();
                console.error('TODO取得エラー:', error_1);
                res.status(500).json({ error: 'データベースエラー' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
//特定TODO取得
app.get('/api/todos/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, todo, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = parseInt(req.params.id);
                if (isNaN(id)) {
                    res.status(400).json({ error: 'Invalid ID' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, getQuery('SELECT * FROM todos WHERE id = ?', [id])];
            case 1:
                todo = _a.sent();
                if (!todo) {
                    res.status(404).json({ error: 'TODOが見つかりません' });
                    return [2 /*return*/];
                }
                res.json({
                    todo: __assign(__assign({}, todo), { completed: Boolean(todo.completed) })
                });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('TODO取得エラー', error_2);
                res.status(500).json({ error: 'データベースエラー' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
//TODO作成
app.post('/api/todos', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, text, _b, priority, result, newTodo, error_3;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 3, , 4]);
                _a = req.body, text = _a.text, _b = _a.priority, priority = _b === void 0 ? 'medium' : _b;
                //入力値のバリデーション
                if (!text || typeof text !== 'string') {
                    res.status(400).json({ error: 'textフィールドは必須です' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, runQuery('INSERT INTO todos (text,priority) VALUES (?,?)', [text.trim(), priority])];
            case 1:
                result = _c.sent();
                return [4 /*yield*/, getQuery('SELECT * FROM todos WHERE id=?', [result.id])];
            case 2:
                newTodo = _c.sent();
                res.status(201).json({
                    message: 'TODOが作成されました',
                    todo: newTodo ? __assign(__assign({}, newTodo), { completed: Boolean(newTodo.completed) }) : null
                });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _c.sent();
                console.error('TODO作成エラー', error_3);
                res.status(500).json({ error: 'データベースエラー' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
//TODO更新
app.put('api/todos/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, existingTodo, _a, text, completed, priority, updates, params, validPriorities, updateTodo, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                id = parseInt(req.params.id);
                if (isNaN(id)) {
                    res.status(400).json({ error: 'Invalid ID' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, getQuery('SELECT * FROM todos WHERE id = ?', [id])];
            case 1:
                existingTodo = _b.sent();
                if (!existingTodo) {
                    res.status(404).json({ error: 'ID task not found' });
                    return [2 /*return*/];
                }
                _a = req.body, text = _a.text, completed = _a.completed, priority = _a.priority;
                updates = [];
                params = [];
                if (text !== undefined) {
                    updates.push('text = ?');
                    params.push(text);
                }
                if (completed !== undefined) {
                    updates.push('completed = ?');
                    params.push(completed ? 1 : 0);
                }
                if (priority !== undefined) {
                    validPriorities = ['low', 'medium', 'high'];
                    if (!validPriorities.includes(priority)) {
                        res.status(400).json({
                            error: 'priorityはhigh,medium,lowのいずれかで指定すること'
                        });
                        return [2 /*return*/];
                    }
                    updates.push('priority = ?');
                    params.push(priority);
                }
                if (updates.length === 0) {
                    res.status(400).json({
                        error: '更新するフィールドが入力されていません'
                    });
                    return [2 /*return*/];
                }
                updates.push('updated_at = CURRENT_TIMESTAMP');
                params.push(id);
                return [4 /*yield*/, runQuery("UPDATE todos SET ".concat(updates.join(','), " WHERE id = ?"), params)];
            case 2:
                _b.sent();
                return [4 /*yield*/, getQuery('SELECT * FROM todos WHERE id = ?', [id])];
            case 3:
                updateTodo = _b.sent();
                res.json({
                    mesage: 'TODO updated',
                    todo: updateTodo ? __assign(__assign({}, updateTodo), { completed: Boolean(updateTodo.completed) }) : null
                });
                return [3 /*break*/, 5];
            case 4:
                error_4 = _b.sent();
                console.error('TODO更新エラー:', error_4);
                res.status(500).json({ error: 'データベースエラー' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
app.delete('/api/todos/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, existingTodo, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                id = parseInt(req.params.id);
                if (isNaN(id)) {
                    res.status(400).json({
                        error: 'Invalid ID'
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, getQuery('SELECT * FROM todos WHERE id = ?', [id])];
            case 1:
                existingTodo = _a.sent();
                if (!existingTodo) {
                    res.status(404).json({
                        error: 'Todo not found'
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, runQuery('DELETE FROM todos WHERE id = ?', [id])];
            case 2:
                _a.sent();
                res.json({
                    message: 'TODOが削除されました',
                    todo: __assign(__assign({}, existingTodo), { completed: Boolean(existingTodo.completed) })
                });
                return [3 /*break*/, 4];
            case 3:
                error_5 = _a.sent();
                console.error('TODO削除エラー:', error_5);
                res.status(500).json({ error: 'データベースエラー' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
//統計情報取得
app.get('/api/todos/stats', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var totalTodos, completedTodos, priorityStats, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                return [4 /*yield*/, getQuery('SELECT COUNT(*) as count FROM todos')];
            case 1:
                totalTodos = _a.sent();
                return [4 /*yield*/, getQuery('SELECT COUNT(*) as count FROM todos WHERE completed=1')];
            case 2:
                completedTodos = _a.sent();
                return [4 /*yield*/, getAllQuery("SELECT priority COUNT(*) as count\n            FROM todos\n            GROUP BY priority")];
            case 3:
                priorityStats = _a.sent();
                res.json({
                    total: (totalTodos === null || totalTodos === void 0 ? void 0 : totalTodos.count) || 0,
                    completed: (completedTodos === null || completedTodos === void 0 ? void 0 : completedTodos.count) || 0,
                    pending: ((totalTodos === null || totalTodos === void 0 ? void 0 : totalTodos.count) || -0) - ((completedTodos === null || completedTodos === void 0 ? void 0 : completedTodos.count) || 0),
                    byPriority: priorityStats
                });
                return [3 /*break*/, 5];
            case 4:
                error_6 = _a.sent();
                console.error('統計取得エラー', error_6);
                res.status(500).json({ error: 'データベースエラー' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
//サーバー起動
var PORT = 3000;
app.listen(PORT, function () {
    console.log("SQLite TODO API\u30B5\u30FC\u30D0\u30FC\u8D77\u52D5: http://localhost:".concat(PORT));
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
process.on('SIGINT', function () {
    console.log('\nアプリケーション終了');
    db.close(function (err) {
        if (err) {
            console.error('データベース接続終了エラー:', err.message);
        }
        else {
            console.log('データベース接続終了');
        }
        process.exit(0);
    });
});
