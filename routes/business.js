// routes/business.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');
const Business = require('../models/Business');

const uploadDir = path.join(__dirname, '../uploads/businesses');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|webp)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and WEBP images are allowed'));
    }
  }
});

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Public listings only include businesses approved by an administrator.
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const query = { status: 'Active' };
    if (search) {
      const safeSearch = escapeRegex(String(search).trim());
      query.$or = [
        { businessName: { $regex: safeSearch, $options: 'i' } },
        { city: { $regex: safeSearch, $options: 'i' } },
        { serviceCategory: { $regex: safeSearch, $options: 'i' } }
      ];
    }
    const list = await Business.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/register', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, async (req, res) => {
  let imageUrl = '';
  try {
    const {
      businessName, ownerName, phone, email, state, city, address,
      serviceCategory, description, serviceAreas, experienceYears,
      serviceHours, priceRange
    } = req.body;

    if (!businessName?.trim() || !ownerName?.trim() || !phone?.trim() ||
        !city?.trim() || !serviceCategory?.trim() || !description?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Business name, technician name, phone, city, service, and description are required'
      });
    }

    if (req.file) {
      const image = sharp(req.file.buffer);
      const metadata = await image.metadata();
      const optimized = await image
        .rotate()
        .webp({ lossless: true, effort: 5 })
        .toBuffer();
      const webpIsSmaller = optimized.length < req.file.buffer.length;
      const extensionByFormat = { jpeg: 'jpg', png: 'png', webp: 'webp' };
      const extension = webpIsSmaller
        ? 'webp'
        : extensionByFormat[metadata.format];
      if (!extension) {
        return res.status(400).json({ success: false, message: 'Unsupported image format' });
      }
      const filename = `${crypto.randomUUID()}.${extension}`;
      await fs.promises.writeFile(
        path.join(uploadDir, filename),
        webpIsSmaller ? optimized : req.file.buffer
      );
      imageUrl = `/uploads/businesses/${filename}`;
    }

    const newBiz = await Business.create({
      businessName: businessName.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      email: email?.trim() || '',
      state: state?.trim() || 'Delhi (NCT)',
      city: city.trim(),
      address: address?.trim() || '',
      serviceCategory: serviceCategory.trim(),
      description: description.trim(),
      serviceAreas: serviceAreas?.trim() || '',
      experienceYears: Number(experienceYears) || 0,
      serviceHours: serviceHours?.trim() || '',
      priceRange: priceRange?.trim() || '',
      imageUrl,
      status: 'Pending'
    });

    res.status(201).json({
      success: true,
      message: 'Your business profile was submitted for review.',
      data: newBiz
    });
  } catch (err) {
    console.error('Business registration error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;