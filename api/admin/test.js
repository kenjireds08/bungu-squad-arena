module.exports = async function handler(req, res) {
  console.log('Test API called:', req.method);
  
  try {
    return res.status(200).json({
      success: true,
      message: 'Test API working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test API error:', error);
    return res.status(500).json({
      error: 'Test API failed',
      message: error.message
    });
  }
}