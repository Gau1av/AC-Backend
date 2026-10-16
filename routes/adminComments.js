// backend/routes/adminComments.js
const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');

// GET all comments for admin
router.get('/', async (req, res) => {
  try {
    const { status, blogId } = req.query;
    const query = {};
    if (status && status !== 'All') query.status = status;
    if (blogId) query.blog = blogId;

    const comments = await Comment.find(query)
      .populate('blog', 'title slug')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: comments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update status
router.put('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const c = await Comment.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json({ success: true, data: c });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await Comment.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;