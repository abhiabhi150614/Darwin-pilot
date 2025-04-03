const Company = require('../models/Company');

/**
 * Creates a default company for testing if no companies exist
 * @returns {Promise<Company>} - The created company or existing first company
 */
async function createDefaultCompanyIfNeeded() {
    try {
        // Check if any companies exist
        const companyCount = await Company.countDocuments();
        
        if (companyCount === 0) {
            // Create a default company
            const defaultCompany = new Company({
                companyName: 'Ocean Voyagers Ltd',
                ownerName: 'John Smith',
                companyId: 'ab_312d',
                email: 'info@oceanvoyagers.example.com',
                password: 'password123',
                active: true
            });
            
            // Save to database
            await defaultCompany.save();
            console.log('Created default company: Ocean Voyagers Ltd');
            return defaultCompany;
        } else {
            // Return the first company found
            const firstCompany = await Company.findOne();
            console.log(`Using existing company: ${firstCompany.companyName}`);
            return firstCompany;
        }
    } catch (error) {
        console.error('Error creating default company:', error);
        throw error;
    }
}

/**
 * Adds sample boat data to a company for demonstration purposes
 * @param {string} companyId - The company ID to add boat data to
 * @returns {Promise} - Resolves when the data has been added
 */
async function addSampleBoatData(companyId) {
    try {
        const company = await Company.findOne({ companyId });
        
        if (!company) {
            console.error(`Company with ID ${companyId} not found`);
            return false;
        }
        
        // Sample boat data with realistic coordinates and information
        const sampleBoats = [
            {
                id: 'BT001',
                name: 'Ocean Explorer',
                code: 'OEX-123',
                latitude: 35.6762,
                longitude: 139.6503,
                status: 'active',
                lastUpdated: new Date(),
                portName: 'Tokyo',
                boatType: 'container'
            },
            {
                id: 'BT002',
                name: 'Northern Star',
                code: 'NST-456',
                latitude: 51.9225,
                longitude: 4.4791,
                status: 'docked',
                lastUpdated: new Date(),
                portName: 'Rotterdam',
                boatType: 'cargo'
            },
            {
                id: 'BT003',
                name: 'Pacific Voyager',
                code: 'PVY-789',
                latitude: 1.2655,
                longitude: 103.8242,
                status: 'active',
                lastUpdated: new Date(),
                portName: 'Singapore',
                boatType: 'tanker'
            },
            {
                id: 'BT004',
                name: 'Atlantic Carrier',
                code: 'ATC-101',
                latitude: 40.7128,
                longitude: -74.0060,
                status: 'maintenance',
                lastUpdated: new Date(),
                portName: 'New York',
                boatType: 'cargo'
            },
            {
                id: 'BT005',
                name: 'Southern Cross',
                code: 'SCR-202',
                latitude: -33.8688,
                longitude: 151.2093,
                status: 'active',
                lastUpdated: new Date(),
                portName: 'Sydney',
                boatType: 'passenger'
            }
        ];
        
        // Add the sample boats to the company
        company.Boat_Coordinates = sampleBoats;
        
        // Save the updated company
        await company.save();
        
        console.log(`Added ${sampleBoats.length} sample boats to company ${company.companyName}`);
        return true;
    } catch (error) {
        console.error('Error adding sample boat data:', error);
        return false;
    }
}

/**
 * Adds 12 specific boat details to the company with ID "ab_312d"
 * @returns {Promise} - Resolves when the data has been added
 */
