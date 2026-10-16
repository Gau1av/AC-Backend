// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const connectDB = require('./config/db');

// ---------- Route Imports ----------
const adminRoutes    = require('./routes/adminRoutes');
const adminBlogs     = require('./routes/adminBlogs');
const adminUploadImg = require('./routes/adminUploadImage');
const adminComments  = require('./routes/adminComments');
const adminReports   = require('./routes/adminReports');

const publicBlogs    = require('./routes/blogs');
const publicComments = require('./routes/comments');
const newsletter     = require('./routes/newsletter');

const app = express();

// ---------- Ensure Upload Folders Exist ----------
const uploadsRoot = path.join(__dirname, 'uploads');
const coverDir = path.join(uploadsRoot, 'blog-covers');
if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot, { recursive: true });
if (!fs.existsSync(coverDir)) fs.mkdirSync(coverDir, { recursive: true });

// ---------- CORS Configuration (Production + Local Safe) ----------
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL // Vercel / Render Frontend URL (if provided)
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Postman, mobile apps, ya same-origin requests ke liye origin undefined ho sakta hai
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com')) {
      callback(null, true);
    } else {
      callback(null, true); // Fallback: allow all dynamically with credentials valid header
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Explicit Preflight Handle
app.options('*', cors());

// ---------- Body Parsers ----------
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
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsRoot, {
  maxAge: '7d',
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=604800');
  }
}));

// =========================================================
// API ROUTES
// =========================================================

// Admin sub-routes
app.use('/api/admin/blogs', adminBlogs);
app.use('/api/admin/upload', adminUploadImg);
app.use('/api/admin/comments', adminComments);
app.use('/api/admin/reports', adminReports);
app.use('/api/admin', adminRoutes);

// Public Routes
app.use('/api/blogs', publicBlogs);
app.use('/api/comments', publicComments);
app.use('/api/newsletter', newsletter);

// Existing Public Routes (Inquiries & Businesses)
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

// Health check endpoint (Used by Render to verify live status)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

app.get('/', (req, res) => {
  res.status(200).send('Chintu Cool API is running successfully!');
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
      console.log(`📝 Admin Blogs Route:  http://localhost:${PORT}/api/admin/blogs`);
      console.log(`═══════════════════════════════════════════════════════\n`);
    });
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

startServer();