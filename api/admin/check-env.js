module.exports = async function handler(req, res) {
  try {
    const hasServiceAccount = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const hasSheetId = !!process.env.GOOGLE_SHEETS_ID;
    
    console.log('Environment check:', {
      hasServiceAccount,
      hasSheetId,
      serviceAccountLength: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.length
    });
    
    return res.status(200).json({
      success: true,
      environment: {
        hasServiceAccount,
        hasSheetId,
        serviceAccountLength: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.length || 0
      }
    });
  } catch (error) {
    console.error('Environment check error:', error);
    return res.status(500).json({
      error: 'Environment check failed',
      message: error.message
    });
  }
}