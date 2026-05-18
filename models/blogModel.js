const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'A blog post must have a title'],
    trim: true,
    maxlength: [150, 'A blog title must have less than or equal to 150 characters'],
    minlength: [5, 'A blog title must have more than or equal to 5 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    index: true
  },
  content: {
    type: String,
    required: [true, 'A blog post must have content']
  },
  seoDescription: {
    type: String,
    required: [true, 'A blog post must have an SEO description'],
    maxlength: [160, 'SEO description must be less than 160 characters']
  },
  image: {
    type: String,
    required: [true, 'A blog post must have a main image']
  },
  category: {
    type: String,
    required: [true, 'A blog post must have a category'],
    default: 'E-Commerce'
  },
  author: {
    type: String,
    required: [true, 'A blog post must have an author'],
    default: 'ShopHub Admin'
  },
  readTime: {
    type: String,
    default: '5 min read'
  },
  tags: [{
    type: String,
    trim: true
  }],
  linkedProduct: {
    type: mongoose.Schema.ObjectId,
    ref: 'Product'
  },
  isPublished: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// DOCUMENT MIDDLEWARE: runs before .save() and .create()
blogSchema.pre('save', async function () {
  if (!this.isModified('title') && !this.isModified('slug') && !this.isNew) return;

  const baseString = this.slug || this.title;
  if (!baseString) return;
  
  let slugBase = baseString.toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const Blog = this.constructor;
  let slug = slugBase;
  let exists = await Blog.findOne({ slug, _id: { $ne: this._id } });
  
  if (exists) {
    const shortId = Math.random().toString(36).substring(2, 7);
    slug = `${slugBase}-${shortId}`;
  }

  this.slug = slug;
});

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;
