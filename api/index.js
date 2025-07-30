module.exports = async (req, res) => {
  const { url } = req;
  
  // Remove /api prefix and trailing slashes
  const path = url.replace(/^\/api\/?/, '').replace(/\/$/, '');
  
  console.log('API Route:', path);
  
  // Route to appropriate handler
  try {
    let handler;
    
    switch(path.split('?')[0]) {
      case 'admin':
        handler = require('./admin');
        break;
      case 'rankings':
        handler = require('./rankings');
        break;
      case 'tournaments':
        handler = require('./tournaments');
        break;
      case 'matches':
        handler = require('./matches');
        break;
      case 'players':
        handler = require('./players');
        break;
      case 'tournament-system':
        handler = require('./tournament-system');
        break;
      default:
        return res.status(404).json({ error: 'API endpoint not found', path });
    }
    
    // Call the handler
    return handler(req, res);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};