async function add12BoatsToAB312D() {
    try {
        let company = await Company.findOne({ companyId: 'ab_312d' });
        
        if (!company) {
            // Create the company if it doesn't exist
            const newCompany = new Company({
                companyName: 'AB Shipping International',
                ownerName: 'Alex Brown',
                companyId: 'ab_312d',
                email: 'info@abshipping.example.com',
                password: 'password123',
                active: true
            });
            
            await newCompany.save();
            console.log('Created company: AB Shipping International');
            
            company = await Company.findOne({ companyId: 'ab_312d' });
        }
        
        // The 12 specific boat details
        const customBoats = [
            {
                id: "1",
                name: "Perth Pioneer",
                code: "PP-001",
                latitude: -32.0397,
                longitude: 115.7395,
                status: "docked",
                lastUpdated: new Date(1743249600000),
                portName: "Fremantle Port, Australia",
                boatType: "cargo"
            },
            {
                id: "2",
                name: "Darwin Voyager",
                code: "DV-002",
                latitude: -12.4634,
                longitude: 130.8456,
                status: "docked",
                lastUpdated: new Date(1743249600000),
                portName: "Port of Darwin, Australia",
                boatType: "tanker"
            },
            {
                id: "3",
                name: "Toamasina Trader",
                code: "TT-003",
                latitude: -18.1495,
                longitude: 49.4024,
                status: "docked",
                lastUpdated: new Date(1743249600000),
                portName: "Port of Toamasina, Madagascar",
                boatType: "container"
            },
            {
                id: "4",
                name: "Mahajanga Mariner",
                code: "MM-004",
                latitude: -15.7167,
                longitude: 46.3167,
                status: "docked",
                lastUpdated: new Date(1743249600000),
                portName: "Port of Mahajanga, Madagascar",
                boatType: "fishing"
            },
            {
                id: "5",
                name: "Ocean Explorer",
                code: "OE-005",
                latitude: -15.9,
                longitude: 75.3,
                status: "active",
                lastUpdated: new Date(1743249600000),
                boatType: "research"
            },
            {
                id: "6",
                name: "Indian Voyager",
                code: "IV-006",
                latitude: -12.5,
                longitude: 80.2,
                status: "active",
                lastUpdated: new Date(1743249600000),
                boatType: "cargo"
            },
            {
                id: "7",
                name: "Mumbai Merchant",
                code: "MM-007",
                latitude: 18.9398,
                longitude: 72.8583,
                status: "docked",
                lastUpdated: new Date(1743249600000),
                portName: "Mumbai Port, India",
                boatType: "container"
            },
            {
                id: "8",
                name: "Dubai Deliverance",
                code: "DD-008",
                latitude: 25.2697,
                longitude: 55.2708,
                status: "docked",
                lastUpdated: new Date(1743249600000),
                portName: "Port Rashid, Dubai",
                boatType: "luxury"
            },
            {
                id: "9",
                name: "Singapore Star",
                code: "SS-009",
                latitude: 1.2655,
                longitude: 103.824,
                status: "docked",
                lastUpdated: new Date(1743249600000),
                portName: "Port of Singapore",
                boatType: "tanker"
            },
            {
                id: "10",
                name: "Colombo Carrier",
                code: "CC-010",
                latitude: 6.9417,
                longitude: 79.8425,
                status: "docked",
                lastUpdated: new Date(1743249600000),
                portName: "Port of Colombo, Sri Lanka",
                boatType: "cargo"
            },
            {
                id: "11",
                name: "Mombasa Master",
                code: "MM-011",
                latitude: -4.0435,
                longitude: 39.6682,
                status: "docked",
                lastUpdated: new Date(1743249600000),
                portName: "Port of Mombasa, Kenya",
                boatType: "container"
            },
            {
                id: "12",
                name: "Cape Town Cruiser",
                code: "CT-012",
                latitude: -33.9062,
                longitude: 18.4355,
                status: "docked",
                lastUpdated: new Date(1743249600000),
                portName: "Port of Cape Town, South Africa",
                boatType: "passenger"
            }
        ];
        
        // Update the company with the custom boats
        company.Boat_Coordinates = customBoats;
        
        // Save the updated company
        await company.save();
        
        console.log(`Added 12 custom boats to company ${company.companyName}`);
        return true;
    } catch (error) {
        console.error('Error adding custom boat data:', error);
        return false;
    }
}

/**
 * Clears all boat data from a company
 * @param {string} companyId - The company ID to clear boat data from
 * @returns {Promise} - Resolves when the data has been cleared
 */
async function clearBoatData(companyId) {
    try {
        const company = await Company.findOne({ companyId });
        
        if (!company) {
            console.error(`Company with ID ${companyId} not found`);
            return false;
        }
        
        // Clear the boat coordinates
        company.Boat_Coordinates = [];
        
        // Save the updated company
        await company.save();
        
        console.log(`Cleared all boat data from company ${company.companyName}`);
        return true;
    } catch (error) {
        console.error('Error clearing boat data:', error);
        return false;
    }
}

module.exports = {
    createDefaultCompanyIfNeeded,
    addSampleBoatData,
    clearBoatData,
    add12BoatsToAB312D
}; 