// routes/business.js
const express = require('express');
const router = express.Router();
const Business = require('../models/Business');

// 1. Get Businesses with search query
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query = {
        $or: [
          { businessName: { $regex: search, $options: 'i' } },
          { city: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      };
    }
    const list = await Business.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Register Business
router.post('/register', async (req, res) => {
  try {
    const { businessName, ownerName, phone, city, serviceCategory, status } = req.body;
    const newBiz = new Business({ businessName, ownerName, phone, city, serviceCategory, status });
    await newBiz.save();
    res.status(201).json({ success: true, message: 'Business registered successfully', data: newBiz });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;