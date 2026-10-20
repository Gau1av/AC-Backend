// backend/routes/blogs.js
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