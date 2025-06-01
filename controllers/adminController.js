const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const Setting = require('../models/Setting');

// Helper function to set session messages
const setMessage = (req, type, message) => {
  if (!req.session.messages) {
    req.session.messages = {};
  }
  req.session.messages[type] = message;
};

// Helper function to get and clear session messages
const getMessage = (req, type) => {
  if (req.session.messages && req.session.messages[type]) {
    const message = req.session.messages[type];
    delete req.session.messages[type];
    return message;
  }
  return null;
};

// Admin login page
exports.getLogin = (req, res) => {
  res.render('admin/login', {
    title: 'Admin Login',
    error: getMessage(req, 'error')
  });
};

// Admin login process
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.render('admin/login', {
        title: 'Admin Login',
        error: 'Username and password are required'
      });
    }

    // Find admin user
    const admin = await Admin.findOne({
      $or: [
        { username: username },
        { email: username }
      ],
      isActive: true
    });

    if (!admin) {
      return res.render('admin/login', {
        title: 'Admin Login',
        error: 'Invalid credentials'
      });
    }

    // Verify password
    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      return res.render('admin/login', {
        title: 'Admin Login',
        error: 'Invalid credentials'
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET || 'your-jwt-secret',
      { expiresIn: '24h' }
    );

    // Update last login timestamp
    admin.lastLogin = new Date();
    await admin.save();

    // Set token as cookie
    res.cookie('adminToken', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error('Admin login error:', err);
    res.render('admin/login', {
      title: 'Admin Login',
      error: 'An error occurred during login'
    });
  }
};

// Admin logout
exports.logout = (req, res) => {
  res.clearCookie('adminToken');
  res.redirect('/admin/login');
};

// Admin dashboard
exports.getDashboard = async (req, res) => {
  try {
    // Get counts and revenue stats
    const totalProductsQuery = Product.countDocuments();
    const totalCategoriesQuery = Category.countDocuments();
    const totalOrdersQuery = Order.countDocuments();
    const totalRevenueQuery = Order.aggregate([
      { $match: { 'payment.status': 'completed' } },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } }
    ]);

    // Recent orders
    const recentOrdersQuery = Order.find()
      .populate({
        path: 'products.product',
        select: 'title'
      })
      .sort({ createdAt: -1 })
      .limit(5);

    // Top selling products
    const topProductsQuery = Order.aggregate([
      { $unwind: '$products' },
      {
        $group: {
          _id: '$products.product',
          count: { $sum: 1 },
          revenue: { $sum: '$products.price' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Execute all queries in parallel
    const [
      totalProducts,
      totalCategories,
      totalOrders,
      recentOrders,
      topProductsAgg,
      revenueAgg
    ] = await Promise.all([
      totalProductsQuery,
      totalCategoriesQuery,
      totalOrdersQuery,
      recentOrdersQuery,
      topProductsQuery,
      totalRevenueQuery
    ]);

    // Get product details for top products
    let topProducts = [];

    if (topProductsAgg.length > 0) {
      const productIds = topProductsAgg.map(item => item._id);
      const products = await Product.find({ _id: { $in: productIds } });

      topProducts = topProductsAgg.map(item => {
        const productInfo = products.find(p => p._id.toString() === item._id.toString());
        return {
          product: productInfo,
          count: item.count,
          revenue: item.revenue
        };
      });
    }

    // Calculate total revenue
    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      admin: req.admin,
      stats: {
        totalProducts,
        totalCategories,
        totalOrders,
        totalRevenue
      },
      recentOrders,
      topProducts,
      success: getMessage(req, 'success'),
      error: getMessage(req, 'error')
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).render('admin/error', {
      title: 'Dashboard Error',
      error: 'An error occurred while loading the dashboard'
    });
  }
};

// Product management
exports.getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const searchTerm = req.query.search || '';
    let query = {};

    if (searchTerm) {
      query = {
        $or: [
          { title: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } }
        ]
      };
    }

    const productsQuery = Product.find(query)
      .populate('category')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const countQuery = Product.countDocuments(query);

    const [products, totalProducts] = await Promise.all([
      productsQuery,
      countQuery
    ]);

    const totalPages = Math.ceil(totalProducts / limit);

    res.render('admin/products', {
      title: 'Manage Products',
      admin: req.admin,
      products,
      currentPage: page,
      totalPages,
      totalProducts,
      searchTerm,
      success: getMessage(req, 'success'),
      error: getMessage(req, 'error')
    });
  } catch (err) {
    console.error('Admin products error:', err);
    res.status(500).render('admin/error', {
      title: 'Products Error',
      error: 'An error occurred while loading products'
    });
  }
};

