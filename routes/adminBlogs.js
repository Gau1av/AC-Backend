// backend/routes/adminBlogs.js
const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');

// Helper: Escape special regex characters to prevent ReDoS attacks
const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

// Helper: Build clean SEO-friendly slug
const buildSlug = (title) =>
  title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// Helper: Generate unique slug without blocking while loops
const getUniqueSlug = async (baseTitle, currentId = null) => {
  let baseSlug = buildSlug(baseTitle);
  if (!baseSlug) baseSlug = `post-${Date.now()}`;

  // Find existing slugs matching baseSlug or baseSlug-<number>
  const slugRegex = new RegExp(`^${baseSlug}(-[0-9]+)?$`, 'i');
  const existingBlogs = await Blog.find({
    slug: slugRegex,
    ...(currentId ? { _id: { $ne: currentId } } : {})
  }).select('slug');

  if (existingBlogs.length === 0) return baseSlug;

  const existingSlugs = new Set(existingBlogs.map((b) => b.slug));
  let count = 1;
  while (existingSlugs.has(`${baseSlug}-${count}`)) {
    count++;
  }
  return `${baseSlug}-${count}`;
};

// ==========================================
// 1. GET /api/admin/blogs
// ==========================================
router.get('/', async (req, res) => {
  try {
    const { search = '' } = req.query;
    let query = {};

    if (search.trim()) {
      const sanitizedSearch = escapeRegex(search.trim());
      const regex = new RegExp(sanitizedSearch, 'i');
      query = {
        $or: [
          { title: regex },
          { author: regex },
          { category: regex }
        ]
      };
    }

    const blogs = await Blog.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: blogs.length, data: blogs });
  } catch (err) {
    console.error('❌ GET admin blogs error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch blogs', error: err.message });
  }
});

// ==========================================
// 2. POST /api/admin/blogs
// ==========================================
router.post('/', async (req, res) => {
  try {
    const { title, author, content, category, excerpt, imageUrl, status, slug: customSlug } = req.body;

    if (!title || !author || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title, Author, and Content are required fields'
      });
    }

    // Unique slug generator
    const slug = await getUniqueSlug(customSlug || title);

    const blog = await Blog.create({
      title: title.trim(),
      slug,
      author: author.trim(),
      content,
      category: category || 'AC Repair',
      excerpt: excerpt ? excerpt.trim() : content.substring(0, 150).replace(/<[^>]*>?/gm, '') + '...',
      imageUrl: imageUrl || '',
      status: status || 'Draft'
    });

    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: blog
    });
  } catch (err) {
    console.error('❌ POST admin blog error:', err);
    res.status(500).json({ success: false, message: 'Failed to create blog', error: err.message });
  }
});

// ==========================================
// 3. PUT /api/admin/blogs/:id
// ==========================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existingBlog = await Blog.findById(id);

    if (!existingBlog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    const updatePayload = { ...req.body };

    // Regenerate unique slug only if custom slug or title has changed
    if (req.body.slug && req.body.slug !== existingBlog.slug) {
      updatePayload.slug = await getUniqueSlug(req.body.slug, id);
    } else if (req.body.title && !req.body.slug && req.body.title !== existingBlog.title) {
      updatePayload.slug = await getUniqueSlug(req.body.title, id);
    }

    const updatedBlog = await Blog.findByIdAndUpdate(id, updatePayload, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Blog updated successfully',
      data: updatedBlog
    });
  } catch (err) {
    console.error('❌ PUT admin blog error:', err);
    res.status(500).json({ success: false, message: 'Failed to update blog', error: err.message });
  }
});

// ==========================================
// 4. DELETE /api/admin/blogs/:id
// ==========================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findByIdAndDelete(id);

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    // Cascade delete associated comments
    try {
      const Comment = require('../models/Comment');
      await Comment.deleteMany({ blog: id });
    } catch (commentErr) {
      console.warn('⚠️ Comment model not linked or failed to delete comments:', commentErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Blog and associated comments deleted successfully'
    });
  } catch (err) {
    console.error('❌ DELETE admin blog error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete blog', error: err.message });
  }
});

module.exports = router;