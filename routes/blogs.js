// backend/routes/blogs.js
const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const Comment = require('../models/Comment');

// GET published blogs (list)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 9, category, search } = req.query;
    const query = { status: 'Published' };
    if (category && category !== 'All') query.category = category;
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { excerpt: new RegExp(search, 'i') },
        { content: new RegExp(search, 'i') }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [blogs, total] = await Promise.all([
      Blog.find(query).select('-content -viewedBy').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Blog.countDocuments(query)
    ]);

    // Attach comment counts
    const ids = blogs.map((b) => b._id);
    const counts = await Comment.aggregate([
      { $match: { blog: { $in: ids }, status: 'Approved' } },
      { $group: { _id: '$blog', count: { $sum: 1 } } }
    ]);
    const countMap = counts.reduce((m, c) => ({ ...m, [c._id]: c.count }), {});

    const data = blogs.map((b) => ({
      ...b.toObject(),
      commentCount: countMap[b._id] || 0
    }));

    res.json({
      success: true,
      data,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET categories
router.get('/categories', async (req, res) => {
  try {
    const cats = await Blog.aggregate([
      { $match: { status: 'Published' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    res.json({ success: true, data: cats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single blog by slug — increments unique views + returns comments
router.get('/:slug', async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, status: 'Published' });
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

    // Unique view tracking by IP
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    if (ip && !blog.viewedBy.includes(ip)) {
      blog.viewedBy.push(ip);
      blog.views += 1;
      await blog.save();
    }

    // Related
    const related = await Blog.find({
      status: 'Published',
      category: blog.category,
      _id: { $ne: blog._id }
    })
      .select('-content -viewedBy')
      .limit(3)
      .sort({ createdAt: -1 });

    // Approved comments
    const comments = await Comment.find({ blog: blog._id, status: 'Approved' })
      .select('-email -ipAddress')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: blog, related, comments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;