// New product form
exports.getNewProduct = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true });

    res.render('admin/product-form', {
      title: 'Add New Product',
      admin: req.admin,
      product: null,
      categories,
      errors: null
    });
  } catch (err) {
    console.error('New product form error:', err);
    res.status(500).render('admin/error', {
      title: 'Error',
      error: 'An error occurred while loading the product form'
    });
  }
};

// Create new product
exports.createProduct = async (req, res) => {
  try {
    const {
      title,
      slug,
      description,
      price,
      discountPrice,
      category,
      fileType,
      fileSize,
      image,
      downloadLinks,
      featured,
      metaTitle,
      metaDescription,
      metaKeywords
    } = req.body;

    // Basic validation
    if (!title || !slug || !description || !price || !category || !fileType || !fileSize || !image) {
      const categories = await Category.find({ isActive: true });

      return res.render('admin/product-form', {
        title: 'Add New Product',
        admin: req.admin,
        product: req.body,
        categories,
        errors: 'Please fill in all required fields'
      });
    }

    // Create links array from comma-separated string
    const linksArray = downloadLinks.split(',').map(link => link.trim());

    // Create new product
    const product = new Product({
      title,
      slug,
      description,
      price,
      discountPrice: discountPrice || price,
      category,
      fileType,
      fileSize,
      image,
      downloadLinks: linksArray,
      featured: featured === 'on',
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || description.substring(0, 160),
      metaKeywords: metaKeywords || ''
    });

    await product.save();

    setMessage(req, 'success', 'Product created successfully');
    res.redirect('/admin/products');
  } catch (err) {
    console.error('Create product error:', err);

    // Check for duplicate slug error
    if (err.code === 11000 && err.keyPattern && err.keyPattern.slug) {
      const categories = await Category.find({ isActive: true });

      return res.render('admin/product-form', {
        title: 'Add New Product',
        admin: req.admin,
        product: req.body,
        categories,
        errors: 'Product slug already exists, please use a different one'
      });
    }

    res.status(500).render('admin/error', {
      title: 'Error',
      error: 'An error occurred while creating the product'
    });
  }
};

// Edit product form
exports.getEditProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const [product, categories] = await Promise.all([
      Product.findById(productId),
      Category.find({ isActive: true })
    ]);

    if (!product) {
      setMessage(req, 'error', 'Product not found');
      return res.redirect('/admin/products');
    }

    res.render('admin/product-form', {
      title: 'Edit Product',
      admin: req.admin,
      product,
      categories,
      errors: null
    });
  } catch (err) {
    console.error('Edit product form error:', err);
    res.status(500).render('admin/error', {
      title: 'Error',
      error: 'An error occurred while loading the product form'
    });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const {
      title,
      slug,
      description,
      price,
      discountPrice,
      category,
      fileType,
      fileSize,
      image,
      downloadLinks,
      featured,
      isActive,
      metaTitle,
      metaDescription,
      metaKeywords
    } = req.body;

    // Basic validation
    if (!title || !slug || !description || !price || !category || !fileType || !fileSize || !image) {
      const categories = await Category.find({ isActive: true });

      return res.render('admin/product-form', {
        title: 'Edit Product',
        admin: req.admin,
        product: { _id: productId, ...req.body },
        categories,
        errors: 'Please fill in all required fields'
      });
    }

    // Create links array from comma-separated string
    const linksArray = downloadLinks.split(',').map(link => link.trim());

    // Update product
    const product = await Product.findByIdAndUpdate(
      productId,
      {
        title,
        slug,
        description,
        price,
        discountPrice: discountPrice || price,
        category,
        fileType,
        fileSize,
        image,
        downloadLinks: linksArray,
        featured: featured === 'on',
        isActive: isActive === 'on',
        metaTitle: metaTitle || title,
        metaDescription: metaDescription || description.substring(0, 160),
        metaKeywords: metaKeywords || ''
      },
      { new: true, runValidators: true }
    );

    if (!product) {
      setMessage(req, 'error', 'Product not found');
      return res.redirect('/admin/products');
    }

    setMessage(req, 'success', 'Product updated successfully');
    res.redirect('/admin/products');
  } catch (err) {
    console.error('Update product error:', err);

    // Check for duplicate slug error
    if (err.code === 11000 && err.keyPattern && err.keyPattern.slug) {
      const categories = await Category.find({ isActive: true });

      return res.render('admin/product-form', {
        title: 'Edit Product',
        admin: req.admin,
        product: { _id: req.params.id, ...req.body },
        categories,
        errors: 'Product slug already exists, please use a different one'
      });
    }

    res.status(500).render('admin/error', {
      title: 'Error',
      error: 'An error occurred while updating the product'
    });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findByIdAndDelete(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting the product'
    });
  }
};

