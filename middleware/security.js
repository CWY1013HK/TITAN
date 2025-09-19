import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';

// Rate limiting configurations
export const createRateLimiters = () => {
    // General API rate limiter
    const generalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
    });

    // Stricter limiter for authentication endpoints
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // limit each IP to 5 requests per windowMs
        message: 'Too many authentication attempts, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
    });

    // AI endpoint limiter (more expensive operations)
    const aiLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 20, // limit each IP to 20 requests per windowMs
        message: 'Too many AI requests, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
    });

    return { generalLimiter, authLimiter, aiLimiter };
};

// Input validation middleware
export const validateInput = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: 'Invalid input data',
            errors: errors.array()
        });
    }
    next();
};

// User registration validation
export const validateRegistration = [
    body('Email_Address')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('Password')
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('First_Name')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('First name must be between 1 and 50 characters'),
    body('Last_Name')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Last name must be between 1 and 50 characters'),
    body('School_Name')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('School name must be between 1 and 100 characters'),
    body('School_District')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('School district must be between 1 and 50 characters'),
    body('Form')
        .isInt({ min: 1, max: 6 })
        .withMessage('Form must be between 1 and 6'),
    validateInput
];

// User login validation
export const validateLogin = [
    body('email').if(body('username').not().exists()).isEmail().withMessage('Please provide a valid email address'),
    body('username').if(body('email').not().exists()).isString().withMessage('Please provide a valid username'),
    body('password').notEmpty().withMessage('Password is required'),
    validateInput
];

// Enhanced JWT verification middleware
export const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

        // Add token expiration check
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
            return res.status(401).json({ message: 'Token has expired' });
        }

        req.userId = decoded.userId;
        req.userRole = decoded.userRole;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token has expired' });
        }
        return res.status(401).json({ message: 'Token verification failed' });
    }
};

// Role-based access control middleware
export const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.userRole) {
            return res.status(403).json({ message: 'Role information not available' });
        }

        if (!roles.includes(req.userRole)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        next();
    };
};

// Data sanitization middleware
export const sanitizeInput = (req, res, next) => {
    // Sanitize string inputs
    const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;
        return str
            .trim()
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+=/gi, ''); // Remove event handlers
    };

    // Recursively sanitize object properties
    const sanitizeObject = (obj) => {
        if (typeof obj !== 'object' || obj === null) return obj;

        if (Array.isArray(obj)) {
            return obj.map(sanitizeObject);
        }

        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                sanitized[key] = sanitizeString(value);
            } else if (typeof value === 'object') {
                sanitized[key] = sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    };

    req.body = sanitizeObject(req.body);
    req.query = sanitizeObject(req.query);
    next();
};

// Security headers middleware
export const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'", "https://*.google.com"],
        },
    },
    // Disable HSTS in development to allow HTTP localhost access
    hsts: process.env.NODE_ENV === 'production' ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    } : false,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// CORS configuration
export const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'https://edvisehk.com', // Replace with your actual domain
            'https://www.edvisehk.com',
            'https://edvise.onrender.com',
            'https://216.24.57.1'
        ];

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

// Request logging middleware
export const requestLogger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    });

    next();
};

// Error handling middleware
export const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Don't leak error details in production
    const error = process.env.NODE_ENV === 'production'
        ? { message: 'Internal server error' }
        : { message: err.message, stack: err.stack };

    res.status(err.status || 500).json(error);
};

// Database query protection middleware
export const protectDatabaseQueries = (req, res, next) => {
    // Prevent NoSQL injection
    const sanitizeQuery = (query) => {
        if (typeof query !== 'object' || query === null) return query;

        const sanitized = {};
        for (const [key, value] of Object.entries(query)) {
            // Remove MongoDB operators that could be used for injection
            if (key.startsWith('$')) {
                continue;
            }

            if (typeof value === 'object' && value !== null) {
                sanitized[key] = sanitizeQuery(value);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    };

    req.body = sanitizeQuery(req.body);
    req.query = sanitizeQuery(req.query);
    next();
}; 