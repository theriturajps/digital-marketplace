const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');

// Admin login
router.get('/login', adminController.getLogin);
router.post('/login', adminController.login);

// Admin logout
router.get('/logout', adminController.logout);

// Protected admin routes
router.use(authMiddleware.isAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboard);
router.get('/', (req, res) => res.redirect('/admin/dashboard'));

// Product management
router.get('/products', adminController.getProducts);
router.get('/products/new', adminController.getNewProduct);
router.post('/products', adminController.createProduct);
router.get('/products/edit/:id', adminController.getEditProduct);
router.post('/products/edit/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

// Category management
router.get('/categories', adminController.getCategories);
router.post('/categories', adminController.createCategory);
router.put('/categories', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// Order management
router.get('/orders', adminController.getOrders);
router.get('/orders/:id', adminController.getOrderDetails);
router.put('/orders/verify', adminController.updateOrderVerification);

// Coupon management
router.get('/coupons', adminController.getCoupons);
router.post('/coupons', adminController.createCoupon);
router.put('/coupons', adminController.updateCoupon);
router.delete('/coupons/:id', adminController.deleteCoupon);

// Site settings
router.get('/settings', adminController.getSettings);
router.post('/settings', adminController.updateSettings);

module.exports = router;