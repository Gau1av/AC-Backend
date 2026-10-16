const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: String, default: 'AC Repair' },
    author: { type: String, default: 'Chintu AC Tech Team' },
    excerpt: { type: String, default: '' },
    content: { type: String, required: true },
    imageUrl: { type: String, default: '' },
    status: { type: String, enum: ['Draft', 'Published'], default: 'Draft' },
    views: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Blog', blogSchema);