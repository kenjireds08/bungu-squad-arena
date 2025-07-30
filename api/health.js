module.exports = async function handler(req, res) {
  res.status(200).json({ 
    ok: true, 
    timestamp: Date.now(),
    message: "API is working!" 
  });
};