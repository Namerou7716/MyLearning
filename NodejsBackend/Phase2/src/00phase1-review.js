const http = require('http');

let items = [{id:1,name:'myItem','createdAt':new Date().toISOString()}];
let nextId = 1;

const server = http.createServer((req, res) => {
    const method = req.method;
    const url = req.url;

    const routeKey = `${method} ${url}`;
    switch (routeKey) {
        case 'GET /items':
            res.writeHead(200, { 'content-type': 'application/json;charset=utf-8' });
            res.end(JSON.stringify(items, null, 2));
            break;
        case 'POST /items':
            let body = '';
            req.on('data', (chunk) => {
                body += chunk;
            });
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    const newItem = {
                        id: nextId++,
                        name: data.name,
                        createdAt: new Date().toISOString()
                    };
                    items.push(newItem);
                    res.writeHead(200, { 'content-type': 'application/json;charset=utf-8' });
                    res.end(JSON.stringify(newItem, null, 2));
                }catch(error)
                {
                    res.writeHead(400,{'content-type':'application/json;charset=utf-8'});
                    res.end(JSON.stringify({error:'Invalid JSON'},null,2));
                }
            });
            break;
        default:
            res.writeHead(404, { 'content-type': 'application/json;charset=utf-8' });
            res.end(JSON.stringify({error:'Not Found'}), null, 2);
    }
})

server.listen(3000,()=>{
    console.log('server launched http://localhost:3000/items');
})