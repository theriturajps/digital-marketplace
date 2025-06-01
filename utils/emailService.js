const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send order confirmation email
exports.sendOrderConfirmation = async (email, order, product) => {
  try {
    const downloadLinks = order.downloadLinks.map((link, index) => {
      return {
        url: `${process.env.SITE_URL}/orders/download/${order.orderNumber}/${product._id}/${index}`,
        name: `${product.title} - File ${index + 1}`
      };
    });
    
    const mailOptions = {
      from: `"Digital Marketplace" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: `Your Order #${order.orderNumber} - Download Links`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #4f46e5; padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0;">Your Order is Ready!</h1>
          </div>
          
          <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <p>Hello,</p>
            
            <p>Thank you for your purchase! Your order has been successfully processed.</p>
            
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #374151;">Order Details</h2>
              <p><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
              <p><strong>Product:</strong> ${product.title}</p>
              <p><strong>Amount Paid:</strong> ₹${order.finalAmount.toFixed(2)}</p>
            </div>
            
            <div style="margin: 20px 0;">
              <h2 style="color: #374151;">Your Download Links</h2>
              <p>Click on the links below to download your files:</p>
              
              <ul style="list-style: none; padding: 0;">
                ${downloadLinks.map(link => `
                  <li style="margin-bottom: 10px;">
                    <a href="${link.url}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">
                      Download ${link.name}
                    </a>
                  </li>
                `).join('')}
              </ul>
              
              <p><strong>Note:</strong> These links will be active for a limited time. Please download your files as soon as possible.</p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p>If you need any assistance or have questions about your order, please contact us at ${process.env.CONTACT_EMAIL || 'iamriturajps@gmail.com'} or WhatsApp +91-8789679937.</p>
              
              <p>You can also check your order status and re-download your files by using our <a href="${process.env.SITE_URL}/orders/lookup" style="color: #4f46e5;">Order Lookup</a> page.</p>
              
              <p>Thank you for shopping with us!</p>
            </div>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>This is an automated email, please do not reply to this message.</p>
            <p>© ${new Date().getFullYear()} Digital Marketplace. All rights reserved.</p>
          </div>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Order confirmation email sent to ${email}`);
    return true;
  } catch (err) {
    console.error('Email sending error:', err);
    return false;
  }
};