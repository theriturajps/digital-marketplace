const Razorpay = require('razorpay');
const crypto = require('crypto');
const shortid = require('shortid');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const emailService = require('../utils/emailService');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Get checkout page
exports.getCheckout = async (req, res) => {
  try {
    const productId = req.query.product;
    
    if (!productId) {
      return res.redirect('/');
    }
    
    const product = await Product.findOne({ 
      _id: productId,
      isActive: true
    }).populate('category');
    
    if (!product) {
      return res.status(404).render('404', { 
        title: 'Product Not Found',
        currentUrl: req.originalUrl
      });
    }
    
    res.render('checkout', {
      title: 'Checkout | Digital Files Marketplace',
      product,
      couponApplied: null,
      couponCode: '',
      couponDiscount: 0,
      originalPrice: product.price,
      finalPrice: product.discountPrice || product.price,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).render('error', { 
      title: 'Checkout Error',
      error: 'An error occurred during checkout'
    });
  }
};

// Apply coupon
exports.applyCoupon = async (req, res) => {
  try {
    const { couponCode, productId } = req.body;

    if (!couponCode || !productId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request'
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const productPrice = product.discountPrice || product.price;

    // Find valid coupon - using aggregation pipeline to properly compare fields
    const coupons = await Coupon.aggregate([
      {
        $match: {
          code: couponCode.toUpperCase(),
          isActive: true,
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() }
        }
      },
      {
        $match: {
          $or: [
            { usageLimit: 0 }, // Unlimited usage
            { $expr: { $lt: ["$usedCount", "$usageLimit"] } } // Used count less than limit
          ]
        }
      }
    ]);

    const coupon = coupons[0]; // Get the first matching coupon

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired coupon code'
      });
    }

    // Check minimum purchase requirement
    if (productPrice < coupon.minPurchase) {
      return res.status(400).json({
        success: false,
        message: `Minimum purchase of ₹${coupon.minPurchase} required`
      });
    }

    // Calculate discount
    let discountAmount = 0;

    if (coupon.type === 'percentage') {
      discountAmount = (productPrice * coupon.value) / 100;

      // Apply max discount if set
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else {
      // Fixed amount discount
      discountAmount = coupon.value;

      // Ensure discount doesn't exceed product price
      if (discountAmount > productPrice) {
        discountAmount = productPrice;
      }
    }

    const finalPrice = productPrice - discountAmount;

    return res.json({
      success: true,
      coupon: {
        code: coupon.code,
        discount: discountAmount,
        finalPrice: finalPrice
      }
    });
  } catch (err) {
    console.error('Apply coupon error:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while applying the coupon'
    });
  }
};

// Create Razorpay order
exports.createOrder = async (req, res) => {
  try {
    const { productId, email, phone, couponCode } = req.body;

    if (!productId || !email) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and email are required'
      });
    }

    const product = await Product.findOne({
      _id: productId,
      isActive: true
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    let productPrice = product.discountPrice || product.price;
    let discountAmount = 0;
    let couponUsed = null;

    // Apply coupon if provided
    if (couponCode) {
      // Use aggregation pipeline to properly compare fields
      const coupons = await Coupon.aggregate([
        {
          $match: {
            code: couponCode.toUpperCase(),
            isActive: true,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
          }
        },
        {
          $match: {
            $or: [
              { usageLimit: 0 }, // Unlimited usage
              { $expr: { $lt: ["$usedCount", "$usageLimit"] } } // Used count less than limit
            ]
          }
        }
      ]);

      const coupon = coupons[0]; // Get the first matching coupon

      if (coupon && productPrice >= coupon.minPurchase) {
        if (coupon.type === 'percentage') {
          discountAmount = (productPrice * coupon.value) / 100;

          if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
            discountAmount = coupon.maxDiscount;
          }
        } else {
          discountAmount = coupon.value;

          if (discountAmount > productPrice) {
            discountAmount = productPrice;
          }
        }

        couponUsed = coupon._id;
      }
    }

    const finalAmount = productPrice - discountAmount;

    // Create Razorpay order
    const amount = Math.round(finalAmount * 100); // Convert to paise
    const currency = 'INR';
    const receiptId = shortid.generate();

    const razorpayOrder = await razorpay.orders.create({
      amount,
      currency,
      receipt: receiptId
    });

    if (!razorpayOrder) {
      return res.status(500).json({
        success: false,
        message: 'Error creating payment order'
      });
    }

    res.json({
      success: true,
      order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency
      },
      product: {
        id: product._id,
        name: product.title,
        price: productPrice
      },
      discount: discountAmount,
      finalAmount
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while creating the order'
    });
  }
};

// Verify payment and complete order
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      productId,
      email,
      phone,
      couponCode
    } = req.body;
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
    
    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }
    
    // Get product details
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    let productPrice = product.discountPrice || product.price;
    let discountAmount = 0;
    let couponUsed = null;
    
    // Apply coupon if provided
    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase()
      });
      
      if (coupon) {
        if (coupon.type === 'percentage') {
          discountAmount = (productPrice * coupon.value) / 100;
          
          if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
            discountAmount = coupon.maxDiscount;
          }
        } else {
          discountAmount = coupon.value;
          
          if (discountAmount > productPrice) {
            discountAmount = productPrice;
          }
        }
        
        couponUsed = coupon._id;
        
        // Update coupon usage count
        await Coupon.findByIdAndUpdate(coupon._id, {
          $inc: { usedCount: 1 }
        });
      }
    }
    
    const finalAmount = productPrice - discountAmount;
    
    // Create order record
    const orderNumber = `ORD-${Date.now()}-${shortid.generate()}`;
    
    const order = new Order({
      orderNumber,
      customer: {
        email,
        phone: phone || ''
      },
      products: [{
        product: product._id,
        price: productPrice
      }],
      totalAmount: productPrice,
      discountAmount,
      finalAmount,
      couponUsed,
      payment: {
        transactionId: orderNumber,
        razorpayOrderId,
        razorpayPaymentId,
        status: 'completed'
      },
      status: 'completed',
      downloadLinks: product.downloadLinks.map(link => ({
        link,
        productId: product._id,
        downloads: 0
      })),
      isVerified: true
    });
    
    await order.save();
    
    // Send email with download links
    await emailService.sendOrderConfirmation(
      email,
      order,
      product
    );
    
    res.json({
      success: true,
      message: 'Payment successful',
      orderId: order.orderNumber
    });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while verifying the payment'
    });
  }
};