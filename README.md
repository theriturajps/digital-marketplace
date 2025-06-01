# Digital Files Marketplace

A production-ready e-commerce platform for selling digital files (PDF and ZIP) with guest checkout, Razorpay integration, and comprehensive admin features.

## Features

- Product display with grid layout, search, and pagination
- Guest checkout (no registration required)
- Coupon/offer code system
- Razorpay payment integration (INR)
- Email delivery of download links
- Order lookup system
- Admin dashboard with product, order, and user management
- SEO optimization for search engine visibility

## Technology Stack

- Node.js
- Express
- EJS (templating)
- MongoDB (database)
- Razorpay (payment processing)
- Nodemailer (email delivery)

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB (local or cloud)
- Razorpay account for payment processing
- SMTP server for email delivery

### Installation

1. Clone the repository
```
git clone <repository-url>
```

2. Install dependencies
```
npm install
```

3. Configure environment variables
Create a `.env` file in the root directory with the following variables:
```
PORT=3000
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret
EMAIL_HOST=your_smtp_host
EMAIL_PORT=your_smtp_port
EMAIL_SECURE=true_or_false
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
SITE_URL=http://localhost:3000
```

4. Start the server
```
npm start
```

For development with automatic restarts:
```
npm run dev
```

### Initial Setup

1. Create an admin user in MongoDB:
```javascript
db.admins.insertOne({
  username: "admin",
  email: "admin@example.com",
  password: "$2a$10$your_hashed_password", // Use bcrypt to hash password
  role: "superadmin",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

2. Access the admin panel at `/admin/login`

## Project Structure

- `app.js` - Main application file
- `models/` - MongoDB models
- `controllers/` - Route controllers
- `routes/` - Express routes
- `views/` - EJS templates
- `middleware/` - Express middleware
- `utils/` - Utility functions
- `public/` - Static assets

## License

This project is licensed under the MIT License.