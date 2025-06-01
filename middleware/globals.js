const Setting = require('../models/Setting');
const Category = require('../models/Category');

// Helper function to get and clear session messages
const getMessage = (req, type) => {
  if (req.session && req.session.messages && req.session.messages[type]) {
    const message = req.session.messages[type];
    delete req.session.messages[type];
    return message;
  }
  return null;
};

// Middleware to attach global variables to res.locals
module.exports = async (req, res, next) => {
  try {
    // Session-based messages (alternative to flash messages)
    res.locals.success = getMessage(req, 'success');
    res.locals.error = getMessage(req, 'error');
    
    // Global site settings
    const homeNotification = await Setting.findOne({ key: 'homeNotification' });
    res.locals.homeNotification = homeNotification ? homeNotification.value : null;
    
    // Add global categories for header
    const categories = await Category.find({ isActive: true }).limit(8);
    res.locals.globalCategories = categories;
    
    // Current URL for active menu items
    res.locals.currentUrl = req.originalUrl;
    
    // Pass to next middleware
    next();
  } catch (err) {
    console.error('Globals middleware error:', err);
    next();
  }
};