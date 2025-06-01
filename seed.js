const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const Category = require('./models/Category');
const Coupon = require('./models/Coupon');
const Product = require('./models/Product');

// Connect to MongoDB
const connectDB = async () => {
	try {
		await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/digitalmarketplace', {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
		console.log('MongoDB connected successfully');
	} catch (error) {
		console.error('MongoDB connection error:', error);
		process.exit(1);
	}
};

// Sample data
const adminData = {
	username: 'superadmin',
	email: 'admin@root.com',
	password: 'admin123', // Will be hashed by the schema
	role: 'admin',
	isActive: true
};

const categoriesData = [
	{
		name: 'E-books & Digital Guides',
		slug: 'ebooks-digital-guides',
		description: 'Comprehensive digital books and guides on various topics including business, technology, and personal development',
		isActive: true
	},
	{
		name: 'Software & Applications',
		slug: 'software-applications',
		description: 'Professional software tools, mobile applications, and desktop programs for productivity and creativity',
		isActive: true
	},
	{
		name: 'Templates & Graphics',
		slug: 'templates-graphics',
		description: 'Design templates, graphics, icons, and visual assets for websites, presentations, and marketing materials',
		isActive: true
	},
	{
		name: 'Online Courses & Tutorials',
		slug: 'online-courses-tutorials',
		description: 'Video courses, tutorials, and educational content covering skills from programming to photography',
		isActive: true
	}
];

const couponsData = [
	{
		code: 'WELCOME20',
		type: 'percentage',
		value: 20,
		minPurchase: 50,
		maxDiscount: 100,
		startDate: new Date('2024-01-01'),
		endDate: new Date('2025-12-31'),
		isActive: true,
		usageLimit: 1000,
		usedCount: 45
	},
	{
		code: 'SAVE50',
		type: 'fixed',
		value: 50,
		minPurchase: 200,
		startDate: new Date('2024-06-01'),
		endDate: new Date('2025-06-30'),
		isActive: true,
		usageLimit: 500,
		usedCount: 78
	},
	{
		code: 'BLACKFRIDAY',
		type: 'percentage',
		value: 35,
		minPurchase: 100,
		maxDiscount: 200,
		startDate: new Date('2024-11-25'),
		endDate: new Date('2024-11-30'),
		isActive: false,
		usageLimit: 2000,
		usedCount: 1856
	}
];

// This will be populated with actual category IDs after categories are created
let productsData = [];

