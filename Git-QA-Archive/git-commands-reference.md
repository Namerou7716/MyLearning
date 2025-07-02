# Git コマンドリファレンス

## 📋 このドキュメントについて

学習中によく使用するGitコマンドをまとめたリファレンスです。
安全性レベルと使用頻度を明記しています。

---

## 🟢 安全なコマンド（いつでも実行OK）

### 情報確認系
```bash
# 現在の状況確認
git status                    # 最重要・最頻出

# コミット履歴確認
git log --oneline            # 簡潔な履歴
git log -5                   # 最新5件

# ブランチ確認
git branch                   # ローカルブランチ一覧
git branch -a                # 全ブランチ一覧
git branch -vv               # 詳細情報付き

# リモート確認
git remote -v                # リモートURL確認
git ls-remote origin         # リモートの最新情報
```

### 差分確認系
```bash
# ファイル差分確認
git diff                     # 作業ディレクトリとステージング
git diff --cached            # ステージングとコミット
git diff HEAD                # 作業ディレクトリと最新コミット

# ブランチ間差分
git log --oneline HEAD..origin/main  # ローカルとリモートの差分
```

### リモート情報取得
```bash
# リモート情報取得（安全）
git fetch origin             # ローカルファイル変更なし
git fetch --all              # 全リモート取得
```

---

## 🟡 注意が必要なコマンド（理解して使用）

### ファイル操作系
```bash
# ステージング
git add .                    # 全ファイル追加
git add filename             # 特定ファイル追加

# コミット
git commit -m "message"      # メッセージ付きコミット
git commit -am "message"     # add + commit

# ファイル取り消し
git checkout -- filename    # 作業ディレクトリの変更取り消し
git reset HEAD filename      # ステージングから取り消し
```

### ブランチ操作
```bash
# ブランチ作成・切り替え
git checkout -b new-branch   # 新ブランチ作成・切り替え
git checkout main            # ブランチ切り替え
git switch main              # 新しい切り替えコマンド

# マージ
git merge origin/main        # リモートをローカルにマージ
```

### 同期系
```bash
# プル（fetch + merge）
git pull origin main         # ローカルファイルが変更される
git pull --rebase origin main  # リベースでプル
```

---

## 🔴 危険なコマンド（慎重に使用）

### 強制系
```bash
# 強制プッシュ
git push --force origin main           # 🚨 非常に危険
git push --force-with-lease origin main # より安全な強制プッシュ

# リセット
git reset --hard HEAD~1      # 🚨 コミットを完全削除
git reset --hard origin/main # 🚨 ローカルをリモートに強制合わせ
```

### 履歴変更系
```bash
# リベース
git rebase origin/main       # 🚨 履歴を書き換え
git rebase -i HEAD~3         # 🚨 対話的リベース

# コミット修正
git commit --amend           # 🚨 最新コミットを修正
```

---

## 🛠️ PowerShell特有のコマンド

### ファイル操作
```powershell
# ディレクトリ移動
cd NodejsBackend

# ファイル一覧（隠しファイル含む）
Get-ChildItem -Force

# ファイル存在確認
Test-Path .git

# ファイル・フォルダ削除
Remove-Item -Recurse -Force .git

# 条件付き処理
if (Test-Path .git) {
    Remove-Item -Recurse -Force .git
}
```

### Git操作と組み合わせ
```powershell
# Git状況とファイル確認
git status
Get-ChildItem -Force

# 安全なファイル削除とGit操作
if (Test-Path .git) {
    Write-Host "Found .git folder" -ForegroundColor Yellow
    Remove-Item -Recurse -Force .git
    Write-Host "Removed .git folder" -ForegroundColor Green
}
git add .
git commit -m "Fix repository structure"
```

---

## 📋 シチュエーション別コマンド集

### 初回セットアップ
```bash
# 新規リポジトリ作成
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/user/repo.git
git push -u origin main
```

### 日常的な作業フロー
```bash
# 1. 最新情報取得
git fetch origin
git pull origin main

# 2. 作業・変更

# 3. 変更をコミット
git add .
git commit -m "Describe your changes"

# 4. プッシュ
git push origin main
```

### トラブル対応
```bash
# pushエラーの場合
git fetch origin
git status
git pull origin main  # コンフリクト解決が必要な場合あり
git push origin main

# 間違えてコミットした場合
git log --oneline
git reset --soft HEAD~1  # コミット取り消し（ファイルは残る）
git reset --hard HEAD~1  # 🚨 コミット&ファイル完全削除
```

### GitHub問題対応
```bash
# サブモジュール問題
rm -rf .git              # Linux/Mac
# または
Remove-Item -Recurse -Force .git  # PowerShell

git add .
git commit -m "Fix submodule issue"
git push origin main
```

---

## 💡 コマンド使用のコツ

### 安全な作業手順
1. **必ず `git status` で現状確認**
2. **重要な変更前は `git log` でバックアップ地点確認**
3. **`git fetch` で最新情報を取得してから作業**
4. **不安な操作は別ブランチで試す**

### エラー対応の基本
1. **エラーメッセージをよく読む**
2. **`git status` で現状を把握**
3. **段階的に問題を切り分ける**
4. **強制コマンドは最後の手段**

### 効率化のポイント
- エイリアス設定で頻用コマンドを短縮
- VSCodeなどのGit統合機能を活用
- コミットメッセージは将来の自分のために明確に

---

## 🆘 緊急時のコマンド

### 作業を一時的に保存
```bash
git stash                # 作業を一時保存
git stash pop            # 保存した作業を復元
git stash list           # 保存した作業一覧
```

### 強制的にリモートと同期
```bash
# 🚨 ローカルの変更を全て破棄してリモートに合わせる
git fetch origin
git reset --hard origin/main
```

### 間違ったファイルをコミットした場合
```bash
# 最新コミットからファイルを除外
git reset HEAD~1 filename
git commit -m "Remove accidentally added file"
```

---

**最終更新:** 2025-01-01  
**安全性レベル:** 🟢安全 🟡注意 🔴危険