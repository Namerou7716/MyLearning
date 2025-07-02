
console.log('Hello Node.js with TypeScript');

//型を意識した変数宣言の例
const message: string = 'Hello, Node.js with TypeScript';
const version: number = 1.0;
const isReady: boolean = true;

console.log(`message: ${message}`);
console.log(`version:${version}`);
console.log(`ready:${isReady}`);

//関数の型定義
function greet(name:string):string{
    return `hello ${name}`;
}

console.log(greet('Node learner'));