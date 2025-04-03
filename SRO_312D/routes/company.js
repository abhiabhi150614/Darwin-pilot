const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { isAuthenticated } = require('../middleware/auth');
const Company = require('../models/Company');

// Login routes
router.get('/login', companyController.getLogin);
router.post('/login', companyController.login);

// Auto-login route for testing the ab_312d company with the 12 boats
router.get('/auto-login', async (req, res) => {
    try {
        // Set authenticated session for ab_312d
        req.session.authenticated = true;
        req.session.companyId = 'ab_312d';
        req.session.companyName = 'AB Shipping International';
        
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Auto-login error:', error);
        res.render('login', { error: 'An error occurred during auto-login. Please try manual login.' });
    }
});

// Dashboard (protected)
router.get('/dashboard', isAuthenticated, companyController.getDashboard);

// Add boat form submission
router.post('/api/add-boat', isAuthenticated, async (req, res) => {
    try {
        console.log('Request to add boat for company:', req.session.companyId);
        console.log('Request body:', req.body);
        
        const companyId = req.session.companyId;
        
        // Get the company
        const company = await Company.findOne({ companyId });
        
        if (!company) {
            req.flash('error', 'Company not found');
            return res.redirect('/dashboard');
        }
        
        // Required fields
        const requiredFields = ['id', 'name', 'boatType', 'latitude', 'longitude', 'status', 'pin'];
        const missingFields = [];
        
        // Check for missing fields
        requiredFields.forEach(field => {
            if (!req.body[field] && req.body[field] !== 0) {
                missingFields.push(field);
            }
        });
        
        if (missingFields.length > 0) {
            console.log('Missing fields:', missingFields);
            req.flash('error', 'Missing required fields: ' + missingFields.join(', '));
            return res.redirect('/dashboard');
        }
        
        // Create new boat with form data
        const newBoat = {
            id: req.body.id,
            name: req.body.name,
            code: req.body.code || `${req.body.name.substring(0, 2).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
            latitude: parseFloat(req.body.latitude),
            longitude: parseFloat(req.body.longitude),
            status: req.body.status,
            lastUpdated: new Date(),
            portName: req.body.portName || 'Unknown Port',
            boatType: req.body.boatType,
            pin: req.body.pin
        };
        
        // Initialize boat coordinates array if it doesn't exist
        if (!company.Boat_Coordinates) {
            company.Boat_Coordinates = [];
        }
        
        // Check if boat ID already exists
        const existingBoat = company.Boat_Coordinates.find(boat => boat.id === newBoat.id);
        if (existingBoat) {
            req.flash('error', 'A boat with this ID already exists');
            return res.redirect('/dashboard');
        }
        
        // Add boat to company
        company.Boat_Coordinates.push(newBoat);
        
        // Save the company
        await company.save();
        
        // Flash success message and redirect
        req.flash('success', 'Boat added successfully!');
        res.redirect('/dashboard');
        
    } catch (error) {
        console.error('Error adding boat:', error);
        req.flash('error', 'Error adding boat: ' + error.message);
        res.redirect('/dashboard');
    }
});

// Clear all boats
router.post('/api/clear-boats', isAuthenticated, async (req, res) => {
    try {
        const companyId = req.session.companyId;
        
        // Get the company
        const company = await Company.findOne({ companyId });
        
        if (!company) {
            req.flash('error', 'Company not found');
            return res.redirect('/dashboard');
        }
        
        // Clear all boats
        company.Boat_Coordinates = [];
        
        // Save the company
        await company.save();
        
        // Flash success message and redirect
        req.flash('success', 'All boats cleared successfully!');
        res.redirect('/dashboard');
        
    } catch (error) {
        console.error('Error clearing boats:', error);
        req.flash('error', 'Error clearing boats: ' + error.message);
        res.redirect('/dashboard');
    }
});

// Logout
router.get('/logout', companyController.logout);

module.exports = router; 