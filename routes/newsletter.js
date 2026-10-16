// backend/routes/newsletter.js
const express = require('express');
const router = express.Router();
const Subscriber = require('../models/Subscriber');

// POST /api/newsletter — public subscribe
router.post('/', async (req, res) => {
  try {
    const { email, source = 'Blog' } = req.body;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Valid email required' });
    }

    const existing = await Subscriber.findOne({ email });
    if (existing) {
      if (existing.status === 'Unsubscribed') {
        existing.status = 'Active';
        await existing.save();
        return res.json({ success: true, message: 'Welcome back! You are re-subscribed.' });
      }
      return res.json({ success: true, message: 'You are already subscribed!' });
    }

    await Subscriber.create({ email, source });
    res.json({ success: true, message: 'Subscribed successfully! 🎉' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET all subscribers (admin)
router.get('/admin/all', async (req, res) => {
  try {
    const subs = await Subscriber.find().sort({ createdAt: -1 });
    res.json({ success: true, data: subs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE unsubscribe (admin)
router.delete('/admin/:id', async (req, res) => {
  try {
    await Subscriber.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;