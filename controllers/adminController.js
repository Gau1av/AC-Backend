const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getRolePermissions } = require('../middleware/adminAuth');
const Blog = require('../models/Blog');

// Helper function for secure constant-time string comparison
const safeCompare = (supplied, expected) => {
  if (typeof supplied !== 'string' || typeof expected !== 'string') return false;
  const bufSupplied = Buffer.from(supplied);
  const bufExpected = Buffer.from(expected);
  if (bufSupplied.length !== bufExpected.length) return false;
  return crypto.timingSafeEqual(bufSupplied, bufExpected);
};

// ============================================================================
// 1. ADMIN MULTI-ROLE LOGIN
// ============================================================================
exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret || Buffer.byteLength(jwtSecret, 'utf8') < 32) {
      return res.status(503).json({
        success: false,
        message: 'Admin authentication requires a JWT_SECRET of at least 32 characters'
      });
    }

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Role configuration mapping from environment variables
    const accounts = [
      {
        role: 'owner',
        user: process.env.OWNER_USER || process.env.ADMIN_USER,
        pass: process.env.OWNER_PASS || process.env.ADMIN_PASS
      },
      {
        role: 'manager',
        user: process.env.MANAGER_USER,
        pass: process.env.MANAGER_PASS
      },
      {
        role: 'content',
        user: process.env.CONTENT_USER,
        pass: process.env.CONTENT_PASS
      }
    ];

    // Find account that matches credentials
    const matchedAccount = accounts.find((acc) => {
      if (!acc.user || !acc.pass) return false;
      return (
        safeCompare(username.trim().toLowerCase(), acc.user.trim().toLowerCase()) &&
        safeCompare(password, acc.pass)
      );
    });

    if (!matchedAccount) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    const { role } = matchedAccount;
    const permissions = getRolePermissions(role);

    if (!permissions || !permissions.length) {
      return res.status(403).json({
        success: false,
        message: `No permissions assigned to role: ${role}`
      });
    }

    // Sign JWT with the authenticated role & username
    const token = jwt.sign(
      { username: username.trim().toLowerCase(), role },
      jwtSecret,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      success: true,
      token,
      role,
      permissions,
      data: {
        token,
        role,
        permissions
      },
      message: `${role.toUpperCase()} login successful`
    });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
};

// ============================================================================
// 2. BLOG STATUS TOGGLE HANDLER (Draft <-> Published)
// Handles: PATCH /api/admin/blogs/:id/status & PUT /api/admin/blogs/:id
// ============================================================================
exports.updateBlogStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['Draft', 'Published'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value. Must be either "Draft" or "Published".'
      });
    }

    // Find by Mongo ObjectId or Slug fallback
    const filter = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };

    const updatedBlog = await Blog.findOneAndUpdate(
      filter,
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!updatedBlog) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found with the provided identifier.'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Blog successfully moved to "${status}"!`,
      data: updatedBlog
    });
  } catch (err) {
    console.error('Blog status update error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Error occurred while updating blog status'
    });
  }
};