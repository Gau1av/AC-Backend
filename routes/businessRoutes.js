// routes/businessRoutes.js
const express = require('express');
const router = express.Router();
const Business = require('../models/Business');

// 1. Get All Businesses & Counts
router.get('/', async (req, res) => {
  try {
    const list = await Business.find().sort({ createdAt: -1 });
    const totalCount = await Business.countDocuments();
    res.json({ success: true, total: totalCount, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Register New Business
router.post('/register', async (req, res) => {
  try {
    const { businessName, ownerName, phone, city, serviceCategory } = req.body;
    const newBiz = new Business({ businessName, ownerName, phone, city, serviceCategory });
    await newBiz.save();
    res.status(201).json({ success: true, message: 'Business registered successfully', data: newBiz });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;