// backend/models/Blog.js
const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Blog title is required'],
      trim: true,
      maxlength: [250, 'Title cannot exceed 250 characters']
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
      default: 'AC Repair',
      trim: true
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
      trim: true
    },
    content: {
      type: String,
      required: [true, 'Blog content is required']
    },
    imageUrl: {
      type: String,
      default: ''
    },
    galleryImages: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ['Draft', 'Pending', 'Published'],
      default: 'Draft',
      index: true
    },
    views: {
      type: Number,
      default: 0
    },
    viewedBy: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Slug auto-generation safe hook (No next parameter)
blogSchema.pre('save', function () {
  if (!this.slug && this.title) {
    const cleanTitle = this.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    this.slug = `${cleanTitle || 'story'}-${Date.now().toString().slice(-6)}`;
  }
});

module.exports = mongoose.model('Blog', blogSchema);