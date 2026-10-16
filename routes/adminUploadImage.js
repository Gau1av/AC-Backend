// backend/routes/adminUploadImage.js
const express = require('express');
const router = express.Router();
const multer = require('multer');

// Memory storage use karein (Render filesystem write completely bypass ho jayega)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB safe limit
  fileFilter: (req, file, cb) => {
    const isMimeValid = /image\/(jpeg|jpg|png|webp)/i.test(file.mimetype);
    if (isMimeValid) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE'));
    }
  }
});

// ✅ POST /api/admin/upload/blog-cover
router.post('/blog-cover', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('❌ Upload validation error:', err.message);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Image size too large. Maximum allowed size is 4MB.'
        });
      }
      if (err.message === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          success: false,
          message: 'Only JPG, JPEG, PNG, and WEBP formats are allowed.'
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Image upload error'
      });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded.'
      });
    }

    try {
      // Direct Data URI format generate karein: data:image/png;base64,....
      const base64Data = req.file.buffer.toString('base64');
      const dataUri = `data:${req.file.mimetype};base64,${base64Data}`;

      console.log('✅ Image converted to Base64 URI successfully');

      return res.status(200).json({
        success: true,
        message: 'Image uploaded successfully',
        url: dataUri
      });
    } catch (encodeErr) {
      console.error('❌ Base64 encode error:', encodeErr);
      return res.status(500).json({
        success: false,
        message: 'Failed to process image data',
        error: encodeErr.message
      });
    }
  });
});

module.exports = router;