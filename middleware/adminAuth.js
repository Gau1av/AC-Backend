const jwt = require('jsonwebtoken');

// 1. Role-based permissions matrix
const ROLE_PERMISSIONS = Object.freeze({
  owner: Object.freeze(['inquiries', 'businesses', 'blogs', 'comments', 'subscribers', 'reports']),
  manager: Object.freeze(['inquiries', 'businesses', 'reports']),
  content: Object.freeze(['blogs', 'comments'])
});

const getRolePermissions = (role) => {
  if (!role) return null;
  return ROLE_PERMISSIONS[role.toLowerCase()] || null;
};

// 2. Token Authentication Middleware
const authenticateAdmin = (req, res, next) => {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    return res.status(503).json({
      success: false,
      message: 'Admin authentication requires a JWT_SECRET of at least 32 characters'
    });
  }

  const authorization = req.get('Authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return res.status(401).json({ success: false, message: 'Admin authentication required' });
  }

  const token = match[1].trim();

  try {
    const payload = jwt.verify(token, secret);

    // Verify role exists in permitted roles matrix
    const normalizedRole = payload.role ? String(payload.role).toLowerCase() : null;
    const permissions = getRolePermissions(normalizedRole);

    if (!permissions) {
      return res.status(401).json({
        success: false,
        message: 'Invalid role or permissions not found for this account'
      });
    }

    res.setHeader('Cache-Control', 'no-store');
    req.admin = {
      username: payload.username || null,
      role: normalizedRole,
      permissions
    };

    next();
  } catch (err) {
    if (
      err.name === 'TokenExpiredError' ||
      err.name === 'JsonWebTokenError' ||
      err.name === 'NotBeforeError'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Admin session is invalid or expired. Please login again.'
      });
    }
    next(err);
  }
};

// 3. Section Permission Guard
const authorizeSection = (section) => (req, res, next) => {
  if (!req.admin || !Array.isArray(req.admin.permissions) || !req.admin.permissions.includes(section)) {
    return res.status(403).json({
      success: false,
      message: `Access denied: Requires permission for section '${section}'`
    });
  }
  next();
};

// 4. Global Router Guard
const authorizeAdminRoute = (req, res, next) => {
  // Normalize full path
  const currentPath = (req.baseUrl ? `${req.baseUrl}${req.path}` : req.path).toLowerCase();

  // A. Whitelist public auth route
  if (req.method === 'POST' && (currentPath.endsWith('/login') || currentPath.endsWith('/login/'))) {
    return next();
  }

  // B. Authenticate JWT session
  return authenticateAdmin(req, res, (authError) => {
    if (authError) return next(authError);
    if (res.headersSent) return;

    // C. Whitelist profile check endpoint (/me)
    if (req.method === 'GET' && (currentPath.endsWith('/me') || currentPath.endsWith('/me/'))) {
      return next();
    }

    // D. Section permission mappings
    const routeSections = [
      { prefix: '/inquiries', section: 'inquiries' },
      { prefix: '/stats', section: 'inquiries' },
      { prefix: '/analytics', section: 'inquiries' },
      { prefix: '/businesses', section: 'businesses' },
      { prefix: '/blogs', section: 'blogs' },
      { prefix: '/upload', section: 'blogs' },
      { prefix: '/comments', section: 'comments' },
      { prefix: '/subscribers', section: 'subscribers' },
      { prefix: '/reports', section: 'reports' }
    ];

    const matched = routeSections.find(({ prefix }) => {
      return currentPath.includes(prefix);
    });

    if (!matched) {
      return res.status(403).json({
        success: false,
        message: 'No permission rule is assigned to this admin route'
      });
    }

    return authorizeSection(matched.section)(req, res, next);
  });
};

module.exports = {
  ROLE_PERMISSIONS,
  getRolePermissions,
  authenticateAdmin,
  authorizeSection,
  authorizeAdminRoute
};