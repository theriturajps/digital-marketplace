const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController');

// Home page
router.get('/', indexController.getHomePage);

// Search products
router.get('/search', indexController.searchProducts);

// Get products by category
router.get('/category/:slug', indexController.getProductsByCategory);

module.exports = router;