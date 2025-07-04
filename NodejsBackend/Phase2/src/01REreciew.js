// 以下を20分以内で一から書けますか？

const http = require('http');

let items = [];
let nextId = 1;

const server = http.createServer((req, res) => {
    const method = req.method;
    const url = req.url;
    
    // TODO: 以下を実装してください
    // 1. GET /items - 全アイテム取得
    // 2. POST /items - アイテム作成（bodyから{name}を受け取る）
    // 3. その他は404エラー

    const routeKey = `${method} ${url}`;
    switch(routeKey){
        case 'GET /items':
            res.writeHead(200,{'content-type':'application/json'});
            res.end(JSON.stringify(items));
            break;
        case 'POST /items':
            let body = '';
            req.on('data',(chunk)=>{
                body+=chunk;
            });
            req.on('end',()=>{
                try{
                    const data =JSON.parse(body);
                    const newItem = {
                        id:nextId++,
                        name:data.name,
                        createdAt:new Date().toISOString()
                    };
                    items.push(newItem);
                    res.writeHead(200,{'content-type':'application/json'});
                    res.end(JSON.stringify(newItem));
                }
                catch(error){
                    res.writeHead(400,{'content-type':'application/json'});
                    res.end(JSON.stringify({error:'Invalid JSON'}));
                }
            });
            break;
        default:
            res.writeHead(404,{'content-type':'application/json'});
            res.end(JSON.stringify({error:'Page not found'}));
    }
    
    // ここに実装...
});

server.listen(3000, () => {
    console.log('復習サーバー起動: http://localhost:3000');
});