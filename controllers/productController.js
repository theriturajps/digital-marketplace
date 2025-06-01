const Product = require('../models/Product');
const Category = require('../models/Category');

// Get product details
exports.getProductDetails = async (req, res) => {
  try {
    const productSlug = req.params.slug;
    
    const product = await Product.findOne({ 
      slug: productSlug,
      isActive: true
    }).populate('category');
    
    if (!product) {
      return res.status(404).render('404', { 
        title: 'Product Not Found',
        currentUrl: req.originalUrl
      });
    }
    
    // Get related products (same category, excluding current product)
    const relatedProducts = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id },
      isActive: true
    })
    .populate('category')
    .limit(4);
    
    res.render('product-details', {
      title: `${product.title} | Digital Files Marketplace`,
      product,
      relatedProducts
    });
  } catch (err) {
    console.error('Product details error:', err);
    res.status(500).render('error', { 
      title: 'Error',
      error: 'An error occurred while loading the product details'
    });
  }
};