// Category management
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });

    res.render('admin/categories', {
      title: 'Manage Categories',
      admin: req.admin,
      categories,
      success: getMessage(req, 'success'),
      error: getMessage(req, 'error')
    });
  } catch (err) {
    console.error('Admin categories error:', err);
    res.status(500).render('admin/error', {
      title: 'Categories Error',
      error: 'An error occurred while loading categories'
    });
  }
};

// Create category
exports.createCategory = async (req, res) => {
  try {
    const { name, slug, description } = req.body;

    if (!name || !slug) {
      setMessage(req, 'error', 'Name and slug are required');
      return res.redirect('/admin/categories');
    }

    const category = new Category({
      name,
      slug,
      description: description || '',
      isActive: true
    });

    await category.save();

    setMessage(req, 'success', 'Category created successfully');
    res.redirect('/admin/categories');
  } catch (err) {
    console.error('Create category error:', err);

    if (err.code === 11000 && err.keyPattern && err.keyPattern.slug) {
      setMessage(req, 'error', 'Category slug already exists');
    } else {
      setMessage(req, 'error', 'An error occurred while creating the category');
    }

    res.redirect('/admin/categories');
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const { id, name, slug, description, isActive } = req.body;

    if (!id || !name || !slug) {
      return res.status(400).json({
        success: false,
        message: 'ID, name, and slug are required'
      });
    }

    const category = await Category.findByIdAndUpdate(
      id,
      {
        name,
        slug,
        description: description || '',
        isActive: isActive === 'on' || isActive === true
      },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category updated successfully',
      category
    });
  } catch (err) {
    console.error('Update category error:', err);

    let errorMessage = 'An error occurred while updating the category';

    if (err.code === 11000 && err.keyPattern && err.keyPattern.slug) {
      errorMessage = 'Category slug already exists';
    }

    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Check if category is used in any products
    const productCount = await Product.countDocuments({ category: categoryId });

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It is used by ${productCount} products.`
      });
    }

    const category = await Category.findByIdAndDelete(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting the category'
    });
  }
};

// Order management
exports.getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const searchTerm = req.query.search || '';
    let query = {};

    if (searchTerm) {
      query = {
        $or: [
          { orderNumber: { $regex: searchTerm, $options: 'i' } },
          { 'customer.email': { $regex: searchTerm, $options: 'i' } },
          { 'customer.phone': { $regex: searchTerm, $options: 'i' } },
          { 'payment.transactionId': { $regex: searchTerm, $options: 'i' } },
          { 'payment.razorpayPaymentId': { $regex: searchTerm, $options: 'i' } }
        ]
      };
    }

    const ordersQuery = Order.find(query)
      .populate({
        path: 'products.product',
        select: 'title'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const countQuery = Order.countDocuments(query);

    const [orders, totalOrders] = await Promise.all([
      ordersQuery,
      countQuery
    ]);

    const totalPages = Math.ceil(totalOrders / limit);

    res.render('admin/orders', {
      title: 'Manage Orders',
      admin: req.admin,
      orders,
      currentPage: page,
      totalPages,
      totalOrders,
      searchTerm,
      success: getMessage(req, 'success'),
      error: getMessage(req, 'error')
    });
  } catch (err) {
    console.error('Admin orders error:', err);
    res.status(500).render('admin/error', {
      title: 'Orders Error',
      error: 'An error occurred while loading orders'
    });
  }
};

// View order details
exports.getOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findById(orderId)
      .populate({
        path: 'products.product',
        model: 'Product'
      })
      .populate('couponUsed');

    if (!order) {
      setMessage(req, 'error', 'Order not found');
      return res.redirect('/admin/orders');
    }

    res.render('admin/order-details', {
      title: `Order #${order.orderNumber}`,
      admin: req.admin,
      order
    });
  } catch (err) {
    console.error('Order details error:', err);
    res.status(500).render('admin/error', {
      title: 'Order Details Error',
      error: 'An error occurred while loading order details'
    });
  }
};

