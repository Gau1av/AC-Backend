// backend/routes/adminReports.js
const express = require('express');
const router = express.Router();
const Business = require('../models/Business');
const Inquiry  = require('../models/Inquiry'); // adjust path

// Business growth over time
router.get('/businesses', async (req, res) => {
  try {
    const { range = 'month' } = req.query;
    const fmt =
      range === 'day'   ? '%Y-%m-%d' :
      range === 'year'  ? '%Y'       : '%Y-%m';

    const data = await Business.aggregate([
      { $group: {
          _id:   { $dateToString: { format: fmt, date: '$createdAt' } },
          count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Inquiry distribution by service
router.get('/inquiries', async (req, res) => {
  try {
    const data = await Inquiry.aggregate([
      { $group: { _id: '$serviceType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;