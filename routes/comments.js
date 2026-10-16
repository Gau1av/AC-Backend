// backend/routes/comments.js
const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Blog = require('../models/Blog');

// POST /api/comments — public submission
router.post('/', async (req, res) => {
  try {
    const { blogId, name, email, message } = req.body;

    if (!blogId || !name || !email || !message) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email' });
    }

    const blog = await Blog.findById(blogId);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

    const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
      .split(',')[0].trim();

    const comment = await Comment.create({
      blog: blogId,
      name,
      email,
      message,
      ipAddress,
      status: 'Pending'
    });

    res.json({
      success: true,
      message: 'Comment submitted! It will appear after moderation.',
      data: { _id: comment._id }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/comments/blog/:blogId — public (approved only)
router.get('/blog/:blogId', async (req, res) => {
  try {
    const comments = await Comment.find({
      blog: req.params.blogId,
      status: 'Approved'
    })
      .select('-email -ipAddress')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: comments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;