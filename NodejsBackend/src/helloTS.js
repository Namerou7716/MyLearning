console.log('Hello Node.js with TypeScript');
//型を意識した変数宣言の例
var message = 'Hello, Node.js with TypeScript';
var version = 1.0;
var isReady = true;
console.log("message: ".concat(message));
console.log("version:".concat(version));
console.log("ready:".concat(isReady));
//関数の型定義
function greet(name) {
    return "hello ".concat(name);
}
console.log(greet('Node learner'));
