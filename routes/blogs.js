const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const Comment = require('../models/Comment');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// 1. Public Blog Submission
router.post('/submit', async (req, res) => {
  try {
    const { title, author, category, excerpt, content, imageUrl, galleryImages } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Blog title is required.' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Blog content is required.' });
    }

    const cleanTitle = title.trim();
    const slugBase = cleanTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'community-blog';

    const safeSlug = `${slugBase}-${Date.now().toString().slice(-5)}`;

    const newBlog = new Blog({
      title: cleanTitle,
      slug: safeSlug,
      author: (author && author.trim()) || 'Community Contributor',
      category: category || 'AC Repair',
      excerpt: (excerpt && excerpt.trim()) || (cleanTitle.slice(0, 150) + '...'),
      content: content.trim(),
      imageUrl: imageUrl || '',
      galleryImages: Array.isArray(galleryImages) ? galleryImages.filter(Boolean).slice(0, 2) : [],
      status: 'Draft'
    });

    await newBlog.save();

    return res.status(201).json({
      success: true,
      message: 'Blog submitted successfully and awaiting admin approval.',
      data: { id: newBlog._id, slug: newBlog.slug }
    });
  } catch (err) {
    console.error('❌ Blog Submission Error:', err);
    return res.status(400).json({
      success: false,
      message: err.message || 'Validation error while saving blog.'
    });
  }
});

// 2. GET Published Blogs
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 9, category, search } = req.query;
    const query = { status: 'Published' };

    if (category && category !== 'All') query.category = category;
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

// 3. GET Single Blog by Slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const blog = await Blog.findOne({
      $or: [{ slug: slug }, { _id: slug.match(/^[0-9a-fA-F]{24}$/) ? slug : null }],
      status: 'Published'
    });

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }

    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    if (ip) {
      if (!Array.isArray(blog.viewedBy)) blog.viewedBy = [];
      if (!blog.viewedBy.includes(ip)) {
        blog.viewedBy.push(ip);
        blog.views = (blog.views || 0) + 1;
        await blog.save();
      }
    }

    const related = await Blog.find({
      status: 'Published',
      category: blog.category,
      _id: { $ne: blog._id }
    })
      .select('title slug category imageUrl createdAt')
      .limit(3)
      .sort({ createdAt: -1 });

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