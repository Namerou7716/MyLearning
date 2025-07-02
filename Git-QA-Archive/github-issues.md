# GitHub関連の問題と解決策

## 📋 このドキュメントについて

GitHub特有の問題と解決方法をまとめたドキュメントです。

---

## 🗓️ GitHub問題集

### Issue 1: GitHub上で右矢印マークが表示される

**症状:**
- GitHub上でフォルダに右矢印（→）が表示される
- フォルダをクリックしても中身が見えない
- コミットしたファイルが反映されない

**原因:**
サブモジュール（入れ子になったGitリポジトリ）として認識されている

**解決方法:**
```powershell
# 該当ディレクトリで.gitフォルダを削除
cd ProblemFolder
Remove-Item -Recurse -Force .git

# 親ディレクトリで再追加
cd ..
git add .
git commit -m "Fix folder structure - remove submodule"
git push origin main
```

---

### Issue 2: pushしたのにGitHubに反映されない

**症状:**
- `git push` が成功したように見える
- でもGitHub上で変更が確認できない
- エラーメッセージが表示されない

**原因と解決:**

#### 原因1: ブランチ名の不一致
```bash
# 現在のブランチ確認
git branch

# GitHubのデフォルトブランチがmainの場合
git push origin current-branch:main
```

#### 原因2: 認証問題
```bash
# 認証確認
git push origin main --dry-run

# Personal Access Tokenの再設定が必要な場合あり
```

#### 原因3: 違うリポジトリを見ている
- ブラウザでURLを再確認
- 正しいブランチを選択しているか確認

---

### Issue 3: GitHubの表示がキャッシュされている

**症状:**
- 正しくpushしているのに古い情報が表示される
- ファイルの内容が更新されない

**解決方法:**
```bash
# ハードリフレッシュ（ブラウザ）
Ctrl + F5

# 強制的な再push
git push origin main --force-with-lease

# GitHubのキャッシュクリア確認
# → 数分待ってから再確認
```

---

## 🛠️ GitHub操作のベストプラクティス

### 推奨ワークフロー

1. **作業前の確認**
   ```bash
   git fetch origin
   git status
   git pull origin main
   ```

2. **変更のコミット**
   ```bash
   git add .
   git commit -m "Clear description of changes"
   ```

3. **pushと確認**
   ```bash
   git push origin main
   # GitHub上で即座に確認
   ```

### 避けるべき操作

- `git push --force` （チーム開発では特に危険）
- 複数のリポジトリでの同時作業
- ブランチ名の頻繁な変更

---

## 🔧 デバッグ用コマンド

### GitHub連携の確認
```bash
# リモートリポジトリの確認
git remote -v

# リモートブランチの確認
git ls-remote origin

# 最新のpush状況確認
git log --oneline origin/main
```

### PowerShell特有のコマンド
```powershell
# GitHubのURL確認
git config --get remote.origin.url

# プッシュ履歴の詳細確認
git reflog | Select-String "push"
```

---

**最終更新:** 2025-01-01