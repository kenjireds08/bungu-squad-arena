// 超ミニマル関数 - 外部依存を一切排除
module.exports = async function handler(req, res) {
  console.log("test handler hit", Date.now());
  console.log("Request method:", req.method);
  console.log("Request URL:", req.url);
  
  try {
    res.status(200).json({ 
      ok: true, 
      timestamp: Date.now(),
      message: "Minimal test function is working",
      nodeVersion: process.version,
      method: req.method
    });
  } catch (error) {
    console.error("Even minimal function failed:", error);
    res.status(500).json({ error: error.message });
  }
};