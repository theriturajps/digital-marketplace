const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');

// Get checkout page
router.get('/', checkoutController.getCheckout);

// Apply coupon
router.post('/apply-coupon', checkoutController.applyCoupon);

// Create order
router.post('/create-order', checkoutController.createOrder);

// Verify payment
router.post('/verify-payment', checkoutController.verifyPayment);

module.exports = router;