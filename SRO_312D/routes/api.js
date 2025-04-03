const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const { isAdminAuthenticated, isAuthenticated } = require('../middleware/auth');

// API endpoint to get boat data for a specific company (admin-only)
router.get('/company/:companyId/boats', isAdminAuthenticated, async (req, res) => {
    try {
        const { companyId } = req.params;
        
        // Find the company by ID
        const company = await Company.findOne({ companyId });
        
        if (!company) {
            return res.status(404).json({ 
                success: false, 
                message: 'Company not found' 
            });
        }
        
        // Return boat data
        res.json({
            success: true,
            companyName: company.companyName,
            boats: company.Boat_Coordinates || []
        });
    } catch (error) {
        console.error('Error fetching boat data:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching boat data' 
        });
    }
});

// API endpoint for company to get their own boat data (company user access)
router.get('/my-boats', isAuthenticated, async (req, res) => {
    try {
        const companyId = req.session.companyId;
        const company = await Company.findOne({ companyId });

        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }

        res.json({
            success: true,
            boats: company.Boat_Coordinates || []
        });
    } catch (error) {
        console.error('Error fetching boat data:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Add a new boat to the company's profile
router.post('/boats', isAuthenticated, async (req, res) => {
    try {
        const companyId = req.session.companyId;
        console.log('Request to add boat for company:', companyId);
        console.log('Request body:', req.body);
        
        const company = await Company.findOne({ companyId });

        if (!company) {
            console.log('Company not found:', companyId);
            return res.status(404).json({ success: false, message: 'Company not found' });
        }

        // Get boat data from request body
        const {
            id,
            pin,
            name,
            code,
            boatType,
            portName,
            latitude,
            longitude,
            status,
            lastUpdated
        } = req.body;

        // Check for missing required fields
        const missingFields = [];
        if (!id) missingFields.push('id');
        if (!name) missingFields.push('name');
        if (!boatType) missingFields.push('boatType');
        if (latitude === undefined || latitude === null) missingFields.push('latitude');
        if (longitude === undefined || longitude === null) missingFields.push('longitude');
        if (!status) missingFields.push('status');
        if (!pin) missingFields.push('pin');

        if (missingFields.length > 0) {
            console.log('Missing fields:', missingFields);
            return res.status(400).json({ 
                success: false, 
                message: `Missing required fields: ${missingFields.join(', ')}` 
            });
        }

        // Check if a boat with this ID already exists
        const existingBoat = company.Boat_Coordinates.find(boat => boat.id === id);
        if (existingBoat) {
            console.log('Boat with ID already exists:', id);
            return res.status(400).json({ 
                success: false, 
                message: 'A boat with this ID already exists' 
            });
        }

        // Create new boat object
        const newBoat = {
            id,
            name,
            code: code || `${name.substring(0, 2).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            status,
            lastUpdated: lastUpdated || new Date(),
            portName: portName || '',
            boatType,
            pin
        };

        console.log('Adding new boat:', newBoat);

        // Add to company's boats
        if (!company.Boat_Coordinates) {
            company.Boat_Coordinates = [];
        }
        
        company.Boat_Coordinates.push(newBoat);

        // Save to database
        await company.save();
        console.log('Boat added successfully');

        res.status(201).json({ 
            success: true, 
            message: 'Boat added successfully',
            boat: newBoat
        });
    } catch (error) {
        console.error('Error adding boat:', error);
        res.status(500).json({ 
            success: false, 
            message: `Server error: ${error.message}` 
        });
    }
});

// Clear all boat data for a company
router.delete('/boats', isAuthenticated, async (req, res) => {
    try {
        const companyId = req.session.companyId;
        console.log('Clearing all boat data for company:', companyId);
        
        const company = await Company.findOne({ companyId });

        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }

        // Clear all boat data
        company.Boat_Coordinates = [];
        
        // Save to database
        await company.save();
        console.log('All boat data cleared successfully');

        res.json({ 
            success: true, 
            message: 'All boat data cleared successfully'
        });
    } catch (error) {
        console.error('Error clearing boat data:', error);
        res.status(500).json({ 
            success: false, 
            message: `Server error: ${error.message}` 
        });
    }
});

module.exports = router; 