const Order = require('../models/Order');
const Product = require('../models/Product');

// Get order lookup page
exports.getOrderLookup = (req, res) => {
  res.render('order-lookup', {
    title: 'Order Lookup | Digital Files Marketplace',
    error: null,
    success: null
  });
};

// Find order
exports.findOrder = async (req, res) => {
  try {
    const { email, phone, orderId, transactionId } = req.body;
    
    if (!email) {
      return res.render('order-lookup', {
        title: 'Order Lookup | Digital Files Marketplace',
        error: 'Email is required',
        success: null
      });
    }
    
    // Build query based on provided fields
    const query = {
      'customer.email': email
    };
    
    if (phone) {
      query['customer.phone'] = phone;
    }
    
    if (orderId) {
      query['orderNumber'] = orderId;
    }
    
    if (transactionId) {
      query['payment.transactionId'] = transactionId;
    }
    
    const orders = await Order.find(query)
      .populate({
        path: 'products.product',
        model: 'Product'
      })
      .sort({ createdAt: -1 });
    
    if (!orders || orders.length === 0) {
      return res.render('order-lookup', {
        title: 'Order Lookup | Digital Files Marketplace',
        error: 'No orders found with the provided information',
        success: null
      });
    }
    
    res.render('order-details', {
      title: 'Your Orders | Digital Files Marketplace',
      orders
    });
  } catch (err) {
    console.error('Order lookup error:', err);
    res.render('order-lookup', {
      title: 'Order Lookup | Digital Files Marketplace',
      error: 'An error occurred while looking up your order',
      success: null
    });
  }
};

// Get download page
exports.getDownload = async (req, res) => {
  try {
    const { orderId, productId, linkIndex } = req.params;
    
    if (!orderId || !productId || linkIndex === undefined) {
      return res.status(400).render('error', {
        title: 'Download Error',
        error: 'Invalid download request'
      });
    }
    
    const order = await Order.findOne({
      orderNumber: orderId,
      'products.product': productId
    }).populate({
      path: 'products.product',
      model: 'Product'
    });
    
    if (!order) {
      return res.status(404).render('error', {
        title: 'Download Error',
        error: 'Order not found'
      });
    }
    
    if (!order.isVerified) {
      return res.status(403).render('error', {
        title: 'Account Verification Required',
        error: 'Your account needs verification. Please contact us at iamriturajps@gmail.com or WhatsApp +91-8789679937'
      });
    }
    
    const linkObj = order.downloadLinks.find(link => 
      link.productId.toString() === productId && 
      link.link === order.downloadLinks[linkIndex].link
    );
    
    if (!linkObj) {
      return res.status(404).render('error', {
        title: 'Download Error',
        error: 'Download link not found'
      });
    }
    
    // Update download count
    linkObj.downloads += 1;
    linkObj.lastDownloaded = new Date();
    await order.save();
    
    // Redirect to the actual download link
    res.redirect(linkObj.link);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).render('error', {
      title: 'Download Error',
      error: 'An error occurred while processing your download'
    });
  }
};