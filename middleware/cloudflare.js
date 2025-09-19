import { securityConfig } from '../config/security.js';

// Cloudflare-specific middleware
export const cloudflareMiddleware = (req, res, next) => {
    const cfConfig = securityConfig.cloudflare;

    if (!cfConfig.enabled) {
        return next();
    }

    // Trust Cloudflare's proxy headers
    req.trustProxy = true;

    // Extract real IP from Cloudflare headers
    req.realIP = req.headers['cf-connecting-ip'] ||
        req.headers['x-forwarded-for']?.split(',')[0] ||
        req.headers['x-real-ip'] ||
        req.ip;

    // Log Cloudflare headers for debugging
    if (securityConfig.logging.logCloudflareHeaders) {
        console.log('Cloudflare Headers:', {
            'CF-Connecting-IP': req.headers['cf-connecting-ip'],
            'X-Forwarded-For': req.headers['x-forwarded-for'],
            'CF-IPCountry': req.headers['cf-ipcountry'],
            'CF-Visitor': req.headers['cf-visitor'],
            'User-Agent': req.headers['user-agent']
        });
    }

    // Add Cloudflare information to request
    req.cloudflare = {
        country: req.headers['cf-ipcountry'],
        visitor: req.headers['cf-visitor'],
        rayId: req.headers['cf-ray'],
        realIP: req.realIP
    };

    next();
};

// Cloudflare-compatible rate limiting
export const createCloudflareRateLimit = (rateLimitConfig) => {
    return (req, res, next) => {
        const cfConfig = securityConfig.cloudflare;

        // If Cloudflare rate limiting is enabled, use it as primary
        if (cfConfig.enabled && cfConfig.cfRateLimit.enabled) {
            // Check if request is coming through Cloudflare
            if (req.headers['cf-ray']) {
                // Trust Cloudflare's rate limiting
                return next();
            }
        }

        // Fall back to application rate limiting
        return rateLimitConfig(req, res, next);
    };
};

// Cloudflare-specific CORS configuration
export const cloudflareCORS = (req, res, next) => {
    const cfConfig = securityConfig.cloudflare;

    if (!cfConfig.enabled) {
        return next();
    }

    // Add Cloudflare-specific CORS headers
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, CF-Connecting-IP, X-Forwarded-For');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    next();
};

// Cloudflare performance optimization
export const cloudflareOptimization = (req, res, next) => {
    const cfConfig = securityConfig.cloudflare;

    if (!cfConfig.enabled) {
        return next();
    }

    // Add Cloudflare-specific headers for better performance
    res.header('Cache-Control', 'public, max-age=300'); // 5 minutes cache
    res.header('CDN-Cache-Control', 'public, max-age=3600'); // 1 hour CDN cache
    res.header('Vary', 'Accept-Encoding, Accept-Language');

    // Add security headers compatible with Cloudflare
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');

    next();
};

// Cloudflare logging middleware
export const cloudflareLogging = (req, res, next) => {
    const cfConfig = securityConfig.cloudflare;

    if (!cfConfig.enabled) {
        return next();
    }

    // Log Cloudflare-specific information
    const cfInfo = {
        rayId: req.headers['cf-ray'],
        country: req.headers['cf-ipcountry'],
        realIP: req.realIP,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
    };

    console.log('Cloudflare Request:', cfInfo);

    // Add response logging
    res.on('finish', () => {
        console.log('Cloudflare Response:', {
            rayId: req.headers['cf-ray'],
            statusCode: res.statusCode,
            responseTime: Date.now() - req.startTime
        });
    });

    next();
};

// Cloudflare security headers
export const cloudflareSecurityHeaders = (req, res, next) => {
    const cfConfig = securityConfig.cloudflare;

    if (!cfConfig.enabled) {
        return next();
    }

    // Add Cloudflare-specific security headers
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; frame-src 'self' https://*.google.com;");
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');

    next();
}; 