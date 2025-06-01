const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Get order lookup page
router.get('/lookup', orderController.getOrderLookup);

// Find order
router.post('/lookup', orderController.findOrder);

// Get download page
router.get('/download/:orderId/:productId/:linkIndex', orderController.getDownload);

module.exports = router;