const createProductsData = (categoryIds) => [
	{
		title: 'Complete JavaScript Mastery Guide',
		slug: 'complete-javascript-mastery-guide',
		description: 'A comprehensive 500-page guide covering JavaScript from basics to advanced concepts including ES6+, async programming, and modern frameworks. Perfect for beginners and intermediate developers.',
		price: 49.99,
		discountPrice: 34.99,
		category: categoryIds[0], // E-books & Digital Guides
		featured: true,
		downloadLinks: ['https://cdn.example.com/js-guide-v2.pdf'],
		fileType: 'pdf',
		fileSize: '15.2 MB',
		image: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800',
		isActive: true,
		metaTitle: 'Complete JavaScript Programming Guide - Master JS in 2024',
		metaDescription: 'Learn JavaScript programming from scratch with our comprehensive guide. Covers ES6+, frameworks, and real-world projects.',
		metaKeywords: 'javascript, programming, web development, es6, coding guide'
	},
	{
		title: 'Professional Photo Editor Pro',
		slug: 'professional-photo-editor-pro',
		description: 'Advanced photo editing software with AI-powered features, batch processing, and professional-grade filters. Compatible with Windows and Mac systems.',
		price: 199.99,
		discountPrice: 149.99,
		category: categoryIds[1], // Software & Applications
		featured: true,
		downloadLinks: ['https://cdn.example.com/photo-editor-setup.zip'],
		fileType: 'zip',
		fileSize: '485 MB',
		image: 'https://images.unsplash.com/photo-1609921212529-8e768aa9e10a?w=800',
		isActive: true,
		metaTitle: 'Professional Photo Editor Pro - Advanced Image Editing Software',
		metaDescription: 'Professional photo editing software with AI features. Perfect for photographers and designers.',
		metaKeywords: 'photo editor, image editing, photography software, AI photo editing'
	},
	{
		title: 'Modern Website Template Collection',
		slug: 'modern-website-template-collection',
		description: 'Collection of 25 responsive website templates for various industries including business, portfolio, e-commerce, and blogs. Built with HTML5, CSS3, and JavaScript.',
		price: 79.99,
		discountPrice: 59.99,
		category: categoryIds[2], // Templates & Graphics
		featured: false,
		downloadLinks: ['https://cdn.example.com/website-templates.zip'],
		fileType: 'zip',
		fileSize: '125 MB',
		image: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800',
		isActive: true,
		metaTitle: 'Modern Website Templates - Responsive HTML Templates Collection',
		metaDescription: '25 professional website templates for various industries. Responsive and modern designs.',
		metaKeywords: 'website templates, html templates, responsive design, web templates'
	},
	{
		title: 'Digital Marketing Masterclass 2024',
		slug: 'digital-marketing-masterclass-2024',
		description: '12-hour comprehensive video course covering SEO, social media marketing, email marketing, PPC advertising, and analytics. Includes practical exercises and real case studies.',
		price: 299.99,
		discountPrice: 199.99,
		category: categoryIds[3], // Online Courses & Tutorials
		featured: true,
		downloadLinks: ['https://cdn.example.com/marketing-course-part1.zip', 'https://cdn.example.com/marketing-course-part2.zip'],
		fileType: 'zip',
		fileSize: '8.5 GB',
		image: 'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=800',
		isActive: true,
		metaTitle: 'Digital Marketing Masterclass 2024 - Complete Online Course',
		metaDescription: 'Master digital marketing with our comprehensive 12-hour course covering SEO, social media, and PPC.',
		metaKeywords: 'digital marketing, seo, social media marketing, online course, marketing training'
	},
	{
		title: 'Python Programming for Beginners',
		slug: 'python-programming-for-beginners',
		description: 'Learn Python programming from scratch with this beginner-friendly 300-page ebook. Covers syntax, data structures, functions, and object-oriented programming with practical examples.',
		price: 39.99,
		category: categoryIds[0], // E-books & Digital Guides
		featured: false,
		downloadLinks: ['https://cdn.example.com/python-beginners-guide.pdf'],
		fileType: 'pdf',
		fileSize: '12.8 MB',
		image: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800',
		isActive: true,
		metaTitle: 'Python Programming for Beginners - Complete Learning Guide',
		metaDescription: 'Learn Python programming from basics to advanced concepts with practical examples and exercises.',
		metaKeywords: 'python programming, coding, programming guide, python tutorial, learn python'
	},
	{
		title: 'Premium Icon Pack - 2000+ Icons',
		slug: 'premium-icon-pack-2000-icons',
		description: 'Professional icon collection with over 2000 high-quality icons in multiple formats (SVG, PNG, ICO). Perfect for web design, mobile apps, and presentations.',
		price: 29.99,
		discountPrice: 19.99,
		category: categoryIds[2], // Templates & Graphics
		featured: false,
		downloadLinks: ['https://cdn.example.com/premium-icons-pack.zip'],
		fileType: 'zip',
		fileSize: '95 MB',
		image: 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=800',
		isActive: true,
		metaTitle: 'Premium Icon Pack - 2000+ Professional Icons Collection',
		metaDescription: '2000+ high-quality icons in SVG, PNG, ICO formats for web design and mobile apps.',
		metaKeywords: 'icons, icon pack, svg icons, web design icons, mobile icons'
	},
	{
		title: 'Advanced Excel Automation Toolkit',
		slug: 'advanced-excel-automation-toolkit',
		description: 'Powerful Excel add-in with advanced automation features, custom functions, and productivity tools. Includes VBA macros and templates for business automation.',
		price: 89.99,
		discountPrice: 69.99,
		category: categoryIds[1], // Software & Applications
		featured: false,
		downloadLinks: ['https://cdn.example.com/excel-toolkit-installer.zip'],
		fileType: 'zip',
		fileSize: '45 MB',
		image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800',
		isActive: true,
		metaTitle: 'Advanced Excel Automation Toolkit - Excel Add-in for Productivity',
		metaDescription: 'Powerful Excel automation toolkit with custom functions and VBA macros for business efficiency.',
		metaKeywords: 'excel automation, excel add-in, vba macros, excel tools, business automation'
	},
	{
		title: 'Complete Web Development Bootcamp',
		slug: 'complete-web-development-bootcamp',
		description: '40-hour intensive web development course covering HTML, CSS, JavaScript, React, Node.js, and MongoDB. Includes 15 hands-on projects and lifetime access.',
		price: 499.99,
		discountPrice: 299.99,
		category: categoryIds[3], // Online Courses & Tutorials
		featured: true,
		downloadLinks: ['https://cdn.example.com/webdev-bootcamp-videos.zip', 'https://cdn.example.com/webdev-bootcamp-resources.zip'],
		fileType: 'zip',
		fileSize: '12.3 GB',
		image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800',
		isActive: true,
		metaTitle: 'Complete Web Development Bootcamp - Full Stack Course',
		metaDescription: '40-hour web development bootcamp covering full stack development with 15 practical projects.',
		metaKeywords: 'web development, full stack, react, nodejs, javascript course, programming bootcamp'
	}
];

// Seed function
const seedDatabase = async () => {
	try {
		// Clear existing data
		console.log('Clearing existing data...');
		await Admin.deleteMany({});
		await Category.deleteMany({});
		await Coupon.deleteMany({});
		await Product.deleteMany({});

		// Create admin
		console.log('Creating admin...');
		const admin = await Admin.create(adminData);
		console.log(`Admin created: ${admin.username}`);

		// Create categories
		console.log('Creating categories...');
		const categories = await Category.insertMany(categoriesData);
		console.log(`${categories.length} categories created`);

		// Create coupons
		console.log('Creating coupons...');
		const coupons = await Coupon.insertMany(couponsData);
		console.log(`${coupons.length} coupons created`);

		// Create products with category references
		console.log('Creating products...');
		const categoryIds = categories.map(cat => cat._id);
		productsData = createProductsData(categoryIds);
		const products = await Product.insertMany(productsData);
		console.log(`${products.length} products created`);

		console.log('\n✅ Database seeded successfully!');
		console.log('\n📊 Summary:');
		console.log(`- Admin: 1`);
		console.log(`- Categories: ${categories.length}`);
		console.log(`- Coupons: ${coupons.length}`);
		console.log(`- Products: ${products.length}`);

		console.log('\n🔐 Admin Login Details:');
		console.log(`Email: ${adminData.email}`);
		console.log(`Password: ${adminData.password}`);

	} catch (error) {
		console.error('Error seeding database:', error);
	} finally {
		mongoose.connection.close();
		console.log('\nDatabase connection closed.');
	}
};

// Run the seed function
const runSeed = async () => {
	await connectDB();
	await seedDatabase();
};

runSeed();