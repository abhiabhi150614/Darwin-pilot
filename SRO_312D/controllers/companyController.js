const Company = require('../models/Company');

// Get login page
exports.getLogin = (req, res) => {
    res.render('login', { error: null });
};

// Process login
exports.login = async (req, res) => {
    const { companyId, password } = req.body;
    
    try {
        // Find company by ID
        const company = await Company.findOne({ companyId });
        
        // If company not found or password doesn't match
        if (!company || company.password !== password) {
            return res.render('login', { error: 'Invalid credentials. Please try again.' });
        }
        
        // Update last login date
        company.lastLogin = new Date();
        await company.save();
        
        // Set authenticated session
        req.session.authenticated = true;
        req.session.companyId = company.companyId;
        req.session.companyName = company.companyName;
        
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { error: 'An error occurred. Please try again.' });
    }
};

// Get dashboard
exports.getDashboard = async (req, res) => {
    if (!req.session.authenticated) {
        return res.redirect('/');
    }

    try {
        const company = await Company.findOne({ companyId: req.session.companyId });
        if (!company) {
            // Clear session and redirect to login
            req.session.destroy();
            return res.redirect('/');
        }
        
        // Update lastLogin
        company.lastLogin = new Date();
        await company.save();

        // Get flash messages and clear them after use
        const successMessage = req.flash('success');
        const errorMessage = req.flash('error');

        res.render('dashboard', {
            companyName: company.companyName,
            authenticated: req.session.authenticated,
            boatData: company.Boat_Coordinates || [],
            success: successMessage.length > 0 ? successMessage[0] : null,
            error: errorMessage.length > 0 ? errorMessage[0] : null
        });
    } catch (error) {
        console.error('Error fetching company data:', error);
        res.status(500).render('error', { message: 'Internal Server Error' });
    }
};

// Logout
exports.logout = (req, res) => {
    req.session.destroy();
    res.redirect('/');
}; 