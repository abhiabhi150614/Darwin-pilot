// Check if user is authenticated
exports.isAuthenticated = (req, res, next) => {
    if (req.session.authenticated) {
        return next();
    }
    res.redirect('/login');
};

// Check if admin is authenticated
exports.isAdminAuthenticated = (req, res, next) => {
    if (req.session.adminAuthenticated) {
        return next();
    }
    res.redirect('/admin/login');
}; 