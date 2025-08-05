#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

console.log('Environment variables check:');
console.log('GOOGLE_SHEETS_ID:', process.env.GOOGLE_SHEETS_ID ? 'Set' : 'Not set');
console.log('GOOGLE_SERVICE_ACCOUNT_KEY length:', process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.length);

// Test different approaches to parse the JSON
const testJson = () => {
  try {
    console.log('\n1. Direct JSON.parse:');
    const direct = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    console.log('✅ Success - project_id:', direct.project_id);
    return direct;
  } catch (e) {
    console.log('❌ Failed:', e.message);
  }

  try {
    console.log('\n2. With \\n replacement:');
    const withReplace = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY.replace(/\\n/g, '\n'));
    console.log('✅ Success - project_id:', withReplace.project_id);
    return withReplace;
  } catch (e) {
    console.log('❌ Failed:', e.message);
  }

  // Try finding the problematic character
  console.log('\n3. Character analysis around position 179:');
  const str = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  for (let i = 170; i < 190; i++) {
    const char = str[i];
    const charCode = char?.charCodeAt(0);
    console.log(`Position ${i}: "${char}" (code: ${charCode})`);
  }

  return null;
};

const credentials = testJson();
if (credentials) {
  console.log('\n✅ Authentication test successful');
} else {
  console.log('\n❌ All authentication methods failed');
}