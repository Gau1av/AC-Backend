const jwt = require('jsonwebtoken');

exports.adminLogin = async (req, res) => {
  const { username, password } = req.body;
  
  // Environment variables se fixed credentials match karna
  const FIXED_ADMIN_USER = process.env.ADMIN_USER || "admin";
  const FIXED_ADMIN_PASS = process.env.ADMIN_PASS || "Admin@12345";

  if (username === FIXED_ADMIN_USER && password === FIXED_ADMIN_PASS) {
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET || 'SECRET_KEY', { expiresIn: '1d' });
    return res.status(200).json({ success: true, token, message: 'Login safal raha' });
  }
  return res.status(401).json({ success: false, message: 'Galat username ya password' });
};