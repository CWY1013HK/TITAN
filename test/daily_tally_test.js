import mongoose from 'mongoose';
import { Usage } from '../models/usage.js';

// Test script for daily tally functionality
const testDailyTally = async () => {
    try {
        console.log('Testing daily tally functionality...');

        // Connect to MongoDB (adjust connection string as needed)
        await mongoose.connect('mongodb://localhost:27017/edvise', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('Connected to MongoDB');

        // Test route path
        const testRoute = '/test/daily-tally';
        const testMethod = 'GET';

        // Clear any existing test data
        await Usage.deleteOne({ route_path: testRoute, route_method: testMethod });

        console.log('Cleared existing test data');

        // Simulate multiple requests on different dates
        const testDates = [
            new Date('2024-01-01T10:00:00Z'),
            new Date('2024-01-01T11:00:00Z'),
            new Date('2024-01-01T12:00:00Z'),
            new Date('2024-01-02T10:00:00Z'),
            new Date('2024-01-02T11:00:00Z'),
            new Date('2024-01-03T10:00:00Z')
        ];

        console.log('Simulating requests...');

        for (let i = 0; i < testDates.length; i++) {
            const date = testDates[i];
            const userId = `user_${i % 3}`; // 3 different users

            // Create a mock request object
            const mockReq = {
                route: { path: testRoute },
                path: testRoute,
                method: testMethod,
                userId: userId,
                ip: '127.0.0.1',
                get: () => 'test-user-agent'
            };

            // Simulate the tracking function
            const usageDoc = await Usage.findOneAndUpdate(
                {
                    route_path: testRoute,
                    route_method: testMethod
                },
                {
                    $inc: { total_requests: 1 },
                    $set: {
                        last_accessed: date,
                        updated_at: date
                    },
                    $push: {
                        access_logs: {
                            User_ID: userId,
                            timestamp: date,
                            ip_address: '127.0.0.1',
                            user_agent: 'test-user-agent',
                            response_status: 200,
                            response_time: 100 + Math.random() * 50
                        }
                    }
                },
                {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true
                }
            );

            // Simulate the daily tally update when logs exceed 1000
            if (usageDoc.access_logs.length > 1000) {
                const oldestLog = usageDoc.access_logs[0];
                if (oldestLog) {
                    // Update daily tally
                    const dateStr = `${oldestLog.timestamp.getFullYear()}-${String(oldestLog.timestamp.getMonth() + 1).padStart(2, '0')}-${String(oldestLog.timestamp.getDate()).padStart(2, '0')}`;
                    const existingTally = usageDoc.daily_usage_tally?.find(tally => tally.date === dateStr);

                    if (existingTally) {
                        existingTally.total_requests += 1;
                        existingTally.avg_response_time =
                            ((existingTally.avg_response_time * (existingTally.total_requests - 1)) + oldestLog.response_time) / existingTally.total_requests;

                        const statusStr = oldestLog.response_status.toString();
                        existingTally.status_codes[statusStr] = (existingTally.status_codes[statusStr] || 0) + 1;

                        if (!existingTally.user_ids.includes(oldestLog.User_ID)) {
                            existingTally.user_ids.push(oldestLog.User_ID);
                            existingTally.unique_users += 1;
                        }
                    } else {
                        const newTally = {
                            date: dateStr,
                            total_requests: 1,
                            unique_users: 1,
                            avg_response_time: oldestLog.response_time,
                            status_codes: { [oldestLog.response_status.toString()]: 1 },
                            user_ids: [oldestLog.User_ID]
                        };
                        usageDoc.daily_usage_tally = usageDoc.daily_usage_tally || [];
                        usageDoc.daily_usage_tally.push(newTally);
                    }
                }

                await Usage.updateOne(
                    { _id: usageDoc._id },
                    {
                        $pop: { access_logs: -1 },
                        $set: { daily_usage_tally: usageDoc.daily_usage_tally || [] }
                    }
                );
            }

            console.log(`Request ${i + 1} processed for date: ${date.toISOString()}`);
        }

        // Fetch and display results
        const result = await Usage.findOne({ route_path: testRoute, route_method: testMethod }).lean();

        console.log('\n=== Test Results ===');
        console.log('Route:', result.route_path);
        console.log('Method:', result.route_method);
        console.log('Total Requests:', result.total_requests);
        console.log('Access Logs Count:', result.access_logs?.length || 0);
        console.log('Daily Tallies Count:', result.daily_usage_tally?.length || 0);

        if (result.daily_usage_tally) {
            console.log('\nDaily Tallies:');
            result.daily_usage_tally.forEach(tally => {
                console.log(`  ${tally.date}: ${tally.total_requests} requests, ${tally.unique_users} unique users, avg ${Math.round(tally.avg_response_time)}ms`);
            });
        }

        console.log('\nTest completed successfully!');

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

// Run the test
testDailyTally(); 