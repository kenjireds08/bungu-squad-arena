#!/usr/bin/env node

/**
 * 既存のJSON認証情報をBase64に変換するスクリプト
 */

require('dotenv').config({ path: '.env.local' });

const jsonCreds = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

if (!jsonCreds) {
  console.error('❌ GOOGLE_SERVICE_ACCOUNT_KEY not found');
  process.exit(1);
}

console.log('元のJSON長さ:', jsonCreds.length);

// Try to clean and fix the JSON
let cleanedJson = jsonCreds;

// Replace escaped newlines
cleanedJson = cleanedJson.replace(/\\n/g, '\n');

console.log('清理後の長さ:', cleanedJson.length);

// Try to parse to validate
try {
  const parsed = JSON.parse(cleanedJson);
  console.log('✅ JSON parsing successful');
  console.log('Project ID:', parsed.project_id);
  console.log('Client Email:', parsed.client_email);
  
  // Convert to Base64
  const base64 = Buffer.from(cleanedJson).toString('base64');
  console.log('\n📦 Base64エンコード完了:');
  console.log('GOOGLE_SERVICE_ACCOUNT_KEY_B64=' + base64);
  
  // Test decoding
  const decoded = Buffer.from(base64, 'base64').toString('utf8');
  const decodedParsed = JSON.parse(decoded);
  console.log('\n✅ Base64デコードテスト成功');
  console.log('Decoded Project ID:', decodedParsed.project_id);
  
} catch (error) {
  console.error('❌ JSON parsing failed:', error.message);
  
  // Show the exact position of the error
  console.log('エラー位置周辺:', cleanedJson.substring(170, 200));
  
  // Try to fix common issues
  console.log('\n🔧 修復を試みています...');
  
  // Remove potential control characters
  let fixedJson = cleanedJson.replace(/[\x00-\x08\x0B\xFF]/g, '');
  
  try {
    const parsed = JSON.parse(fixedJson);
    console.log('✅ 修復後のJSON parsing成功');
    
    // Convert to Base64
    const base64 = Buffer.from(fixedJson).toString('base64');
    console.log('\n📦 Base64エンコード完了:');
    console.log('GOOGLE_SERVICE_ACCOUNT_KEY_B64=' + base64);
    
  } catch (e) {
    console.error('❌ 修復後もJSON parsing失敗:', e.message);
  }
}