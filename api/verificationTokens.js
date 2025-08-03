// 認証トークン管理用のシンプルなメモリストレージ
// 本番環境では Redis や Database を推奨
let verificationTokens = new Map();

// トークンの保存
export function storeVerificationToken(token, data) {
  const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24時間後
  verificationTokens.set(token, {
    ...data,
    expiryTime
  });
  console.log('Token stored:', token, 'for email:', data.email);
}

// トークンの取得と検証
export function getVerificationData(token) {
  const data = verificationTokens.get(token);
  
  if (!data) {
    return null; // トークンが存在しない
  }
  
  if (new Date() > data.expiryTime) {
    // 期限切れの場合は削除
    verificationTokens.delete(token);
    return null;
  }
  
  return data;
}

// トークンの削除（使用済み）
export function removeVerificationToken(token) {
  verificationTokens.delete(token);
  console.log('Token removed:', token);
}

// 期限切れトークンのクリーンアップ（定期実行用）
export function cleanupExpiredTokens() {
  const now = new Date();
  let cleanedCount = 0;
  
  for (const [token, data] of verificationTokens.entries()) {
    if (now > data.expiryTime) {
      verificationTokens.delete(token);
      cleanedCount++;
    }
  }
  
  console.log('Cleaned up expired tokens:', cleanedCount);
  return cleanedCount;
}

// デバッグ用: 現在のトークン一覧
export function getAllTokens() {
  return Array.from(verificationTokens.entries()).map(([token, data]) => ({
    token: token.substring(0, 8) + '...',
    email: data.email,
    nickname: data.nickname,
    expiryTime: data.expiryTime
  }));
}