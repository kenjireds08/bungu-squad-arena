#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

const testAuth = () => {
  try {
    console.log('Testing with Base64 decode approach...');
    
    // Try approach used in working API
    let credentials;
    const rawCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    
    // Method 1: Direct parse (same as API)
    try {
      credentials = JSON.parse(rawCredentials);
      console.log('✅ Method 1 (direct) worked!');
      return credentials;
    } catch (e) {
      console.log('❌ Method 1 failed:', e.name, e.message);
    }
    
    // Method 2: Handle newlines properly
    try {
      const processedCredentials = rawCredentials.replace(/\\n/g, '\n');
      credentials = JSON.parse(processedCredentials);
      console.log('✅ Method 2 (newline processing) worked!');
      return credentials;
    } catch (e) {
      console.log('❌ Method 2 failed:', e.name, e.message);
    }
    
    // Method 3: Use base64 if it looks like base64
    try {
      if (rawCredentials.indexOf('{') !== 0) {
        console.log('Trying base64 decode...');
        const decoded = Buffer.from(rawCredentials, 'base64').toString('utf8');
        credentials = JSON.parse(decoded);
        console.log('✅ Method 3 (base64) worked!');
        return credentials;
      }
    } catch (e) {
      console.log('❌ Method 3 failed:', e.name, e.message);
    }
    
    return null;
  } catch (error) {
    console.error('❌ All methods failed:', error);
    return null;
  }
};

const credentials = testAuth();
if (credentials) {
  console.log('\n✅ Success! Project ID:', credentials.project_id);
  console.log('✅ Client Email:', credentials.client_email);
  console.log('✅ Private Key present:', credentials.private_key ? 'Yes' : 'No');
} else {
  console.log('\n❌ Could not parse credentials');
  console.log('Raw credential starts with:', process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.substring(0, 50));
}