# Node.js + TypeScript Phase 1 セットアップガイド

## 📋 このドキュメントについて

このガイドは、Node.js + TypeScriptでPhase 1学習を始めるための環境構築手順をまとめたものです。

## 🎯 セットアップの目標

- **Node.js + TypeScript**の開発環境構築
- **Phase 1学習**に必要な設定の完了
- **型安全性**と**学習しやすさ**のバランス

## 🛠️ 環境構築手順

### 1. プロジェクト初期化

```bash
# プロジェクトディレクトリ作成
mkdir NodejsBackend
cd NodejsBackend

# package.json初期化
npm init -y
```

### 2. TypeScript環境のインストール

```bash
# TypeScript関連パッケージのインストール
npm install -D typescript @types/node ts-node ts-node-dev
```

**各パッケージの役割：**
- `typescript` - TypeScript → JavaScript コンパイラ
- `@types/node` - Node.jsのAPI型定義
- `ts-node` - TypeScriptファイルの直接実行
- `ts-node-dev` - 自動リロード付きTypeScript実行

### 3. TypeScript設定ファイル作成

```bash
# tsconfig.json生成
npx tsc --init
```

### 4. tsconfig.json の設定

**推奨設定（学習向け）：**

```json
{
  "compilerOptions": {
    "target": "es2016",                                  /* 変換後のJavaScriptバージョン */
    "module": "commonjs",                                /* モジュールシステム */
    "outDir": "./dist",                                  /* compile後の保存先 */
    "rootDir": "./src",                                  /* TypeScriptファイルはsrcフォルダに置く */
    "strict": true,                                      /* 厳密型チェック */
    "noImplicitAny": false,                             /* any型の暗黙的使用を許可 */
    "esModuleInterop": true,                            /* import文を使いやすくする */
    "skipLibCheck": true,                               /* ライブラリの型チェックをスキップ */
    "forceConsistentCasingInFileNames": true,           /* importでの大文字小文字を厳密に */
    "resolveJsonModule": true,                          /* JSONファイルをimportできる */
    "sourceMap": true                                   /* デバッグ時に元のTSファイルが見える */
  },
  "include": ["src/**/*"],                              /* 対象ファイル指定 */
  "exclude": ["node_modules", "dist"]                   /* 除外ファイル */
}
```

**重要な設定解説：**
- `strict: true` + `noImplicitAny: false` = 型安全性と学習しやすさのバランス
- `outDir: "./dist"` = コンパイル後のファイル置き場
- `rootDir: "./src"` = ソースコードの場所

### 5. package.json スクリプト設定

**Phase 1学習用スクリプト：**

```json
{
  "name": "nodejsbackend",
  "version": "1.0.0",
  "description": "Node.js学習プロジェクト",
  "main": "dist/server.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "dev:step1": "ts-node src/step1-hello.ts",
    "dev:step2": "ts-node-dev --respawn --transpile-only src/step2-simple-server.ts",
    "type-check": "tsc --noEmit"
  },
  "keywords": ["nodejs", "typescript", "learning"],
  "author": "Your Name",
  "license": "MIT",
  "type": "commonjs",
  "devDependencies": {
    "@types/node": "^24.0.8",
    "ts-node": "^10.9.2",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.8.3"
  }
}
```

**各スクリプトの説明：**
- `build` - TypeScript → JavaScript コンパイル
- `start` - コンパイル済みJavaScriptの実行
- `dev` - 開発モード（自動リロード）
- `dev:step1` - Step 1専用実行コマンド
- `dev:step2` - Step 2専用実行コマンド
- `type-check` - 型チェックのみ実行

### 6. ディレクトリ構造作成

```bash
# ソースコードディレクトリ作成
mkdir src
```

**最終的なプロジェクト構造：**
```
NodejsBackend/
├── package.json              # プロジェクト設定・依存関係
├── tsconfig.json             # TypeScript設定
├── src/                      # TypeScriptソースコード
│   ├── step1-hello.ts        # Phase 1 Step 1
│   ├── step2-simple-server.ts # Phase 1 Step 2
│   └── step4-todo-complete.ts # Phase 1 Step 4
├── dist/                     # コンパイル後のJavaScript（自動生成）
└── node_modules/             # 依存関係（自動生成）
```

## ✅ セットアップ完了確認

### 動作確認コマンド

```bash
# TypeScriptコンパイラ確認
npx tsc --version

# ts-node確認
npx ts-node --version

# 型チェック確認
npm run type-check
```

### 環境チェックリスト

