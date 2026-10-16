// backend/routes/adminUpload.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const Business = require('../models/Business'); // adjust path if needed

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/businesses/bulk-upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) return res.status(400).json({ success: false, message: 'Excel is empty' });

    // Validate required columns
    const required = ['businessName', 'ownerName', 'phone', 'state', 'city', 'serviceCategory'];
    const missing = required.filter(k => !(k in rows[0]));
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required columns: ${missing.join(', ')}`
      });
    }

    // Normalize each row
    const cleaned = rows.map(r => ({
      businessName:    String(r.businessName || '').trim(),
      ownerName:       String(r.ownerName || '').trim(),
      phone:           String(r.phone || '').trim(),
      state:           String(r.state || 'Delhi (NCT)').trim(),
      city:            String(r.city || 'New Delhi').trim(),
      serviceCategory: String(r.serviceCategory || 'AC Service & Gas Charging').trim(),
      status:          ['Active','Inactive','Suspended'].includes(r.status) ? r.status : 'Active',
      isPaid:          r.isPaid === true || r.isPaid === 'TRUE' || r.isPaid === 'true' || r.isPaid === 1
    })).filter(r => r.businessName && r.phone);

    if (!cleaned.length) {
      return res.status(400).json({ success: false, message: 'No valid rows found' });
    }

    const inserted = await Business.insertMany(cleaned, { ordered: false });
    res.json({ success: true, count: inserted.length, data: inserted });
  } catch (err) {
    console.error('Bulk upload error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;