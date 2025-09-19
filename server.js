import createError from 'http-errors';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import axios from 'axios';
import logger from 'morgan';
import dotenv from 'dotenv';
import cors from 'cors';
import compression from 'compression';

// Import security middleware
import {
    createRateLimiters,
    securityHeaders,
    corsOptions,
    requestLogger,
    errorHandler,
    protectDatabaseQueries
} from './middleware/security.js';

// Import database optimizations
import {
    createDatabaseIndexes,
    optimizeDatabaseConnection,
    logSlowQueries
} from './middleware/databaseIndexes.js';

// Import Cloudflare middleware
import {
    cloudflareMiddleware,
    cloudflareCORS,
    cloudflareOptimization,
    cloudflareLogging,
    cloudflareSecurityHeaders
} from './middleware/cloudflare.js';

// Configure dotenv
dotenv.config();

// Debug environment variables
console.log('Environment Variables:');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not Set');
console.log('MONGO_URI:', process.env.MONGO_URI ? 'Set' : 'Not Set');
console.log('CLOUDFLARE_ENABLED:', process.env.CLOUDFLARE_ENABLED || 'false');

import { userRoutes } from "./routes/userRoutes.js";
import { chatbotRoutes } from "./routes/chatbotRoutes.js";
import programmeRoutes from "./routes/programmeRoutes.js";

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { connectDB } from './config/db.js';

var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.set('port', process.env.PORT || 3000);
console.log("+++++++++++++++" + app.get('port'));

// Security middleware setup
const { generalLimiter, authLimiter, aiLimiter } = createRateLimiters();

// Apply Cloudflare middleware first
app.use(cloudflareMiddleware);
app.use(cloudflareLogging);

// Apply security headers
app.use(securityHeaders);
app.use(cloudflareSecurityHeaders);

// Apply CORS with Cloudflare compatibility
app.use(cors(corsOptions));
app.use(cloudflareCORS);

// Apply compression for better performance
app.use(compression());

// Apply Cloudflare optimization
app.use(cloudflareOptimization);

// Apply rate limiting (Cloudflare-compatible)
app.use('/api/auth', authLimiter); // Stricter for auth endpoints
app.use('/api/chatbot', aiLimiter); // AI-specific rate limiting
app.use('/api', generalLimiter); // General rate limiting

// Apply database query protection
app.use(protectDatabaseQueries);

// Apply request logging
app.use(requestLogger);

// Apply slow query monitoring
app.use(logSlowQueries(200)); // Log queries taking more than 200ms

app.use(logger('dev'));
app.use(express.json({ limit: '10mb' })); // Limit request size
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());

// Routes to API
app.use('/api', userRoutes);
app.use('/api', chatbotRoutes);
app.use('/api', programmeRoutes);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "client/build")));

// Special handling for icon files to prevent Safari caching issues
app.use('/asset/icons', (req, res, next) => {
    // Set cache headers for icon files to prevent aggressive Safari caching
    res.set({
        'Cache-Control': 'public, max-age=86400', // 24 hours
        'Vary': 'Accept-Encoding',
        'X-Content-Type-Options': 'nosniff'
    });
    next();
}, express.static(path.join(__dirname, "client/build/asset/icons")));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

app.post("/api/connectiontest", async (req, res) => {
    try {
        console.log(connectDB);
        const connection = await connectDB();
        res.send(connection);
    } catch (error) {
        console.error("Error in connection check:", error.message);
        res.status(500).send('Error in importation');
    }
})

// catch 404 and forward to error handler 
app.use(function (req, res, next) {
    next(createError(404));
});

// Apply error handling middleware
app.use(errorHandler);

//console.log(process.env.MONGO_URI);

app.listen(app.get('port'), async function () {
    try {
        // Connect to database
        await connectDB();

        // Optimize database connection
        optimizeDatabaseConnection();

        // Create database indexes
        await createDatabaseIndexes();

        console.log('Express server listening on port ' + app.get('port'));
        console.log('Security middleware enabled');
        console.log('Database indexes created');
        console.log('Cloudflare compatibility:', process.env.CLOUDFLARE_ENABLED === 'true' ? 'Enabled' : 'Disabled');
    } catch (error) {
        console.error('Server startup error:', error);
        process.exit(1);
    }
});