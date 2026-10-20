// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const connectDB = require('./config/db');

// ---------- Route Imports ----------
// 1. Admin Authentication & Management
let adminAuthRoutes;
try {
  adminAuthRoutes = require('./routes/adminAuth');
} catch (e) {
  // Fallback agar adminAuth routes adminRoutes ke andar hi merged hain
  adminAuthRoutes = null;
}
const adminRoutes    = require('./routes/adminRoutes');
const adminBlogs     = require('./routes/adminBlogs');
const adminUploadImg = require('./routes/adminUploadImage');
const adminComments  = require('./routes/adminComments');
const adminReports   = require('./routes/adminReports');

// 2. Public Routes
const publicBlogs    = require('./routes/blogs');
const publicComments = require('./routes/comments');
const newsletter     = require('./routes/newsletter');

// 3. Security Middlewares
const {
  authenticateAdmin,
  authorizeSection,
  authorizeAdminRoute
} = require('./middleware/adminAuth');

const app = express();

// ---------- Ensure Upload Folders Exist ----------
const uploadsRoot = path.join(__dirname, 'uploads');
const coverDir = path.join(uploadsRoot, 'blog-covers');
if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot, { recursive: true });
if (!fs.existsSync(coverDir)) fs.mkdirSync(coverDir, { recursive: true });

// ---------- CORS Configuration ----------
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.onrender.com')
    ) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

app.use(cors(corsOptions));

// Express 5 safe preflight options handler
app.options(/(.*)/, cors(corsOptions));

// ---------- Body Parsers (15MB for WebP Base64 Images) ----------
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ---------- Request Logger ----------
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const emoji = res.statusCode >= 400 ? '❌' : '✅';
    console.log(`${emoji} ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// ---------- Static File Serving ----------
app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(uploadsRoot, {
    maxAge: '7d',
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=604800');
    }
  })
);

// =========================================================
// API ROUTES
// =========================================================

// 1. Auth Endpoint (Login & Session Verification)
if (adminAuthRoutes) {
  app.use('/api/admin', adminAuthRoutes);
}

// 2. Global Guard for all remaining /api/admin/* endpoints
app.use('/api/admin', authorizeAdminRoute);

// 3. Admin Protected Sub-Routes
app.use('/api/admin/blogs', adminBlogs);
app.use('/api/admin/upload', adminUploadImg);
app.use('/api/admin/comments', adminComments);
app.use('/api/admin/reports', adminReports);
app.use('/api/admin', adminRoutes);

// 4. Newsletter Admin (Subscribers Permission Protected)
app.use('/api/newsletter/admin', authenticateAdmin, authorizeSection('subscribers'));

// 5. Public Routes
app.use('/api/blogs', publicBlogs);
app.use('/api/comments', publicComments);
app.use('/api/newsletter', newsletter);

// 6. Dynamic Inquiries & Partner Businesses Routes
try {
  app.use('/api/inquiries', require('./routes/inquiryRoutes'));
} catch (e) {
  console.warn('⚠️ inquiryRoutes not found, skipping.');
}

try {
  app.use('/api/businesses', require('./routes/business'));
} catch (e) {
  console.warn('⚠️ business route not found, skipping.');
}

// ---------- Health Checks ----------
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

app.get('/', (req, res) => {
  res.status(200).send('Chintu Cool AC Service API is running successfully!');
});

// ---------- 404 JSON Handler ----------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// ---------- Global Error Handler ----------
app.use((err, req, res, next) => {
  console.error('❌ Global Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// ---------- Start Server ----------
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n═══════════════════════════════════════════════════════`);
      console.log(`🚀 Chintu Cool Server Running on Port: ${PORT}`);
      console.log(`📁 Uploads Static Dir: http://localhost:${PORT}/uploads`);
      console.log(`📝 Admin API Base:     http://localhost:${PORT}/api/admin`);
      console.log(`═══════════════════════════════════════════════════════\n`);
    });
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

startServer();