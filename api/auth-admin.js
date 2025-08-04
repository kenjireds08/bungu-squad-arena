// Secure admin authentication endpoint
const SheetsService = require('./lib/sheets');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  try {
    // Server-side admin authentication
    const adminEmails = [
      'kenji.reds08@gmail.com',
      'mr.warabisako@gmail.com', 
      'yosshio@example.com'
    ];
    
    const adminPassword = process.env.ADMIN_PASSWORD || 'bungu-2025';
    
    if (!adminEmails.includes(email) || password !== adminPassword) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Get user data from sheets
    const sheetsService = new SheetsService();
    const players = await sheetsService.getPlayers();
    const user = players.find(p => p.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return res.status(404).json({ error: 'Admin user not found in system' });
    }

    return res.status(200).json({
      success: true,
      user: user,
      isAdmin: true,
      message: 'Admin authentication successful'
    });
  } catch (error) {
    console.error('Auth API error:', error);
    
    // Handle rate limit errors properly
    if (error.code === 429) {
      res.setHeader('Retry-After', '15');
      return res.status(429).json({ 
        error: 'API rate limit exceeded. Please try again in 15 seconds.' 
      });
    }
    
    return res.status(500).json({ error: 'Authentication failed' });
  }
};