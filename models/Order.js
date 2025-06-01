const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  customer: {
    email: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    }
  },
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    price: {
      type: Number,
      required: true
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  finalAmount: {
    type: Number,
    required: true
  },
  couponUsed: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon'
  },
  payment: {
    transactionId: {
      type: String,
      required: true
    },
    razorpayOrderId: {
      type: String,
      required: true
    },
    razorpayPaymentId: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    }
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled'],
    default: 'pending'
  },
  downloadLinks: [{
    link: String,
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    downloads: {
      type: Number,
      default: 0
    },
    lastDownloaded: Date
  }],
  isVerified: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);