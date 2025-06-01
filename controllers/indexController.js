const Product = require('../models/Product');
const Category = require('../models/Category');
const Setting = require('../models/Setting');

// Get home page
exports.getHomePage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;
    
    // Get products
    const productsQuery = Product.find({ isActive: true })
      .populate('category')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get categories for horizontal slider
    const categoriesQuery = Category.find({ isActive: true });
    
    // Get featured products
    const featuredProductsQuery = Product.find({ 
      isActive: true, 
      featured: true 
    })
    .populate('category')
    .limit(4);
    
    // Get notification from settings
    const notificationQuery = Setting.findOne({ key: 'homeNotification' });
    
    // Get total count for pagination
    const countQuery = Product.countDocuments({ isActive: true });
    
    // Execute all queries in parallel
    const [products, categories, featuredProducts, notification, totalProducts] = await Promise.all([
      productsQuery,
      categoriesQuery,
      featuredProductsQuery,
      notificationQuery,
      countQuery
    ]);
    
    const totalPages = Math.ceil(totalProducts / limit);
    
    res.render('index', {
      title: 'Digital Files Marketplace',
      products,
      categories,
      featuredProducts,
      notification: notification ? notification.value : null,
      currentPage: page,
      totalPages,
      totalProducts
    });
  } catch (err) {
    console.error('Home page error:', err);
    res.status(500).render('error', { 
      title: 'Error',
      error: 'An error occurred while loading the homepage'
    });
  }
};

// Search products
exports.searchProducts = async (req, res) => {
  try {
    const searchTerm = req.query.q || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;
    
    if (!searchTerm.trim()) {
      return res.redirect('/');
    }
    
    const searchQuery = {
      $or: [
        { title: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } }
      ],
      isActive: true
    };
    
    const productsQuery = Product.find(searchQuery)
      .populate('category')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const categoriesQuery = Category.find({ isActive: true });
    const countQuery = Product.countDocuments(searchQuery);
    
    const [products, categories, totalProducts] = await Promise.all([
      productsQuery,
      categoriesQuery,
      countQuery
    ]);
    
    const totalPages = Math.ceil(totalProducts / limit);
    
    res.render('search', {
      title: `Search Results for "${searchTerm}" | Digital Files Marketplace`,
      products,
      categories,
      searchTerm,
      currentPage: page,
      totalPages,
      totalProducts
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).render('error', { 
      title: 'Search Error',
      error: 'An error occurred while searching for products'
    });
  }
};

// Get products by category
exports.getProductsByCategory = async (req, res) => {
  try {
    const categorySlug = req.params.slug;
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;
    
    const category = await Category.findOne({ slug: categorySlug, isActive: true });
    
    if (!category) {
      return res.status(404).render('404', { 
        title: 'Category Not Found',
        currentUrl: req.originalUrl
      });
    }
    
    const productsQuery = Product.find({ 
      category: category._id,
      isActive: true 
    })
    .populate('category')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
    
    const categoriesQuery = Category.find({ isActive: true });
    const countQuery = Product.countDocuments({ 
      category: category._id,
      isActive: true 
    });
    
    const [products, categories, totalProducts] = await Promise.all([
      productsQuery,
      categoriesQuery,
      countQuery
    ]);
    
    const totalPages = Math.ceil(totalProducts / limit);
    
    res.render('category', {
      title: `${category.name} | Digital Files Marketplace`,
      products,
      categories,
      category,
      currentPage: page,
      totalPages,
      totalProducts
    });
  } catch (err) {
    console.error('Category page error:', err);
    res.status(500).render('error', { 
      title: 'Error',
      error: 'An error occurred while loading the category page'
    });
  }
};