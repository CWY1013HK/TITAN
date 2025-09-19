# Usage Tracking System

## Overview

The EDVise backend now includes a comprehensive usage tracking system that monitors API route usage. This system tracks every request to the API endpoints and stores detailed information about usage patterns.

## Database Schema

### USAGE Collection

The `USAGE` collection stores usage statistics for each route with the following schema:

```javascript
{
  route_path: String,           // The route path (e.g., "/auth/login")
  route_method: String,         // HTTP method (GET, POST, PUT, PATCH, DELETE)
  total_requests: Number,       // Total number of requests to this route
  access_logs: [               // Array of individual access logs (max 1000)
    {
      User_ID: String,         // User ID (or "anonymous" for unauthenticated)
      timestamp: Date,          // When the request was made
      ip_address: String,       // Client IP address
      user_agent: String,       // User agent string
      response_status: Number,  // HTTP response status code
      response_time: Number     // Response time in milliseconds
    }
  ],
  daily_usage_tally: [         // Daily aggregated usage data
    {
      date: String,            // Date in YYYY-MM-DD format
      total_requests: Number,  // Total requests for this date
      unique_users: Number,    // Number of unique users for this date
      avg_response_time: Number, // Average response time for this date
      status_codes: Object,    // Object of status code -> count
      user_ids: [String]       // Array of unique user IDs for this date
    }
  ],
  last_accessed: Date,         // Last time this route was accessed
  created_at: Date,            // When this route was first accessed
  updated_at: Date             // Last time this document was updated
}
```

## Features

### Automatic Tracking
- **Non-blocking**: Usage tracking happens asynchronously and doesn't affect response times
- **Comprehensive**: Tracks all routes with detailed access logs
- **Efficient**: Maintains only the last 1000 access logs per route to prevent document size issues
- **Analytics-Preserving**: When logs are popped, data is aggregated into daily tallies for long-term analytics
- **Indexed**: Optimized database indexes for fast queries

### Tracked Information
- Route path and HTTP method
- User ID (or "anonymous" for unauthenticated requests)
- Timestamp of each request
- IP address and user agent
- Response status code and response time
- Total request count per route

## API Endpoints

### Admin Endpoints (Staff only)

#### Get All Usage Statistics
```
GET /api/usage/stats
```
Returns all routes with their usage statistics, sorted by total requests.

#### Get Route-Specific Statistics
```
GET /api/usage/stats/:route_path?method=GET&include_daily_tallies=true
```
Returns detailed statistics for a specific route, including recent access logs and optional daily tallies.

#### Get Top Used Routes
```
GET /api/usage/top-routes?limit=10
```
Returns the most frequently used routes.

#### Get Usage by Date Range
```
GET /api/usage/by-date?start_date=2024-01-01&end_date=2024-12-31&route_path=/auth/login
```
Returns usage statistics filtered by date range and optionally by route.

#### Get Daily Usage Analytics
```
GET /api/usage/daily-analytics?route_path=/auth/login&method=POST&start_date=2024-01-01&end_date=2024-12-31
```
Returns detailed daily usage analytics with aggregated data from daily tallies.

#### Get Aggregated Usage Statistics
```
GET /api/usage/aggregated-stats?include_daily_tallies=true
```
Returns usage statistics with optional daily tallies for comprehensive analytics.

### User Endpoints

#### Get My Usage Statistics
```
GET /api/usage/my-stats
```
Returns usage statistics for the authenticated user.

## Implementation Details

### Middleware Integration
The tracking system uses Express middleware that:
1. Captures request start time
2. Overrides `res.send()` to capture response status and time
3. Asynchronously logs usage data to MongoDB
4. Maintains performance by not blocking the response

### Database Indexes
The following indexes are created for optimal performance:
- `{ route_path: 1, route_method: 1 }` - For route lookups
- `{ 'access_logs.timestamp': -1 }` - For time-based queries
- `{ last_accessed: -1 }` - For recent activity queries
- `{ total_requests: -1 }` - For popularity queries

### Error Handling
- Usage tracking errors are logged but don't affect the main request
- Graceful degradation if the USAGE collection is unavailable
- Automatic cleanup of old access logs to prevent document size issues
- Data preservation through daily tallies when logs are removed

## Usage Examples

### Viewing Top Routes
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:3000/api/usage/top-routes?limit=5"
```

### Checking Specific Route Usage
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:3000/api/usage/stats/auth/login?method=POST"
```

### Getting Daily Analytics
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:3000/api/usage/daily-analytics?route_path=/auth/login&start_date=2024-01-01&end_date=2024-12-31"
```

### Getting Aggregated Stats with Daily Tallies
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:3000/api/usage/aggregated-stats?include_daily_tallies=true"
```

### User's Own Usage
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:3000/api/usage/my-stats"
```

## Security Considerations

- Admin endpoints require staff role (`Sta`)
- User endpoints require authentication
- IP addresses and user agents are logged for security analysis
- Access logs are limited to prevent document size issues

## Performance Impact

- **Minimal overhead**: Tracking happens asynchronously
- **No blocking**: Main request flow is unaffected
- **Efficient storage**: Only last 1000 logs per route are kept
- **Optimized queries**: Database indexes ensure fast lookups

## Monitoring and Analytics

The usage tracking system provides valuable insights for:
- **Performance monitoring**: Response times and error rates
- **User behavior analysis**: Most popular routes and features
- **Capacity planning**: Traffic patterns and peak usage times
- **Security monitoring**: Suspicious access patterns
- **Feature adoption**: Which API endpoints are most used

## Future Enhancements

Potential improvements could include:
- Real-time usage dashboards
- Automated alerts for unusual usage patterns
- Integration with monitoring tools
- Advanced analytics with machine learning insights
- Rate limiting based on usage patterns
- Historical trend analysis using daily tallies
- Export functionality for analytics data 