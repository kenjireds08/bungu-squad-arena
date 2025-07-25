# Vercel環境変数設定手順

## 現在の状況
- APIファイルのGitHubプッシュ完了
- Google Sheets API統合コード実装済み
- 環境変数設定がAPI動作に必要

## 設定が必要な環境変数

### 1. GOOGLE_SHEETS_ID
```
1tFa04F1Rdg5gHxPMOaky99NHM-8VORuix6MhjYipBeA
```

### 2. GOOGLE_SERVICE_ACCOUNT_KEY
```
{"type":"service_account","project_id":"bungu-squad-data","private_key_id":"f6b1ab68c4ff8b73f8bbca2d0b04d4dc4e0dd57c","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCg7W9BQ7nO0YpN\nHRKqHGFVv6rH95iFLOJQ7VZgQhDZhSlBfOjA/BCtfQvGqZLqHvt8WVP5fgwkmZ0Y\nxEhNRIGr13y4aK8vYQJBJIGJrJfeLU5YN3rUALj5DKPqnJcCJJZJY6pF5UKD0NDN\nIBTQr1lCTaWAKOgHWU2OzRZ6MYKqrKJABNd0yiCKRZBG9M5Tq/+mJZy8g9dHQnEN\na3xYYbSTiOgQ1KJpJHtq9/8FPOrEGaOXZQeMfY3b1JFh26G3J1Y+6j0D0Xd0nGO4\ntY7YS8iSDLxfJLjHIqBx3vFjfhLnH/4hk3hBEU/5XHoUa3fHYvErBHLG6iKa5Yt9\nyLGiYn6ZAgMBAAECggEAUIa9SIkYAWgMD6kQ3lEe3oFlO+dQQHpvGt4w12zyO7GN\n5TUyKhUJIVaIbUeLPH9qMlJACNnFT3Gn2V7aoBz8ztLNcUH7yNP6LBVN1x+tKEeD\nRgDuM9zfX2VPPNlD/+tJ8dJ7n8HdmwTwmFHKCe8YKy7mQ3JyOGwrBz1f4lJh3RPF\nYfLuKlXGI6yJ2mh8dHLVeLcmQ6KYRCRLgJoKlNCNS8EYyLhN3K6T+HGEC5LvtFHc\nYmP3Ov0AeBAiXKrlHpLjfJcJL7nWa2TN6dSjX7dOYgqU1E2NWr0Ol5k1jYqPBH6b\nlMgJPDFfCfwHUmGVqGLKo3Y5uAtL3yDHUZVfU7Ou6QKBgQDaVLJqwjpbv0GCcXxY\nGJjlPv8gJ6mZfBqGfGkXoUzY5nTZBGUqjl7Zn6q0C8IHWzPxJrOh8vOkHGIzJpjT\nqg8aGXGN6B5NgPzQGj5LqVKQb5h5/0NFgZx3vO6ClyJgX5vQTGkB3PF5jGHfK3rF\nOUYFl5Z/8zG7qH1VGNj5BL6C9wKBgQC7M5nq3L8gqHa3T3lOy6K8oGq8EqXQfVfH\n1vYpL8TgwJQfQP/+FD6VGN6mVh8DjKjX8Y9Sq6OQhVzq3tBa5Zby0Ql7e7zn7fQH\n3JT1w2fJ8vON2p8DXYyJ2LYnqEqBP/Lk7LU2EqFJI+OkW9kJYgF3PjcJGYvKjF6B\nKJ2k5Pr+hwKBgFzWz2E4c8YGQ8EZnRs6lC7w9qFZ7vxKQg8vZj7ELGQHoLMW8qG3\n7Ky6Y8LvO7b1Vh+w1Q3mZY2q8JsKQnK9mPGhJ9K5RBY5nHyGnG8t8zP2q3C7+gxJ\ngBYqJKo3y0wOa8xG8rO2JrGQ2f0PcQVOx9aF2GNx8YeHFH4NLOqH7vLpAoGBAIdN\nj2eG8JJY+RGv1EGHDfGLz9JzGlMdL6gKr/c6vYNkH3rO5Fb0K9TYxQ7ZGjKXYJhX\nd5TJPqJRCLRpJHdJLfOqBDo9GhFvOJ8CHBhJGnD+Jp+YcJHsH+3L6EzKhD6oQYPr\n3ZhYQQl5/7f5V3EgxGwz3W5o2GLF9y6jzQzFY5nTAoGABUYU2k6/7G5OuPY8j3hN\nYqCgdHy8DHP4K9wMH+OH2W9yqGGJD5YgE1fJdqZS7nL2K7oFjbF3JY2fBLqJNfJh\nYcLgKfZZ1P9vGjEpJVlKlw9YK4KrJyFZ8HgJKLjIGsJ8Pz4lD8GBk7JiALgZJ9qj\nO9pGJj3oJHjGjKj3YQlVhSo=\n-----END PRIVATE KEY-----\n","client_email":"bungu-squad-service@bungu-squad-data.iam.gserviceaccount.com","client_id":"112845649459830892653","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","universe_domain":"googleapis.com"}
```

## Vercel設定手順

1. **Vercelダッシュボードにアクセス**
   - bungu-squad-arenaプロジェクトを選択

2. **Settings → Environment Variables**
   - 左サイドバーから「Settings」をクリック
   - 「Environment Variables」タブを選択

3. **環境変数を追加**
   - GOOGLE_SHEETS_ID: `1tFa04F1Rdg5gHxPMOaky99NHM-8VORuix6MhjYipBeA`
   - GOOGLE_SERVICE_ACCOUNT_KEY: JSONクレデンシャル全体（改行なしの1行）

4. **再デプロイ**
   - 環境変数設定後、自動再デプロイまたは手動でDeploymentsから再デプロイ

## 確認方法
設定完了後、以下のAPIエンドポイントでテスト：
```
https://bungu-squad-arena.vercel.app/api/players
```

## トラブルシューティング
- Runtime Logsでエラー詳細を確認
- Authentication失敗の場合はJSONフォーマットを確認
- Spreadsheet IDが正しいか確認