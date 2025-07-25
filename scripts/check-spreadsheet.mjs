import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

async function checkSpreadsheet() {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    
    console.log('📊 スプレッドシート名:', spreadsheet.data.properties.title);
    console.log('📋 現在のシート数:', spreadsheet.data.sheets.length);
    console.log('\n既存のシート:');
    
    spreadsheet.data.sheets.forEach((sheet, index) => {
      console.log(`  ${index + 1}. ${sheet.properties.title} (ID: ${sheet.properties.sheetId})`);
      console.log(`     - 行数: ${sheet.properties.gridProperties.rowCount}`);
      console.log(`     - 列数: ${sheet.properties.gridProperties.columnCount}`);
    });
    
  } catch (error) {
    console.error('エラー:', error.message);
  }
}

checkSpreadsheet();