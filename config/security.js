// Security configuration for EDVise Backend
export const securityConfig = {
    // JWT Configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'edvise-secret-key-2024',
        expiresIn: '24h',
        issuer: 'edvise-backend',
        audience: 'edvise-frontend',
        algorithm: 'HS256'
    },

    // Password Configuration
    password: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        saltRounds: 10
    },

    // Rate Limiting Configuration (Cloudflare-compatible)
    rateLimit: {
        general: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 200 // Increased for Cloudflare compatibility
        },
        auth: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 10 // Slightly increased for Cloudflare
        },
        ai: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 50 // Increased for AI endpoints
        }
    },

    // CORS Configuration (Cloudflare-compatible)
    cors: {
        allowedOrigins: [
            'http://localhost:3000',
            'http://localhost:3001',
            'https://yourdomain.com', // Replace with your domain
            'https://www.yourdomain.com',
            'https://*.cloudflare.com' // Allow Cloudflare origins
        ],
        credentials: true,
        optionsSuccessStatus: 200
    },

    // Cloudflare-specific configuration
    cloudflare: {
        enabled: process.env.CLOUDFLARE_ENABLED === 'true',
        // Trust Cloudflare's IP headers
        trustProxy: true,
        // Cloudflare-specific rate limiting
        cfRateLimit: {
            enabled: true,
            // Use Cloudflare's rate limiting as primary
            fallbackToApp: true
        },
        // Headers to trust from Cloudflare
        trustedHeaders: [
            'CF-Connecting-IP',
            'X-Forwarded-For',
            'X-Real-IP',
            'CF-IPCountry',
            'CF-Visitor'
        ]
    },

    // Database Security
    database: {
        maxQueryTime: 5000, // 5 seconds
        maxResultSize: 1000, // Maximum documents per query
        allowedOperations: ['find', 'findOne', 'updateOne', 'deleteOne'],
        blockedOperations: ['$where', '$eval', '$mapReduce']
    },

    // Input Validation
    validation: {
        maxStringLength: 1000,
        maxArrayLength: 100,
        maxObjectDepth: 5,
        allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf'],
        maxFileSize: 5 * 1024 * 1024 // 5MB
    },

    // Logging Configuration
    logging: {
        logLevel: process.env.LOG_LEVEL || 'info',
        logSlowQueries: true,
        slowQueryThreshold: 200, // milliseconds
        logSecurityEvents: true,
        logUserActions: true,
        // Cloudflare-specific logging
        logCloudflareHeaders: true
    },

    // Environment-specific settings
    environment: {
        development: {
            cors: {
                allowedOrigins: ['http://localhost:3000', 'http://localhost:3001']
            },
            logging: {
                logLevel: 'debug',
                logSlowQueries: true
            },
            cloudflare: {
                enabled: false
            }
        },
        production: {
            cors: {
                allowedOrigins: ['https://yourdomain.com', 'https://www.yourdomain.com']
            },
            logging: {
                logLevel: 'warn',
                logSlowQueries: false
            },
            cloudflare: {
                enabled: true
            }
        }
    }
};

// Security utility functions
export const securityUtils = {
    // Validate password strength
    validatePassword: (password) => {
        const config = securityConfig.password;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChars = /[@$!%*?&]/.test(password);
        const isLongEnough = password.length >= config.minLength;

        return {
            isValid: hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChars && isLongEnough,
            errors: {
                tooShort: !isLongEnough,
                noUpperCase: !hasUpperCase,
                noLowerCase: !hasLowerCase,
                noNumbers: !hasNumbers,
                noSpecialChars: !hasSpecialChars
            }
        };
    },

    // Sanitize user input
    sanitizeInput: (input) => {
        if (typeof input !== 'string') return input;

        return input
            .trim()
            .replace(/[<>]/g, '') // Remove HTML tags
            .replace(/javascript:/gi, '') // Remove javascript protocol
            .replace(/on\w+=/gi, '') // Remove event handlers
            .replace(/data:/gi, '') // Remove data protocol
            .replace(/vbscript:/gi, ''); // Remove vbscript protocol
    },

    // Generate secure random string
    generateSecureString: (length = 32) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    // Validate email format
    validateEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Check if request is from allowed origin
    isAllowedOrigin: (origin) => {
        const allowedOrigins = securityConfig.cors.allowedOrigins;
        return allowedOrigins.includes(origin) || allowedOrigins.includes('*');
    }
};

// Security middleware configuration
export const getSecurityConfig = () => {
    const env = process.env.NODE_ENV || 'development';
    const baseConfig = securityConfig;
    const envConfig = securityConfig.environment[env] || {};

    return {
        ...baseConfig,
        ...envConfig
    };
};

// Export default configuration
export default securityConfig; 