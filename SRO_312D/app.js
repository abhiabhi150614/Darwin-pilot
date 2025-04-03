// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const flash = require('connect-flash');
const { createDefaultCompanyIfNeeded, addSampleBoatData, add12BoatsToAB312D } = require('./utils/seedData');

// Import routes
const companyRoutes = require('./routes/company');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const captainRoutes = require('./routes/captain');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.set('strictQuery', false);
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('MongoDB Connected');
        
        // Note: We're not adding sample boat data automatically anymore
        // This is now handled through the UI
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Set up middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'SRO312Doptimizer',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 } // 1 hour
}));
app.use(flash());

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Mock credentials (for backward compatibility)
const validCredentials = {
    companyId: 'Opter_312d',
    password: 'nithin312d'
};

// Make the Google Maps API key available to all templates
app.use((req, res, next) => {
    res.locals.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    next();
});

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

// Use company routes
app.use('/', companyRoutes);

// Use admin routes
app.use('/admin', adminRoutes);

// Use API routes
app.use('/api', apiRoutes);

// Use captain routes
app.use('/captain', captainRoutes);

// About page
app.get('/about', (req, res) => {
    res.render('about');
});

// Contact page
app.get('/contact', (req, res) => {
    res.render('contact');
});

// Secret portal redirect
app.get('/sro_312d/portal', (req, res) => {
    res.redirect('/admin/login');
});

// 404 page
app.use((req, res) => {
    res.status(404).render('error', { message: 'Page not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
}); 