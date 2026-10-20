const jwt = require('jsonwebtoken');

const ROLE_PERMISSIONS = Object.freeze({
  owner: Object.freeze(['inquiries', 'businesses', 'blogs', 'comments', 'subscribers', 'reports']),
  manager: Object.freeze(['inquiries', 'businesses', 'reports']),
  content: Object.freeze(['blogs', 'comments'])
});

const getAdminRole = () => (process.env.ADMIN_ROLE || 'manager').trim().toLowerCase();

const getRolePermissions = (role) => ROLE_PERMISSIONS[role] || null;

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
    const activeRole = getAdminRole();

    // Verify token role matches configured system role
    if (payload.role !== activeRole) {
      return res.status(401).json({ success: false, message: 'Admin role mismatch or revoked' });
    }

    const permissions = getRolePermissions(payload.role);
    if (!permissions) {
      return res.status(401).json({ success: false, message: 'Admin permissions not found' });
    }

    res.setHeader('Cache-Control', 'no-store');
    req.admin = { role: payload.role, permissions };
    next();
  } catch (err) {
    if (
      err.name === 'TokenExpiredError' ||
      err.name === 'JsonWebTokenError' ||
      err.name === 'NotBeforeError'
    ) {
      return res.status(401).json({ success: false, message: 'Admin session is invalid or expired' });
    }
    next(err);
  }
};

const authorizeSection = (section) => (req, res, next) => {
  if (!req.admin || !req.admin.permissions.includes(section)) {
    return res.status(403).json({
      success: false,
      message: `Access denied: Requires permission for section '${section}'`
    });
  }
  next();
};

const authorizeAdminRoute = (req, res, next) => {
  // Normalize checking path regardless of where router is mounted
  const currentPath = req.path.toLowerCase();

  // 1. Whitelist public login route
  if (req.method === 'POST' && (currentPath === '/login' || currentPath === '/api/admin/login')) {
    return next();
  }

  // 2. Authenticate session token
  return authenticateAdmin(req, res, (authError) => {
    if (authError) return next(authError);
    if (res.headersSent) return;

    // 3. Whitelist profile check endpoint
    if (req.method === 'GET' && (currentPath === '/me' || currentPath === '/api/admin/me')) {
      return next();
    }

    // 4. Section permission mappings
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

    const matched = routeSections.find(({ prefix }) =>
      currentPath === prefix || currentPath.startsWith(`${prefix}/`)
    );

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
  getAdminRole,
  getRolePermissions,
  authenticateAdmin,
  authorizeSection,
  authorizeAdminRoute
};