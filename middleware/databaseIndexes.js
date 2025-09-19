import mongoose from 'mongoose';

// Database indexing configuration for performance optimization
export const createDatabaseIndexes = async () => {
    try {
        console.log('Creating database indexes...');

        // User collection indexes
        const User = mongoose.model('User');

        // Primary user lookup indexes
        await User.collection.createIndex({ Email_Address: 1 }, { unique: true });
        await User.collection.createIndex({ User_ID: 1 }, { unique: true });
        // await User.collection.createIndex({ UID: 1 }, { sparse: true }); // Already defined in schema as unique & sparse

        // Performance indexes for common queries
        await User.collection.createIndex({ User_Role: 1 });
        await User.collection.createIndex({ School_Name: 1 });
        await User.collection.createIndex({ Form: 1 });
        await User.collection.createIndex({ createdAt: -1 });
        await User.collection.createIndex({ lastLogin: -1 });

        // Compound indexes for complex queries
        await User.collection.createIndex({ User_Role: 1, Form: 1 });
        await User.collection.createIndex({ School_Name: 1, Form: 1 });
        await User.collection.createIndex({ createdAt: -1, User_Role: 1 });

        // Event collection indexes
        const Event = mongoose.model('Event');
        await Event.collection.createIndex({ Event_ID: 1 }, { unique: true });
        await Event.collection.createIndex({ Event_Type: 1 });
        await Event.collection.createIndex({ Event_StartDate: 1 });
        await Event.collection.createIndex({ Host_ID: 1 });

        // Activity collection indexes
        const Activity = mongoose.model('Activity');
        await Activity.collection.createIndex({ Act_ID: 1 }, { unique: true });
        await Activity.collection.createIndex({ Title: 1 });

        // Participant collection indexes
        const Participant = mongoose.model('Participant');
        await Participant.collection.createIndex({ 'Parti_ID.User_ID': 1 });
        await Participant.collection.createIndex({ 'Parti_ID.Act_ID': 1 });
        await Participant.collection.createIndex({ 'Parti_ID.User_ID': 1, 'Parti_ID.Act_ID': 1 });

        // Usage collection indexes
        const Usage = mongoose.model('Usage');
        await Usage.collection.createIndex({ route_path: 1, route_method: 1 });
        await Usage.collection.createIndex({ 'access_logs.timestamp': -1 });
        await Usage.collection.createIndex({ last_accessed: -1 });
        await Usage.collection.createIndex({ total_requests: -1 });

        console.log('Database indexes created successfully');
    } catch (error) {
        console.error('Error creating database indexes:', error);
        // Don't throw error - indexes might already exist
    }
};

// Index monitoring and maintenance
export const monitorIndexUsage = async () => {
    try {
        const User = mongoose.model('User');

        // Get index usage statistics
        const indexStats = await User.collection.aggregate([
            { $indexStats: {} }
        ]).toArray();

        console.log('Index usage statistics:', indexStats);

        // Check for unused indexes
        const unusedIndexes = indexStats.filter(index =>
            index.accesses && index.accesses.ops === 0
        );

        if (unusedIndexes.length > 0) {
            console.log('Unused indexes found:', unusedIndexes.map(idx => idx.name));
        }

    } catch (error) {
        console.error('Error monitoring index usage:', error);
    }
};

// Query performance monitoring
export const logSlowQueries = (threshold = 100) => {
    return async (req, res, next) => {
        const start = Date.now();

        // Store original send method
        const originalSend = res.send;

        // Override send method to capture response time
        res.send = function (data) {
            const duration = Date.now() - start;

            if (duration > threshold) {
                console.warn(`Slow query detected: ${req.method} ${req.originalUrl} - ${duration}ms`);
                console.warn('Query parameters:', {
                    body: req.body,
                    query: req.query,
                    params: req.params
                });
            }

            // Call original send method
            originalSend.call(this, data);
        };

        next();
    };
};

// Database connection optimization
export const optimizeDatabaseConnection = () => {
    // Set connection pool options
    mongoose.connection.on('connected', () => {
        console.log('MongoDB connection optimized');
    });

    // Handle connection errors
    mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
    });

    // Handle disconnection
    mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
    });
};

// Query optimization helpers
export const queryOptimizationHelpers = {
    // Select only needed fields
    selectFields: (fields) => {
        const projection = {};
        fields.forEach(field => {
            projection[field] = 1;
        });
        return projection;
    },

    // Pagination helper
    paginate: (page = 1, limit = 10) => {
        const skip = (page - 1) * limit;
        return { skip, limit: parseInt(limit) };
    },

    // Sort helper
    sortBy: (field, order = 'asc') => {
        const sortOrder = order === 'desc' ? -1 : 1;
        return { [field]: sortOrder };
    }
}; 