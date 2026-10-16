// backend/routes/adminUploadImage.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;

// Optional: sharp pre-load check (done once at startup)
let sharp = null;
try {
  sharp = require('sharp');
} catch (_) {
  console.log('ℹ️ Sharp library not found. Falling back to native buffer file write.');
}

const uploadDir = path.join(__dirname, '..', 'uploads', 'blog-covers');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Memory storage for buffer-based processing
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const isMimeValid = /image\/(jpeg|jpg|png|webp)/i.test(file.mimetype);
    const isExtValid = /\.(jpe?g|png|webp)$/i.test(path.extname(file.originalname));

    if (isMimeValid && isExtValid) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE'));
    }
  },
});

// ✅ POST /api/admin/upload/blog-cover
router.post('/blog-cover', (req, res) => {
  upload.single('image')(req, res, async (err) => {
    // Catch Multer-specific errors cleanly
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Image size exceeds the 5MB limit.',
        });
      }
      if (err.message === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          success: false,
          message: 'Only JPG, JPEG, PNG, and WEBP image files are allowed.',
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload validation failed.',
      });
    }

    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({
          success: false,
          message: 'No image file uploaded. Please select an image.',
        });
      }

      // Safe extension extraction
      let ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
      if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
        ext = req.file.mimetype === 'image/png' ? 'png' : req.file.mimetype === 'image/webp' ? 'webp' : 'jpg';
      }

      const filename = `blog-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
      const filepath = path.join(uploadDir, filename);

      // Process via Sharp (if available) or non-blocking async write
      if (sharp) {
        await sharp(req.file.buffer)
          .resize(1200, 630, { fit: 'cover', position: 'center' })
          .toFile(filepath);
      } else {
        await fsPromises.writeFile(filepath, req.file.buffer);
      }

      const fileUrl = `/uploads/blog-covers/${filename}`;

      return res.status(200).json({
        success: true,
        message: 'Image uploaded successfully',
        url: fileUrl,
        filename,
      });
    } catch (processErr) {
      console.error('❌ Upload processing error:', processErr);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while saving the image.',
        error: processErr.message,
      });
    }
  });
});

module.exports = router;