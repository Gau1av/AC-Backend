const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Blog = require('../models/Blog');

// ==========================================
// 💬 PUBLIC: Post a comment on a blog
// Endpoint: POST /api/blogs/:id/comments
// ==========================================
router.post('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and comment message are required.'
      });
    }

    // Check if blog exists by ID or Slug
    let blogDoc;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      blogDoc = await Blog.findById(id);
    } else {
      blogDoc = await Blog.findOne({ slug: id });
    }

    if (!blogDoc) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found.'
      });
    }

    const newComment = new Comment({
      blog: blogDoc._id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      status: 'Approved' // Directly approve so user can see their comment
    });

    await newComment.save();

    return res.status(201).json({
      success: true,
      message: 'Comment posted successfully!',
      data: newComment
    });
  } catch (err) {
    console.error('Comment submit error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to submit comment'
    });
  }
});

// ==========================================
// 💬 PUBLIC: Get approved comments for a blog
// Endpoint: GET /api/blogs/:id/comments
// ==========================================
router.get('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;

    let blogDoc;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      blogDoc = await Blog.findById(id);
    } else {
      blogDoc = await Blog.findOne({ slug: id });
    }

    if (!blogDoc) {
      return res.status(404).json({ success: false, message: 'Blog post not found.' });
    }

    const comments = await Comment.find({
      blog: blogDoc._id,
      status: 'Approved'
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: comments.length,
      data: comments
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;