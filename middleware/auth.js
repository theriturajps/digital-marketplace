const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Check if admin is logged in
exports.isAdmin = async (req, res, next) => {
  try {
    const token = req.cookies.adminToken;
    
    if (!token) {
      return res.redirect('/admin/login');
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
    
    // Get admin user
    const admin = await Admin.findById(decoded.id);
    
    if (!admin || !admin.isActive) {
      res.clearCookie('adminToken');
      return res.redirect('/admin/login');
    }
    
    // Set admin data in request
    req.admin = {
      id: admin._id,
      username: admin.username,
      email: admin.email,
      role: admin.role
    };
    
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.clearCookie('adminToken');
    res.redirect('/admin/login');
  }
};