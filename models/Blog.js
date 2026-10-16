// backend/models/Blog.js
const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Blog title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    category: {
      type: String,
      required: true,
      default: 'AC Repair',
      trim: true,
      enum: [
        'AC Repair',
        'Refrigerator',
        'Washing Machine',
        'Microwave',
        'Preventive Maintenance',
        'Tips & Tricks',
        'News',
        'Other'
      ]
    },
    author: {
      type: String,
      required: [true, 'Author name is required'],
      default: 'Chintu AC Tech Team',
      trim: true
    },
    excerpt: {
      type: String,
      default: '',
      trim: true,
      maxlength: [300, 'Excerpt cannot exceed 300 characters']
    },
    content: {
      type: String,
      required: [true, 'Blog content is required']
    },
    imageUrl: {
      type: String,
      default: '' // Supports local upload URL, Cloudinary, or Base64 Data URI
    },
    status: {
      type: String,
      enum: ['Draft', 'Published'],
      default: 'Draft',
      index: true
    },
    views: {
      type: Number,
      default: 0,
      min: 0
    },
    // SEO & Meta Fields
    metaTitle: {
      type: String,
      default: '',
      trim: true
    },
    metaDescription: {
      type: String,
      default: '',
      trim: true
    },
    tags: [
      {
        type: String,
        trim: true
      }
    ]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual field: Reading time estimate (approx 200 words per minute)
blogSchema.virtual('readingTime').get(function () {
  if (!this.content) return '1 min read';
  const cleanText = this.content.replace(/<[^>]*>?/gm, '');
  const wordsCount = cleanText.split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(wordsCount / 200) || 1;
  return `${minutes} min read`;
});

// Pre-save middleware: Auto slug & excerpt generation
blogSchema.pre('save', function (next) {
  // 1. Auto generate slug if missing
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // 2. Auto generate excerpt from content if missing
  if (!this.excerpt && this.content) {
    const plainText = this.content.replace(/<[^>]*>?/gm, '').trim();
    this.excerpt = plainText.length > 160 ? plainText.substring(0, 157) + '...' : plainText;
  }

  // 3. Auto metaTitle fallback
  if (!this.metaTitle && this.title) {
    this.metaTitle = this.title;
  }

  next();
});

// Indexing:
// High performance search index
blogSchema.index({ title: 'text', author: 'text', category: 'text' });
// Fast sorting for Home page queries
blogSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Blog', blogSchema);