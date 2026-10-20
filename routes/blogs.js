const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const Comment = require('../models/Comment');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ============================================================================
// 1. PUBLIC COMMUNITY BLOG SUBMISSION (Draft Status by Default)
// ============================================================================
router.post('/submit', async (req, res) => {
  try {
    const { title, author, category, excerpt, content, imageUrl, galleryImages } = req.body;

    if (!title?.trim() || !author?.trim() || !content?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title, author name, and blog content are required'
      });
    }

    if (
      title.trim().length > 200 ||
      author.trim().length > 100 ||
      (excerpt && excerpt.trim().length > 300) ||
      content.trim().length > 25000
    ) {
      return res.status(400).json({
        success: false,
        message: 'Title, author, summary, or content exceeds the allowed length'
      });
    }

    const slugBase =
      title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'community-story';

    // Supporting images sanitize (Max 2 compressed pictures)
    const sanitizedGallery = Array.isArray(galleryImages) ? galleryImages.slice(0, 2) : [];

    const blog = await Blog.create({
      title: title.trim(),
      slug: `${slugBase}-${Date.now().toString().slice(-4)}`,
      author: author.trim(),
      category: category || 'AC Repair',
      excerpt: excerpt?.trim() || '',
      content: content.trim(),
      imageUrl: imageUrl || '',
      galleryImages: sanitizedGallery,
      status: 'Draft'
    });

    return res.status(201).json({
      success: true,
      message: 'Your article has been submitted for admin review and approval.',
      data: { id: blog._id, slug: blog.slug }
    });
  } catch (err) {
    console.error('Community blog submission error:', err);
    return res.status(400).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 2. GET PUBLISHED BLOGS LIST (Filtered & Paginated)
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 9, category, search } = req.query;
    const query = { status: 'Published' };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      const safeSearch = escapeRegex(String(search).trim());
      query.$or = [
        { title: new RegExp(safeSearch, 'i') },
        { excerpt: new RegExp(safeSearch, 'i') },
        { content: new RegExp(safeSearch, 'i') }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [blogs, total] = await Promise.all([
      Blog.find(query)
        .select('-content -viewedBy')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Blog.countDocuments(query)
    ]);

    // Attach comment counts
    const ids = blogs.map((b) => b._id);
    const counts = await Comment.aggregate([
      { $match: { blog: {$in: ids }, status: 'Approved' } },
      { $group: { _id: '$blog', count: {$sum: 1 } } }
    ]);
    const countMap = counts.reduce((m, c) => ({ ...m, [c._id]: c.count }), {});

    const data = blogs.map((b) => ({
      ...b.toObject(),
      commentCount: countMap[b._id] || 0
    }));

    return res.status(200).json({
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
    console.error('Blog listing error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 3. GET BLOG CATEGORIES WITH COUNTS
// ============================================================================
router.get('/categories', async (req, res) => {
  try {
    const cats = await Blog.aggregate([
      { $match: { status: 'Published' } },
      { $group: { _id: '$category', count: { $sum: 1 } } }, {$sort: { count: -1 } }
    ]);
    return res.status(200).json({ success: true, data: cats });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 4. GET SINGLE BLOG BY SLUG OR ID (Unique View Tracking + Related + Comments)
// ============================================================================
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    // Slug match or ObjectID fallback
    const blog = await Blog.findOne({
      $or: [{ slug: slug }, { _id: slug.match(/^[0-9a-fA-F]{24}$/) ? slug : null }],
      status: 'Published'
    });

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }

    // Safe Unique View Tracking by IP
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    if (ip) {
      if (!Array.isArray(blog.viewedBy)) {
        blog.viewedBy = [];
      }
      if (!blog.viewedBy.includes(ip)) {
        blog.viewedBy.push(ip);
        blog.views = (blog.views || 0) + 1;
        await blog.save();
      }
    }

    // Fetch related articles
    const related = await Blog.find({
      status: 'Published',
      category: blog.category,
      _id: { $ne: blog._id }
    })
      .select('title slug category imageUrl createdAt')
      .limit(3)
      .sort({ createdAt: -1 });

    // Fetch approved comments
    const comments = await Comment.find({ blog: blog._id, status: 'Approved' })
      .select('-email -ipAddress')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: blog,
      related,
      comments
    });
  } catch (err) {
    console.error('Fetch blog detail error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;