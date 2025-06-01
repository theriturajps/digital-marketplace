const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  discountPrice: {
    type: Number,
    min: 0
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  downloadLinks: [{
    type: String,
    required: true
  }],
  fileType: {
    type: String,
    enum: ['pdf', 'zip', 'other'],
    required: true
  },
  fileSize: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metaTitle: {
    type: String,
    trim: true
  },
  metaDescription: {
    type: String,
    trim: true
  },
  metaKeywords: {
    type: String,
    trim: true
  }
}, { timestamps: true });

// Add indexes for search
productSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);