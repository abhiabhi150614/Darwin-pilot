const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    ownerName: {
        type: String,
        required: true,
        trim: true
    },
    companyId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    password: {
        type: String,
        required: true
    },
    dateAdded: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date
    },
    active: {
        type: Boolean,
        default: true
    },
    Boat_Coordinates: [{
        id: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        code: {
            type: String,
            required: true
        },
        latitude: {
            type: Number,
            required: true
        },
        longitude: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ['active', 'docked', 'maintenance', 'inactive'],
            default: 'docked'
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        },
        portName: {
            type: String
        },
        boatType: {
            type: String,
            enum: ['cargo', 'tanker', 'container', 'passenger', 'fishing', 'research', 'luxury', 'other'],
            default: 'cargo'
        },
        pin: {
            type: String,
            minlength: 4,
            maxlength: 4,
            required: false
        }
    }]
});

const Company = mongoose.model('Company', companySchema);

module.exports = Company; 