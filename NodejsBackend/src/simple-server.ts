//異なるContent-Typeでのレスポンス実装

import * as http from 'http';

//レスポンスの型定義
interface ResponseData {
    message: string;
    timestamp: string;
}

//サーバー作成
const server: http.Server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
    //共通のレスポンスデータ
    const responseData: ResponseData = {
        message: 'Hello World',
        timestamp: new Date().toISOString() 
    };

    //URLパスに応じてレスポンス形式を変更
    const url: string = req.url || '/';

    switch (url) {
        case '/':
        case '/text':
            //テキストで返す場合
            res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end(`${responseData.message}\ntime:${responseData.timestamp}`);
            break;
        case '/html':
            //HTMLで返す場合
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
                    <html>
                        <head><title>Nodejs TypeScript server</title></head>
                        <body>
                            <h1>${responseData.message}</h1>
                            <p>time:${responseData.timestamp}</p>
                        </body>
                    </html>
                    `);
            break;
        case '/json':
            //JSONで返す場合
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(responseData, null, 2));
            break;
        default:
            //404 error
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Page not found 404');
    }
});

//ポート番号の型定義
const PORT: number = 3000;

//サーバー起動
server.listen(PORT, (): void => {
    console.log(`server start: http://localhost:${PORT}`);
    console.log('Accessable end point');
    console.log('  - http://localhost:3000/ (テキスト)');
    console.log('  - http://localhost:3000/text (テキスト)');
    console.log('  - http://localhost:3000/html (HTML)');
    console.log('  - http://localhost:3000/json (JSON)');
});

process.on('SIGINT',():void=>{
    console.log('\n server stop....');
    server.close(():void=>{
        console.log('server stop completed');
        process.exit(0);
    })
})