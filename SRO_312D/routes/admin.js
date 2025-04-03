const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdminAuthenticated } = require('../middleware/auth');
const { addSampleBoatData, clearBoatData } = require('../utils/seedData');

// Admin login routes
router.get('/login', adminController.getAdminLogin);
router.post('/login', adminController.adminLogin);

// Admin dashboard (protected)
router.get('/dashboard', isAdminAuthenticated, adminController.getAdminDashboard);

// Add company routes (protected)
router.get('/add-company', isAdminAuthenticated, adminController.getAddCompany);
router.post('/add-company', isAdminAuthenticated, adminController.addCompany);

// Send email to company (protected)
router.get('/send-email/:companyId', isAdminAuthenticated, adminController.sendCompanyEmail);

// Seed boat data for a company (protected)
router.get('/seed-boat-data/:companyId', isAdminAuthenticated, async (req, res) => {
    try {
        const { companyId } = req.params;
        const result = await addSampleBoatData(companyId);
        
        if (result) {
            req.flash('success', `Successfully added sample boat data to company with ID ${companyId}`);
        } else {
            req.flash('error', `Failed to add sample boat data to company with ID ${companyId}`);
        }
        
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error('Error adding sample boat data:', error);
        req.flash('error', 'An error occurred while adding sample boat data');
        res.redirect('/admin/dashboard');
    }
});

// Clear boat data for a company (protected)
router.get('/clear-boat-data/:companyId', isAdminAuthenticated, async (req, res) => {
    try {
        const { companyId } = req.params;
        const result = await clearBoatData(companyId);
        
        if (result) {
            req.flash('success', `Successfully cleared boat data from company with ID ${companyId}`);
        } else {
            req.flash('error', `Failed to clear boat data from company with ID ${companyId}`);
        }
        
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error('Error clearing boat data:', error);
        req.flash('error', 'An error occurred while clearing boat data');
        res.redirect('/admin/dashboard');
    }
});

// Admin logout
router.get('/logout', (req, res) => {
    req.session.adminAuthenticated = false;
    res.redirect('/admin/login');
});

module.exports = router; 