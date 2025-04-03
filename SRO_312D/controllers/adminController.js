const Company = require('../models/Company');
const { sendWelcomeEmail } = require('../utils/emailSender');

// Get admin login page
exports.getAdminLogin = (req, res) => {
    res.render('admin/login', { error: null });
};

// Process admin login
exports.adminLogin = (req, res) => {
    const { username, password } = req.body;
    
    // Check admin credentials
    if (username === 'sro_312d' && password === 'sro_312d') {
        req.session.adminAuthenticated = true;
        return res.redirect('/admin/dashboard');
    }
    
    res.render('admin/login', { error: 'Invalid credentials. Please try again.' });
};

// Get admin dashboard
exports.getAdminDashboard = async (req, res) => {
    try {
        // Get all companies from database
        const companies = await Company.find().sort({ dateAdded: -1 });
        
        res.render('admin/dashboard', {
            companies,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).render('error', { message: 'Error fetching companies' });
    }
};

// Get add company form
exports.getAddCompany = (req, res) => {
    res.render('admin/add-company', { 
        error: null,
        formData: {}
    });
};

// Process add company
exports.addCompany = async (req, res) => {
    try {
        const { companyName, ownerName, companyId, email, password } = req.body;
        
        // Check if company ID already exists
        const existingCompany = await Company.findOne({ companyId });
        if (existingCompany) {
            return res.render('admin/add-company', {
                error: 'Company ID already exists. Please choose another.',
                formData: req.body
            });
        }
        
        // Create new company
        const newCompany = new Company({
            companyName,
            ownerName,
            companyId,
            email,
            password
        });
        
        // Save company to database
        await newCompany.save();
        
        // Always send welcome email
        try {
            const emailResult = await sendWelcomeEmail(newCompany);
            
            // Set success flash message with preview URL
            req.flash('success', `Company "${companyName}" added successfully and welcome email sent to ${email}. 
                <br><a href="${emailResult.previewUrl}" target="_blank" class="preview-link">Click here to preview the email</a>`);
            
            // Redirect to admin dashboard
            return res.redirect('/admin/dashboard');
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            
            // Set flash message
            req.flash('error', `Company "${companyName}" added successfully but failed to send welcome email. Error: ${emailError.message}`);
            
            // Redirect to admin dashboard
            return res.redirect('/admin/dashboard');
        }
    } catch (error) {
        console.error('Error adding company:', error);
        res.render('admin/add-company', {
            error: 'Error adding company. Please try again.',
            formData: req.body
        });
    }
};

// Send welcome email to existing company
exports.sendCompanyEmail = async (req, res) => {
    const companyId = req.params.companyId;
    
    try {
        // Find company in database
        const company = await Company.findOne({ companyId });
        
        if (!company) {
            req.flash('error', 'Company not found. Email could not be sent.');
            return res.redirect('/admin/dashboard');
        }
        
        // Send welcome email
        const emailResult = await sendWelcomeEmail(company);
        
        // Set success flash message with preview URL
        req.flash('success', `Welcome email sent to ${company.email} successfully. 
            <br><a href="${emailResult.previewUrl}" target="_blank" class="preview-link">Click here to preview the email</a>`);
        
        // Redirect to admin dashboard
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error('Error sending email:', error);
        
        // Set error flash message
        req.flash('error', `Failed to send welcome email. Error: ${error.message}`);
        
        // Redirect to admin dashboard
        res.redirect('/admin/dashboard');
    }
};

// Admin logout
exports.adminLogout = (req, res) => {
    req.session.adminAuthenticated = false;
    res.redirect('/admin/login');
}; 