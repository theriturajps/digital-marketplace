require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');

// Import routes
const indexRoutes = require('./routes/index');
const productRoutes = require('./routes/products');
const checkoutRoutes = require('./routes/checkout');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

// Create Express app
const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/digitalmarketplace', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log('MongoDB Connection Error:', err));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hours
}));

// Global variables middleware
app.use(require('./middleware/globals'));

// Routes
app.use('/', indexRoutes);
app.use('/products', productRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/orders', orderRoutes);
app.use('/admin', adminRoutes);

// 404 page
app.use((req, res) => {
  res.status(404).render('404', { 
    title: 'Page Not Found',
    currentUrl: req.originalUrl
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    title: 'Server Error',
    error: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;