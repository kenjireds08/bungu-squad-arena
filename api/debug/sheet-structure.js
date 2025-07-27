const { SheetsService } = require('../lib/sheets.js');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sheetsService = new SheetsService();
    await sheetsService.authenticate();
    
    // Get header row (row 1)
    const headerResponse = await sheetsService.sheets.spreadsheets.values.get({
      spreadsheetId: sheetsService.spreadsheetId,
      range: 'Players!1:1'
    });
    
    // Get first data row (row 2) 
    const dataResponse = await sheetsService.sheets.spreadsheets.values.get({
      spreadsheetId: sheetsService.spreadsheetId,
      range: 'Players!2:2'
    });
    
    const headers = headerResponse.data.values?.[0] || [];
    const firstRow = dataResponse.data.values?.[0] || [];
    
    // Create column mapping
    const columnMapping = headers.map((header, index) => ({
      column: String.fromCharCode(65 + index), // A, B, C, etc.
      index: index,
      header: header,
      sampleValue: firstRow[index] || ''
    }));
    
    return res.status(200).json({
      success: true,
      totalColumns: headers.length,
      columnMapping: columnMapping
    });
  } catch (error) {
    console.error('Debug error:', error);
    return res.status(500).json({
      error: 'Failed to get sheet structure',
      message: error.message
    });
  }
}