const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getAdminRole, getRolePermissions } = require('../middleware/adminAuth');

exports.adminLogin = async (req, res) => {
  const { username, password } = req.body;
  const fixedAdminUser = process.env.ADMIN_USER;
  const fixedAdminPass = process.env.ADMIN_PASS;
  const jwtSecret = process.env.JWT_SECRET;
  const role = getAdminRole();

  if (!fixedAdminUser || !fixedAdminPass ||
      !jwtSecret || Buffer.byteLength(jwtSecret, 'utf8') < 32 ||
      !getRolePermissions(role)) {
    return res.status(503).json({
      success: false,
      message: 'Admin login is not configured. Set ADMIN_USER, ADMIN_PASS, a JWT_SECRET of at least 32 characters, and a valid ADMIN_ROLE.'
    });
  }

  const suppliedUser = Buffer.from(typeof username === 'string' ? username : '');
  const suppliedPass = Buffer.from(typeof password === 'string' ? password : '');
  const expectedUser = Buffer.from(fixedAdminUser);
  const expectedPass = Buffer.from(fixedAdminPass);
  const userMatches = suppliedUser.length === expectedUser.length &&
    crypto.timingSafeEqual(suppliedUser, expectedUser);
  const passMatches = suppliedPass.length === expectedPass.length &&
    crypto.timingSafeEqual(suppliedPass, expectedPass);

  if (!userMatches || !passMatches) {
    return res.status(401).json({ success: false, message: 'Invalid username or password' });
  }

  const token = jwt.sign({ role }, jwtSecret, { expiresIn: '8h' });
  return res.status(200).json({
    success: true,
    token,
    role,
    permissions: getRolePermissions(role),
    message: 'Login successful'
  });
};