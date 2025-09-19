import mongoose from 'mongoose';

// USAGE Table - Track route usage
const usageSchema = new mongoose.Schema({
    route_path: { type: String, required: true, unique: true },
    route_method: { type: String, required: true, enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
    total_requests: { type: Number, default: 0 },
    access_logs: [{
        User_ID: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        ip_address: String,
        user_agent: String,
        response_status: Number,
        response_time: Number
    }],
    // Daily usage tally to maintain analytics when logs are popped
    daily_usage_tally: [{
        date: { type: String, required: true }, // Format: YYYY-MM-DD
        total_requests: { type: Number, default: 0 },
        unique_users: { type: Number, default: 0 },
        avg_response_time: { type: Number, default: 0 },
        status_codes: { type: Object, default: {} }, // Object of status code -> count
        user_ids: [{ type: String }] // Track unique users per day (array instead of Set)
    }],
    last_accessed: { type: Date, default: Date.now },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Index for efficient queries
usageSchema.index({ route_path: 1, route_method: 1 });
usageSchema.index({ 'access_logs.timestamp': -1 });
usageSchema.index({ last_accessed: -1 });
usageSchema.index({ 'daily_usage_tally.date': -1 });

// Export the model - this prevents duplicate model compilation
export const Usage = mongoose.models.Usage || mongoose.model('Usage', usageSchema, 'USAGE');

// Export helper functions
export { aggregateAllData };

// Middleware to track route usage
export const trackRouteUsage = async (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;

    // Override res.send to capture response status and time
    res.send = function (data) {
        const responseTime = Date.now() - startTime;
        const responseStatus = res.statusCode;

        // Track usage asynchronously (don't block the response)
        trackUsage(req, responseStatus, responseTime).catch(err => {
            console.error('Error tracking usage:', err);
        });

        return originalSend.call(this, data);
    };

    next();
};

// Helper function to get date string in YYYY-MM-DD format
const getDateString = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Helper function to update daily tally
const updateDailyTally = (dailyTally, logEntry) => {
    const dateStr = getDateString(logEntry.timestamp);
    const existingTally = dailyTally.find(tally => tally.date === dateStr);

    if (existingTally) {
        // Update existing tally
        existingTally.total_requests += 1;
        existingTally.avg_response_time =
            ((existingTally.avg_response_time * (existingTally.total_requests - 1)) + logEntry.response_time) / existingTally.total_requests;

        // Update status codes
        const statusStr = logEntry.response_status.toString();
        existingTally.status_codes[statusStr] = (existingTally.status_codes[statusStr] || 0) + 1;

        // Add user if not already tracked (using array instead of Set)
        if (!existingTally.user_ids.includes(logEntry.User_ID)) {
            existingTally.user_ids.push(logEntry.User_ID);
            existingTally.unique_users += 1;
        }
    } else {
        // Create new tally
        const newTally = {
            date: dateStr,
            total_requests: 1,
            unique_users: 1,
            avg_response_time: logEntry.response_time,
            status_codes: { [logEntry.response_status.toString()]: 1 },
            user_ids: [logEntry.User_ID] // Array instead of Set
        };
        dailyTally.push(newTally);
    }
};

// Helper function to aggregate all data (popped + unpopped)
const aggregateAllData = (usageDoc) => {
    const aggregatedData = {};

    // Process daily tallies (popped data)
    if (usageDoc.daily_usage_tally) {
        usageDoc.daily_usage_tally.forEach(tally => {
            if (!aggregatedData[tally.date]) {
                aggregatedData[tally.date] = {
                    total_requests: 0,
                    unique_users: new Set(),
                    response_times: [],
                    status_codes: {}
                };
            }
            aggregatedData[tally.date].total_requests += tally.total_requests;
            tally.user_ids.forEach(userId => aggregatedData[tally.date].unique_users.add(userId));
            // For average calculation, we'll use the stored average and count
            for (let i = 0; i < tally.total_requests; i++) {
                aggregatedData[tally.date].response_times.push(tally.avg_response_time);
            }
            // Merge status codes
            Object.entries(tally.status_codes).forEach(([code, count]) => {
                aggregatedData[tally.date].status_codes[code] = (aggregatedData[tally.date].status_codes[code] || 0) + count;
            });
        });
    }

    // Process current access logs (unpopped data)
    if (usageDoc.access_logs) {
        usageDoc.access_logs.forEach(log => {
            const dateStr = getDateString(log.timestamp);
            if (!aggregatedData[dateStr]) {
                aggregatedData[dateStr] = {
                    total_requests: 0,
                    unique_users: new Set(),
                    response_times: [],
                    status_codes: {}
                };
            }
            aggregatedData[dateStr].total_requests += 1;
            aggregatedData[dateStr].unique_users.add(log.User_ID);
            aggregatedData[dateStr].response_times.push(log.response_time);
            const statusStr = log.response_status.toString();
            aggregatedData[dateStr].status_codes[statusStr] = (aggregatedData[dateStr].status_codes[statusStr] || 0) + 1;
        });
    }

    // Convert to final format
    return Object.entries(aggregatedData).map(([date, data]) => ({
        date,
        total_requests: data.total_requests,
        unique_users: data.unique_users.size,
        avg_response_time: data.response_times.length > 0 ?
            data.response_times.reduce((sum, time) => sum + time, 0) / data.response_times.length : 0,
        status_codes: data.status_codes,
        user_ids: Array.from(data.unique_users)
    }));
};

// Function to track usage
const trackUsage = async (req, responseStatus, responseTime) => {
    try {
        const routePath = req.route?.path || req.path;
        const routeMethod = req.method;
        const userId = req.userId || 'anonymous';
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent') || '';

        // Find or create usage document for this route
        const usageDoc = await Usage.findOneAndUpdate(
            {
                route_path: routePath,
                route_method: routeMethod
            },
            {
                $inc: { total_requests: 1 },
                $set: {
                    last_accessed: new Date(),
                    updated_at: new Date()
                },
                $push: {
                    access_logs: {
                        User_ID: userId,
                        timestamp: new Date(),
                        ip_address: ipAddress,
                        user_agent: userAgent,
                        response_status: responseStatus,
                        response_time: responseTime
                    }
                }
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );

        // Keep only last 1000 access logs per route to prevent document size issues
        if (usageDoc.access_logs.length > 1000) {
            // Get the oldest log entry before popping
            const oldestLog = usageDoc.access_logs[0];

            // Update daily tally with the oldest log before removing it
            if (oldestLog) {
                updateDailyTally(usageDoc.daily_usage_tally || [], oldestLog);
            }

            // Remove oldest log and update daily tally
            await Usage.updateOne(
                { _id: usageDoc._id },
                {
                    $pop: { access_logs: -1 }, // Remove oldest log
                    $set: { daily_usage_tally: usageDoc.daily_usage_tally || [] }
                }
            );
        }

    } catch (error) {
        console.error('Error tracking route usage:', error);
    }
}; 