// Update order verification status
exports.updateOrderVerification = async (req, res) => {
  try {
    const { id, isVerified } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { isVerified: isVerified === 'true' || isVerified === true },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: `Order ${isVerified ? 'verified' : 'unverified'} successfully`
    });
  } catch (err) {
    console.error('Update order verification error:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating order verification status'
    });
  }
};

// Coupon management
exports.getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });

    res.render('admin/coupons', {
      title: 'Manage Coupons',
      admin: req.admin,
      coupons,
      success: getMessage(req, 'success'),
      error: getMessage(req, 'error')
    });
  } catch (err) {
    console.error('Admin coupons error:', err);
    res.status(500).render('admin/error', {
      title: 'Coupons Error',
      error: 'An error occurred while loading coupons'
    });
  }
};

// Create coupon
exports.createCoupon = async (req, res) => {
  try {
    const {
      code,
      type,
      value,
      minPurchase,
      maxDiscount,
      startDate,
      endDate,
      usageLimit
    } = req.body;

    if (!code || !type || !value || !startDate || !endDate) {
      setMessage(req, 'error', 'All required fields must be filled');
      return res.redirect('/admin/coupons');
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      type,
      value: parseFloat(value),
      minPurchase: parseFloat(minPurchase) || 0,
      maxDiscount: type === 'percentage' ? parseFloat(maxDiscount) || 0 : undefined,
      startDate,
      endDate,
      usageLimit: parseInt(usageLimit) || 0,
      isActive: true
    });

    await coupon.save();

    setMessage(req, 'success', 'Coupon created successfully');
    res.redirect('/admin/coupons');
  } catch (err) {
    console.error('Create coupon error:', err);

    if (err.code === 11000 && err.keyPattern && err.keyPattern.code) {
      setMessage(req, 'error', 'Coupon code already exists');
    } else {
      setMessage(req, 'error', 'An error occurred while creating the coupon');
    }

    res.redirect('/admin/coupons');
  }
};

// Update coupon
exports.updateCoupon = async (req, res) => {
  try {
    const {
      id,
      code,
      type,
      value,
      minPurchase,
      maxDiscount,
      startDate,
      endDate,
      usageLimit,
      isActive
    } = req.body;

    if (!id || !code || !type || !value || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be filled'
      });
    }

    const coupon = await Coupon.findByIdAndUpdate(
      id,
      {
        code: code.toUpperCase(),
        type,
        value: parseFloat(value),
        minPurchase: parseFloat(minPurchase) || 0,
        maxDiscount: type === 'percentage' ? parseFloat(maxDiscount) || 0 : undefined,
        startDate,
        endDate,
        usageLimit: parseInt(usageLimit) || 0,
        isActive: isActive === 'on' || isActive === true
      },
      { new: true, runValidators: true }
    );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.json({
      success: true,
      message: 'Coupon updated successfully',
      coupon
    });
  } catch (err) {
    console.error('Update coupon error:', err);

    let errorMessage = 'An error occurred while updating the coupon';

    if (err.code === 11000 && err.keyPattern && err.keyPattern.code) {
      errorMessage = 'Coupon code already exists';
    }

    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
};

// Delete coupon
exports.deleteCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;

    const coupon = await Coupon.findByIdAndDelete(couponId);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (err) {
    console.error('Delete coupon error:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting the coupon'
    });
  }
};

// Site settings
exports.getSettings = async (req, res) => {
  try {
    const homeNotification = await Setting.findOne({ key: 'homeNotification' });

    res.render('admin/settings', {
      title: 'Site Settings',
      admin: req.admin,
      settings: {
        homeNotification: homeNotification ? homeNotification.value : ''
      },
      success: getMessage(req, 'success'),
      error: getMessage(req, 'error')
    });
  } catch (err) {
    console.error('Admin settings error:', err);
    res.status(500).render('admin/error', {
      title: 'Settings Error',
      error: 'An error occurred while loading settings'
    });
  }
};

// Update settings
exports.updateSettings = async (req, res) => {
  try {
    const { homeNotification } = req.body;

    // Update home notification
    await Setting.findOneAndUpdate(
      { key: 'homeNotification' },
      {
        key: 'homeNotification',
        value: homeNotification,
        description: 'Notification message displayed on homepage'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    setMessage(req, 'success', 'Settings updated successfully');
    res.redirect('/admin/settings');
  } catch (err) {
    console.error('Update settings error:', err);
    setMessage(req, 'error', 'An error occurred while updating settings');
    res.redirect('/admin/settings');
  }
};