- [ ] Node.js (v18以上) インストール済み
- [ ] npm インストール済み
- [ ] TypeScript関連パッケージインストール完了
- [ ] tsconfig.json設定完了
- [ ] package.jsonスクリプト設定完了
- [ ] srcディレクトリ作成完了
- [ ] `npm run type-check`でエラーが出ない

## 🚀 Phase 1学習開始

### 学習ファイルの作成順序

1. **Step 1: Hello World**
   ```bash
   # ファイル作成
   touch src/step1-hello.ts
   
   # 実行
   npm run dev:step1
   ```

2. **Step 2: HTTPサーバー**
   ```bash
   # ファイル作成
   touch src/step2-simple-server.ts
   
   # 実行
   npm run dev:step2
   ```

3. **Step 4: TODO API**
   ```bash
   # ファイル作成
   touch src/step4-todo-complete.ts
   
   # 実行
   npm run dev
   ```

### よく使うコマンド

```bash
# 開発中
npm run dev:step1    # Step 1実行
npm run dev:step2    # Step 2実行
npm run dev          # メインサーバー実行

# 確認・ビルド
npm run type-check   # 型チェック
npm run build        # コンパイル
npm start           # 本番実行
```

## 🔧 トラブルシューティング

### よくあるエラーと対処法

1. **`Cannot find module 'typescript'`**
   ```bash
   npm install -D typescript
   ```

2. **`tsc: command not found`**
   ```bash
   npx tsc --version  # npxを使用
   ```

3. **型エラーが大量に出る**
   - tsconfig.jsonの`noImplicitAny: false`を確認

4. **ファイルが見つからない**
   - ファイルパスが`src/`から始まっているか確認

## 📚 参考資料

- [Phase 1学習ガイド](../Tutorial/nodejs-backend-complete-guide/phase-1-nodejs-basics/README.md)
- [段階的学習ガイド](../Tutorial/nodejs-backend-complete-guide/progressive-learning-guide.md)
- [TypeScript移行ガイド](../Tutorial/nodejs-backend-complete-guide/typescript-migration-guide.md)

## 📝 学習記録

**セットアップ完了日:** 2025-01-01

**次のステップ:** Phase 1 Step 1 (Hello World) の実装

---

## 📊 セットアップ完了サマリー（2025-01-01）

### ✅ 完了した環境構築項目

1. **TypeScript開発環境**
   - ✅ typescript, @types/node, ts-node, ts-node-dev インストール完了
   - ✅ tsconfig.json 最適化完了（strict: true + noImplicitAny: false）
   - ✅ package.json Phase 1用スクリプト設定完了

2. **プロジェクト構造**
   - ✅ src/ ディレクトリ作成完了
   - ✅ dist/ ディレクトリ自動生成設定完了
   - ✅ 適切なファイル配置構造確立

3. **学習支援ドキュメント**
   - ✅ SETUP-GUIDE.md（このファイル）
   - ✅ Q&A-LOG.md（学習中の疑問解決）
   - ✅ Git関連ドキュメント群

### 🎯 検証済み動作確認

- ✅ `npm run type-check` 実行成功
- ✅ TypeScriptコンパイル動作確認
- ✅ 開発用スクリプト動作確認
- ✅ Git環境との連携確認

### 🚀 Phase 1学習準備完了

**すぐに実行可能なコマンド:**
```bash
npm run dev:step1    # Hello World実行
npm run dev:step2    # HTTPサーバー実行
npm run dev          # メインサーバー実行
npm run type-check   # 型チェック実行
npm run build        # プロダクションビルド
```

### 💡 重要な設定ポイント

1. **tsconfig.json の学習向け最適化**
   - `strict: true` - 型安全性確保
   - `noImplicitAny: false` - 学習しやすさ確保
   - `outDir: "./dist"` - 整理されたファイル構造

2. **package.json の学習用スクリプト**
   - 各ステップ個別実行可能
   - 開発効率向上のための設定
   - 段階的学習サポート

### 🆘 今後のサポート体制

- **Q&A記録**: [Q&A-LOG.md](./Q&A-LOG.md)で継続記録
- **Git操作支援**: [Git-QA-Archive/](../Git-QA-Archive/)で問題解決
- **段階的学習**: [progressive-learning-guide.md](../Tutorial/nodejs-backend-complete-guide/progressive-learning-guide.md)

---

**🎉 セットアップ完了！Phase 1学習を開始してください！**

**環境構築者:** Claude + あなた  
**構築期間:** 2025-01-01  
**学習準備完了度:** 100% ✅