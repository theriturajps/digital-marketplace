const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Get product details
router.get('/:slug', productController.getProductDetails);

module.exports = router;