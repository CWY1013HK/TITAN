import express from 'express';
const router = express.Router();
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import axios from 'axios';

// Import security middleware
import {
    validateRegistration,
    validateLogin,
    verifyToken,
    requireRole,
    sanitizeInput
} from '../middleware/security.js';

// Import query optimization helpers
import { queryOptimizationHelpers } from '../middleware/databaseIndexes.js';

// Import shared usage tracking
import { Usage, trackRouteUsage, aggregateAllData } from '../models/usage.js';

// Universal Routes
let schemas = {};
schemas["USAGE"] = Usage;

function toTitleCase(string) {
    return string.replace(
        /\w\S*/g,
        text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
    );
}

// Enhanced universal reading with security and optimization
router.post('/database/read', sanitizeInput, trackRouteUsage, async (req, res) => {
    console.log(req.body);
    const { collection, ID, rowID } = req.body;

    // Input validation
    if (!ID || !rowID) {
        return res.status(400).json({ message: `Please provide ${ID} and rowID.` });
    }

    if (!Object.keys(schemas).includes(collection)) {
        return res.status(400).json({ message: `Invalid collection: ${collection}.` });
    }

    try {
        console.log(`${collection}.read: Began pick-up`);

        // Use optimized query with field selection
        const row = await schemas[collection]
            .findOne({ [ID]: rowID })
            .select('-__v') // Exclude version field
            .lean() // Return plain JavaScript object for better performance
            .exec();

        console.log(`${collection}.read: Began pull-out from`, row)

        if (!row) {
            return res.status(404).json({ message: `${toTitleCase(collection)} not found.` });
        }

        return res.status(200).json(row);
    } catch (err) {
        console.error('Database read error:', err);
        return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
});

// Enhanced universal deleting with security
router.post('/database/delete', sanitizeInput, trackRouteUsage, async (req, res) => {
    const { collection, ID, rowID } = req.body;

    // Input validation
    if (!ID || !rowID) {
        return res.status(400).json({ message: `Please provide ${ID} and rowID.` });
    }

    if (!Object.keys(schemas).includes(collection)) {
        return res.status(400).json({ message: `Invalid collection: ${collection}.` });
    }

    try {
        console.log(`${collection}.delete: Began pick-up`)

        const result = await schemas[collection].deleteMany({ [ID]: rowID });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: `${toTitleCase(collection)} not found.` });
        }

        return res.status(200).json({
            message: `${toTitleCase(collection)} deleted successfully.`,
            deletedCount: result.deletedCount,
            [ID]: rowID
        });
    } catch (err) {
        console.error('Database delete error:', err);
        return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
});

// Enhanced universal writing with security
router.post('/database/write', sanitizeInput, trackRouteUsage, async (req, res) => {
    const { collection, ID, row } = req.body;

    // Input validation
    if (!ID || !row || !row[ID]) {
        return res.status(400).json({ message: `Please provide ${ID} and valid row data.` });
    }

    if (!Object.keys(schemas).includes(collection)) {
        return res.status(400).json({ message: `Invalid collection: ${collection}.` });
    }

    try {
        console.log(`${collection}.write: Began update for ${ID}:`, row[ID]);
        console.log(`${collection}.write: Update data:`, row);

        // Use updateOne with $set for partial updates
        const result = await schemas[collection].updateOne(
            { [ID]: row[ID] },
            { $set: row },
            { upsert: true }
        );

        console.log(`${collection}.write: Update result:`, result);

        if (result.matchedCount === 0 && result.upsertedCount === 0) {
            return res.status(404).json({ message: `${toTitleCase(collection)} could not be updated. Please try again.` });
        }

        // Fetch the updated document to verify
        const updatedDoc = await schemas[collection]
            .findOne({ [ID]: row[ID] })
            .select('-__v')
            .lean()
            .exec();

        console.log(`${collection}.write: Updated document:`, updatedDoc);

        return res.status(200).json({
            message: `${toTitleCase(collection)} updated successfully.`,
            [ID]: row[ID],
            document: updatedDoc
        });
    } catch (err) {
        console.error(`${collection}.write: Error:`, err);
        return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
});

// Enhanced universal reading all records with pagination
router.post('/database/readAll', sanitizeInput, trackRouteUsage, async (req, res) => {
    const { collection, page = 1, limit = 50, sortBy, sortOrder = 'asc' } = req.body;

    // Input validation
    if (!collection) {
        return res.status(400).json({ message: 'Collection name is required' });
    }

    if (!Object.keys(schemas).includes(collection)) {
        return res.status(400).json({ message: `Invalid collection: ${collection}. Valid collections are: ${Object.keys(schemas).join(', ')}` });
    }

    try {
        console.log(`${collection}.readAll: Began pick-up`);

        // Build query with pagination and sorting
        const { skip, limit: queryLimit } = queryOptimizationHelpers.paginate(page, limit);
        const sort = sortBy ? queryOptimizationHelpers.sortBy(sortBy, sortOrder) : {};

        const rows = await schemas[collection]
            .find({})
            .select('-__v')
            .sort(sort)
            .skip(skip)
            .limit(queryLimit)
            .lean()
            .exec();

        // Get total count for pagination info
        const totalCount = await schemas[collection].countDocuments({});

        console.log(`${collection}.readAll: Found ${rows.length} records out of ${totalCount}`);

        return res.status(200).json({
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: queryLimit,
                total: totalCount,
                pages: Math.ceil(totalCount / queryLimit)
            }
        });
    } catch (err) {
        console.error(`${collection}.readAll: Error:`, err);
        return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
});

// USER Table
const userSchema = new mongoose.Schema({
    User_ID: { type: String, required: true, unique: true },
    UID: { type: String, unique: true, sparse: true }, // Optional school-based ID
    Title: { type: String, enum: ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.'], default: 'Mr.' },
    First_Name: { type: String, required: true },
    Last_Name: { type: String, required: true },
    School_Name: { type: String },
    School_District: { type: String }, // Added School_District field
    Nickname: { type: String },
    Form: { type: Number, required: true, min: 1, max: 6 }, // Form 1-6 as number
    Gender: { type: String }, // No longer required
    Email_Address: { type: String, required: true, unique: true },
    Password: { type: String, required: true },
    Tel: String,
    User_Role: { type: String, enum: ['Sta', 'Stu', 'Tea'], default: 'Stu' },
    direct_marketing: { type: Boolean, default: false },
    email_list: { type: Boolean, default: false },
    card_id: String,
    ability_6d: { type: [Number], default: [1.5, 1.5, 1.5, 1.5, 1.5, 1.5] },
    area_like: { type: [String], default: [] },
    area_disl: { type: [String], default: [] },
    eddy_recommendation_title: { type: String, default: "" },
    eddy_recommendation_text: { type: String, default: "" },
    needs_recommendation_regeneration: { type: Boolean, default: true },
    dse_scores: { type: Object, default: {} }, // DSE scores as key-value pairs
    jupas_programme_order: { type: Object, default: {} }, // JUPAS programme order as {code: position}
    event_types: { type: [String], default: ['academic', 'extracurricular', 'personal'] },
    trajectory_events: [{
        id: { type: String, required: true },
        name: { type: String, required: true },
        year: { type: Number, required: true },
        type: { type: String, required: true },
        description: { type: String, default: "" },
        timestamp: { type: Date, default: Date.now }
    }],
    trajectory_connections: [{
        id: { type: String, required: true },
        from: { type: String, required: true },
        to: { type: String, required: true },
        type: { type: String, required: true },
        description: { type: String, default: "" }
    }],
    trajectory_analyses: [{
        id: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        content: { type: String, required: true }
    }],
    createdAt: { type: Date, default: Date.now },
    lastLogin: Date,
    preferred_language: { type: String, enum: ['tc', 'sc', 'en'], default: 'en' }
});

// Add username availability check endpoint
router.post('/check-username', trackRouteUsage, async (req, res) => {
    try {
        const { username } = req.body;

        // If username is empty, return available (since we'll generate one)
        if (!username || username.trim() === '') {
            return res.json({ available: true });
        }

        const existingUser = await User.findOne({ User_ID: username });
        return res.json({ available: !existingUser });
    } catch (error) {
        console.error('Username check error:', error);
        res.status(500).json({ message: 'Error checking username availability', error: error.message });
    }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (this.isModified('Password')) {
        this.Password = await bcrypt.hash(this.Password, 10);
    }
    next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.Password);
};

const User = mongoose.model('User', userSchema, 'USER');
schemas["USER"] = User;

// Enhanced login route with security middleware
router.post('/auth/login', validateLogin, sanitizeInput, trackRouteUsage, async (req, res) => {
    const { email, username, password } = req.body;

    if (!password) {
        return res.status(400).json({ message: 'Password is required' });
    }

    if (!email && !username) {
        return res.status(400).json({ message: 'Either email or username is required' });
    }

    try {
        // Find user by either email or username with optimized query
        const user = await User.findOne({
            $or: [
                { Email_Address: email },
                { User_ID: username }
            ]
        })
            .select('+Password') // Include password for comparison
            .lean(); // Use lean for better performance

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Compare password using bcrypt
        const isMatch = await bcrypt.compare(password, user.Password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Update last login time
        await User.updateOne(
            { User_ID: user.User_ID },
            { $set: { lastLogin: new Date() } }
        );

        // Generate JWT token with enhanced security
        const token = jwt.sign(
            {
                userId: user.User_ID,
                userRole: user.User_Role,
                email: user.Email_Address
            },
            process.env.JWT_SECRET || 'edvise-secret-key-2024',
            {
                expiresIn: '24h',
                issuer: 'edvise-backend',
                audience: 'edvise-frontend'
            }
        );

        // Return user data without sensitive information
        res.json({
            token,
            user: {
                User_ID: user.User_ID,
                First_Name: user.First_Name,
                Last_Name: user.Last_Name,
                Nickname: user.Nickname,
                Email_Address: user.Email_Address,
                User_Role: user.User_Role,
                preferred_language: user.preferred_language
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// Enhanced JWT verification middleware (now imported from security.js)
// The verifyToken middleware is now imported from security.js with enhanced features

// Enhanced protected route with security and optimization
router.get('/auth/me', verifyToken, trackRouteUsage, async (req, res) => {
    try {
        const user = await User.findOne({ User_ID: req.userId })
            .select('-Password -__v') // Exclude sensitive and version fields
            .lean(); // Use lean for better performance

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Auth me error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update user data
router.patch('/auth/me', verifyToken, trackRouteUsage, async (req, res) => {
    try {
        console.log('Received update request:', req.body);

        const user = await User.findOne({ User_ID: req.userId });
        if (!user) {
            console.log('User not found:', req.userId);
            return res.status(404).json({ message: 'User not found' });
        }

        // Update only the provided fields
        const updates = req.body;
        console.log('Updating fields:', Object.keys(updates));

        // Special handling for trajectory arrays
        if (updates.trajectory_events) {
            console.log('Updating trajectory events:', updates.trajectory_events);
            // Validate each event has required fields
            const validEvents = updates.trajectory_events.every(event =>
                event.id && event.name && event.year && event.type
            );
            if (!validEvents) {
                console.error('Invalid event data structure');
                return res.status(400).json({ message: 'Invalid event data structure' });
            }
            user.trajectory_events = updates.trajectory_events;
        }

        if (updates.trajectory_connections) {
            console.log('Updating trajectory connections:', updates.trajectory_connections);
            // Validate each connection has required fields
            const validConnections = updates.trajectory_connections.every(conn =>
                conn.id && conn.from && conn.to && conn.type
            );
            if (!validConnections) {
                console.error('Invalid connection data structure');
                return res.status(400).json({ message: 'Invalid connection data structure' });
            }
            user.trajectory_connections = updates.trajectory_connections;
        }

        // Handle other fields
        Object.keys(updates).forEach(key => {
            if (key !== 'trajectory_events' && key !== 'trajectory_connections' && key in user) {
                user[key] = updates[key];
            }
        });

        console.log('Saving updated user...');
        await user.save();

        console.log('Fetching updated user...');
        const updatedUser = await User.findOne({ User_ID: req.userId }).select('-Password');
        console.log('Update successful');

        res.json(updatedUser);
    } catch (error) {
        console.error('Update error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            message: 'Server error',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// EVENT Table
const eventSchema = new mongoose.Schema({
    Event_ID: String,
    Event_Title: String,
    Event_Type: String,
    Event_Desc: String,
    Event_StartDate: String,
    Event_EndDate: String,
    Host_ID: [String]
});
const Event = mongoose.model('Event', eventSchema, 'EVENT');
schemas["EVENT"] = Event;

// ACTIVITY Table
const questionSchema = new mongoose.Schema({
    Type: String,
    Text: String,
    Answers: [String],
    Scores: [Number]
});

const activitySchema = new mongoose.Schema({
    Act_ID: String,
    Title: String,
    Pointer: Number,
    Ending: Number,
    Questions: [questionSchema]
});
const Activity = mongoose.model('Activity', activitySchema, 'ACTIVITY');
schemas["ACTIVITY"] = Activity;

// PARTICIANT Table   
const partSchema = new mongoose.Schema({
    User_ID: String,
    Act_ID: String
});

const partiSchema = new mongoose.Schema({
    Parti_ID: partSchema,
    Nickname: String,
    Answers: [String],
    Scores: [Number]
});
const Participant = mongoose.model('Participant', partiSchema, 'PARTICIPANT');
schemas["PARTICIPANT"] = Participant;

// Registration route
router.post('/register', trackRouteUsage, async (req, res) => {
    try {
        const {
            User_ID,
            UID,
            Title,
            First_Name,
            Last_Name,
            School_Name,
            School_District,
            Nickname,
            Form,
            Gender,
            Email_Address,
            Password,
            Tel,
            User_Role,
            direct_marketing,
            email_list,
            ability_6d
        } = req.body;

        // Use provided User_ID or generate one
        let finalUserId = User_ID;
        if (!finalUserId || finalUserId.trim() === '') {
            const timestamp = Date.now().toString(36);
            const randomStr = Math.random().toString(36).substring(2, 7);
            finalUserId = `USER_${timestamp}${randomStr}`;
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [
                { Email_Address: Email_Address },
                { User_ID: finalUserId }
            ]
        });

        if (existingUser) {
            let message = 'User already exists with this ';
            if (existingUser.Email_Address === Email_Address) message += 'email address.';
            else message += 'username.';
            return res.status(400).json({ message });
        }

        // Create new user
        const user = new User({
            User_ID: finalUserId,
            UID,
            Title: Title || 'Mr.',
            First_Name,
            Last_Name,
            School_Name,
            School_District,
            Nickname,
            Form: parseInt(Form),
            Gender,
            Email_Address,
            Password, // Will be hashed by the pre-save middleware
            Tel,
            User_Role: User_Role || 'Stu',
            direct_marketing: direct_marketing || false,
            email_list: email_list || false,
            ability_6d: ability_6d || [1.5, 1.5, 1.5, 1.5, 1.5, 1.5],
            needs_recommendation_regeneration: true, // Explicitly set to true for new users
            event_types: ['academic', 'extracurricular', 'personal'],
            trajectory_events: [],
            trajectory_connections: [],
            trajectory_analyses: []
        });

        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.User_ID },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                User_ID: user.User_ID,
                UID: user.UID,
                Title: user.Title,
                First_Name: user.First_Name,
                Last_Name: user.Last_Name,
                School_Name: user.School_Name,
                School_District: user.School_District,
                Nickname: user.Nickname,
                Form: user.Form,
                Email_Address: user.Email_Address,
                ability_6d: user.ability_6d
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
});

// PRESET_SUBJECTS Table
const presetSubjectSchema = new mongoose.Schema({
    _id: String,
    code: String,
    item: String,
    reqr: [Number]
});
const PresetSubject = mongoose.model('PresetSubject', presetSubjectSchema, 'preset_subjects');
schemas["preset_subjects"] = PresetSubject;

// PROG_DATA_2025 Table
const progDataSchema = new mongoose.Schema({
    _id: String,
    code: String,
    name_short: String,
    name_eng: String,
    name_chi: String,
    description: String,
    website: String,
    ability: [Number],
    area_like: [Number],
    area_disl: [Number]
});
const ProgData = mongoose.model('ProgData', progDataSchema, 'prog_data_2025');
schemas["prog_data_2025"] = ProgData;

// Contact form submission
router.post('/contact', trackRouteUsage, async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Validate required fields
        if (!name || !email || !subject || !message) {
            console.log('Contact form: Missing required fields', { name, email, subject, message });
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if email configuration is available
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('Contact form submission received (email not configured):', {
                name, email, subject, message
            });
            // Return success but log that email wasn't sent
            return res.status(200).json({
                message: 'Contact form submitted successfully. We will get back to you soon.',
                note: 'Email service not configured - message logged to console'
            });
        }

        // Debug: Log email config
        console.log('Contact form: EMAIL_USER:', process.env.EMAIL_USER);
        console.log('Contact form: EMAIL_PASS length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 'undefined');

        // Create nodemailer transporter
        let transporter;
        try {
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });
            console.log('Contact form: Nodemailer transporter created');
        } catch (transporterError) {
            console.error('Contact form: Error creating transporter:', transporterError);
            return res.status(500).json({ error: 'Failed to create email transporter', details: transporterError.message });
        }

        // Email options
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: 'info4edvise@gmail.com', // Fixed recipient email
            cc: email, // CC the user's submitted email
            subject: `Contact Form: ${subject}`,
            text: `\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}\n      `,
            html: `\n<h2>New Contact Form Submission</h2>\n<p><strong>Name:</strong> ${name}</p>\n<p><strong>Email:</strong> ${email}</p>\n<p><strong>Subject:</strong> ${subject}</p>\n<hr>\n<p><strong>Message:</strong></p>\n<p>${message.replace(/\n/g, '<br>')}</p>\n      `
        };

        // Debug: Log mail options (without revealing password)
        console.log('Contact form: mailOptions:', { ...mailOptions, from: '[REDACTED]', to: mailOptions.to });

        // Send email
        try {
            const info = await transporter.sendMail(mailOptions);
            console.log('Contact form: Email sent successfully:', info);
            res.status(200).json({ message: 'Email sent successfully' });
        } catch (sendError) {
            console.error('Contact form: Error sending email:', sendError);
            res.status(500).json({ error: 'Failed to send email', details: sendError.message });
        }
    } catch (error) {
        console.error('Contact form: Unexpected error:', error);
        res.status(500).json({ error: 'Failed to process contact form', details: error.message });
    }
});

// CHAT Table
const chatSchema = new mongoose.Schema({
    Chat_ID: { type: String, required: true, unique: true },
    User_ID: { type: String, required: true }, // Reference to User.User_ID
    User_Context: {
        Nickname: String,
        School_Name: String,
        Form: Number,
        ability_6d: [Number],
        eddy_recommendation_title: String,
        eddy_recommendation_text: String,
        trajectory_events: [{
            id: String,
            name: String,
            year: Number,
            type: String,
            description: String,
            timestamp: Date
        }],
        trajectory_connections: [{
            id: String,
            from: String,
            to: String,
            type: String
        }],
        trajectory_analyses: [{
            id: String,
            timestamp: Date,
            content: String
        }],
        preferred_language: String
    },
    Messages: [{
        Text: String,
        Is_Bot: Boolean,
        Timestamp: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Chat = mongoose.model('Chat', chatSchema, 'CHAT');
schemas["CHAT"] = Chat;

// Chat routes
router.post('/chat/create', verifyToken, trackRouteUsage, async (req, res) => {
    try {
        const { User_ID, initial_analysis_id } = req.body;

        // Fetch user profile for context
        const user = await User.findOne({ User_ID }).select('Nickname School_Name Form ability_6d eddy_recommendation_title eddy_recommendation_text trajectory_events trajectory_connections trajectory_analyses preferred_language');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate unique Chat_ID
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 7);
        const Chat_ID = `CHAT_${timestamp}${randomStr}`;

        // Create initial message if analysis is provided
        let initialMessage = null;
        if (initial_analysis_id) {
            const analysis = user.trajectory_analyses.find(a => a.id === initial_analysis_id);
            if (analysis) {
                initialMessage = {
                    Text: `I'd like to discuss this analysis:\n\n${analysis.content}`,
                    Is_Bot: false,
                    Timestamp: new Date()
                };
            }
        }

        const chat = new Chat({
            Chat_ID,
            User_ID,
            User_Context: {
                Nickname: user.Nickname,
                School_Name: user.School_Name,
                Form: user.Form,
                ability_6d: user.ability_6d,
                eddy_recommendation_title: user.eddy_recommendation_title,
                eddy_recommendation_text: user.eddy_recommendation_text,
                trajectory_events: user.trajectory_events,
                trajectory_connections: user.trajectory_connections,
                trajectory_analyses: user.trajectory_analyses,
                preferred_language: user.preferred_language || 'en'
            },
            Messages: initialMessage ? [initialMessage] : []
        });

        await chat.save();
        res.status(201).json(chat);
    } catch (error) {
        console.error('Chat creation error:', error);
        res.status(500).json({ message: 'Error creating chat', error: error.message });
    }
});

router.post('/chat/:chat_id/message', verifyToken, trackRouteUsage, async (req, res) => {
    try {
        const { chat_id } = req.params;
        const { Text, reference_analysis_id, detailed } = req.body; // Add detailed parameter

        const chat = await Chat.findOne({ Chat_ID: chat_id });
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        // Add user message
        chat.Messages.push({
            Text,
            Is_Bot: false,
            Timestamp: new Date()
        });

        // Format trajectory events for context (keep only recent ones)
        const recentEvents = chat.User_Context.trajectory_events
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 3)
            .map(event => `${event.name} (${event.year}): ${event.description}`)
            .join('\n');

        // Get specific analysis if referenced, otherwise use most recent
        let analysisContext = '';
        if (reference_analysis_id) {
            const referencedAnalysis = chat.User_Context.trajectory_analyses
                .find(analysis => analysis.id === reference_analysis_id);
            if (referencedAnalysis) {
                analysisContext = `Referenced Analysis:\n${referencedAnalysis.content}`;
            }
        } else {
            // Only include most recent analysis if no specific reference
            const recentAnalysis = chat.User_Context.trajectory_analyses
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 1)
                .map(analysis => analysis.content)
                .join('\n');
            if (recentAnalysis) {
                analysisContext = `Recent Analysis:\n${recentAnalysis}`;
            }
        }

        // Get bot response using Fireworks API with user context
        const url = "https://api.fireworks.ai/inference/v1/chat/completions";

        // Get user's language preference from chat context
        const userLanguage = chat.User_Context.preferred_language || 'en';

        // Language-specific instructions
        let languageInstruction = '';
        switch (userLanguage) {
            case 'tc':
                languageInstruction = 'Please respond in vernacular Cantonese (廣東話/粵語). Use natural, conversational Cantonese that Hong Kong students would use. Feel free to use Cantonese expressions and phrases. Refer to yourself as 愛迪生 instead of Eddy.';
                break;
            case 'sc':
                languageInstruction = 'Please respond in Simplified Chinese (简体中文). Use clear, natural Chinese that mainland Chinese students would understand. Refer to yourself as 爱迪生 instead of Eddy.';
                break;
            case 'en':
            default:
                languageInstruction = 'Please respond in English.';
                break;
        }

        const systemPrompt = `You are Eddy, a secondary school career consultant. 
        You are talking to ${chat.User_Context.Nickname || 'the student'} from ${chat.User_Context.School_Name} in Form ${chat.User_Context.Form}.
        Their ability scores are: ${chat.User_Context.ability_6d.join(', ')}.
        Previous recommendation: ${chat.User_Context.eddy_recommendation_title} - ${chat.User_Context.eddy_recommendation_text}.
        
        Recent trajectory events:
        ${recentEvents}
        
        ${analysisContext}
        
        ${languageInstruction}
        
        Provide ${detailed ? 'detailed,' : 'brief but'} personalized advice based on this context. Be friendly and professional. ${detailed ? 'Mark any titles with **title**. No colon after titles.' : 'No titles needed.'}`;

        const payload = {
            model: "accounts/fireworks/models/llama-v3p3-70b-instruct",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: Text
                }
            ]
        };

        const headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": "Bearer fw_3ZcXEuXj75H9tozkM3zciTLc"
        };

        const response = await axios.post(url, payload, { headers });
        const botResponse = {
            Text: response.data.choices[0].message.content,
            Is_Bot: true,
            Timestamp: new Date()
        };

        // Add bot message
        chat.Messages.push(botResponse);
        chat.updatedAt = new Date();

        await chat.save();
        res.status(200).json(chat);
    } catch (error) {
        console.error('Message addition error:', error);
        res.status(500).json({ message: 'Error adding message', error: error.message });
    }
});

// Add new route to get available analyses for reference
router.get('/chat/:chat_id/analyses', verifyToken, trackRouteUsage, async (req, res) => {
    try {
        const { chat_id } = req.params;
        console.log('Fetching analyses for chat:', chat_id);

        const chat = await Chat.findOne({ Chat_ID: chat_id });
        if (!chat) {
            console.log('Chat not found:', chat_id);
            return res.status(404).json({ message: 'Chat not found' });
        }

        console.log('Found chat with analyses:', chat.User_Context?.trajectory_analyses?.length || 0);

        // Return formatted list of available analyses
        const analyses = chat.User_Context.trajectory_analyses
            .sort((a, b) => b.timestamp - a.timestamp)
            .map(analysis => ({
                id: analysis.id,
                timestamp: analysis.timestamp,
                content: analysis.content,
                preview: analysis.content.substring(0, 100) + '...'
            }));

        console.log('Returning analyses:', analyses.length);
        res.status(200).json(analyses);
    } catch (error) {
        console.error('Error fetching analyses:', error);
        res.status(500).json({ message: 'Error fetching analyses', error: error.message });
    }
});

router.get('/chat/:chat_id', verifyToken, trackRouteUsage, async (req, res) => {
    try {
        const { chat_id } = req.params;
        const chat = await Chat.findOne({ Chat_ID: chat_id });

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        res.status(200).json(chat);
    } catch (error) {
        console.error('Chat retrieval error:', error);
        res.status(500).json({ message: 'Error retrieving chat', error: error.message });
    }
});

// Get all chats for a user
router.get('/chat/user/:user_id', verifyToken, trackRouteUsage, async (req, res) => {
    try {
        const { user_id } = req.params;
        const chats = await Chat.find({ User_ID: user_id })
            .sort({ updatedAt: -1 }) // Sort by most recent first
            .exec();

        res.status(200).json(chats);
    } catch (error) {
        console.error('Error fetching user chats:', error);
        res.status(500).json({ message: 'Error fetching chat history', error: error.message });
    }
});

// DSE Scores API endpoints
// Save DSE scores for a user
router.post('/dse-scores/save', verifyToken, trackRouteUsage, async (req, res) => {
    try {
        const { scores } = req.body;
        const userId = req.userId;

        if (!scores || typeof scores !== 'object') {
            return res.status(400).json({ message: 'Scores object is required' });
        }

        // Find user and update DSE scores
        const user = await User.findOne({ User_ID: userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update DSE scores
        user.dse_scores = scores;
        await user.save();

        res.status(200).json({
            message: 'DSE scores saved successfully',
            scores: user.dse_scores
        });
    } catch (error) {
        console.error('Error saving DSE scores:', error);
        res.status(500).json({ message: 'Error saving DSE scores', error: error.message });
    }
});

// Load DSE scores for a user
router.get('/dse-scores/load', verifyToken, trackRouteUsage, async (req, res) => {
    try {
        const userId = req.userId;

        // Find user
        const user = await User.findOne({ User_ID: userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Initialize dse_scores if it doesn't exist (for legacy users)
        if (!user.dse_scores) {
            user.dse_scores = {};
            await user.save();
        }

        res.status(200).json({
            scores: user.dse_scores || {}
        });
    } catch (error) {
        console.error('Error loading DSE scores:', error);
        res.status(500).json({ message: 'Error loading DSE scores', error: error.message });
    }
});

// Migration endpoint to initialize dse_scores for legacy users
router.post('/dse-scores/migrate', verifyToken, trackRouteUsage, async (req, res) => {
    try {
        const userId = req.userId;

        // Find user
        const user = await User.findOne({ User_ID: userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Initialize dse_scores if it doesn't exist
        if (!user.dse_scores) {
            user.dse_scores = {};
            await user.save();
            res.status(200).json({
                message: 'DSE scores field initialized for legacy user',
                scores: user.dse_scores
            });
        } else {
            res.status(200).json({
                message: 'DSE scores field already exists',
                scores: user.dse_scores
            });
        }
    } catch (error) {
        console.error('Error migrating DSE scores:', error);
        res.status(500).json({ message: 'Error migrating DSE scores', error: error.message });
    }
});

// JUPAS Programme Order API endpoints
// Save JUPAS programme order for a user
router.post('/jupas-order/save', verifyToken, trackRouteUsage, async (req, res) => {
    try {
        const { programmeOrder } = req.body;
        const userId = req.userId;

        if (!programmeOrder || typeof programmeOrder !== 'object') {
            return res.status(400).json({ message: 'Programme order object is required' });
        }

        // Find user and update JUPAS programme order
        const user = await User.findOne({ User_ID: userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update JUPAS programme order
        user.jupas_programme_order = programmeOrder;
        await user.save();

        res.status(200).json({
            message: 'JUPAS programme order saved successfully',
            programmeOrder: user.jupas_programme_order
        });
    } catch (error) {
        console.error('Error saving JUPAS programme order:', error);
        res.status(500).json({ message: 'Error saving JUPAS programme order', error: error.message });
    }
});

// Load JUPAS programme order for a user
router.get('/jupas-order/load', verifyToken, trackRouteUsage, async (req, res) => {
    try {
        const userId = req.userId;

        // Find user
        const user = await User.findOne({ User_ID: userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Initialize jupas_programme_order if it doesn't exist (for legacy users)
        if (!user.jupas_programme_order) {
            user.jupas_programme_order = {};
            await user.save();
        }

        res.status(200).json({
            programmeOrder: user.jupas_programme_order || {}
        });
    } catch (error) {
        console.error('Error loading JUPAS programme order:', error);
        res.status(500).json({ message: 'Error loading JUPAS programme order', error: error.message });
    }
});

// Migration endpoint to initialize jupas_programme_order for legacy users
router.post('/jupas-order/migrate', verifyToken, trackRouteUsage, async (req, res) => {
    try {
        const userId = req.userId;

        // Find user
        const user = await User.findOne({ User_ID: userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Initialize jupas_programme_order if it doesn't exist
        if (!user.jupas_programme_order) {
            user.jupas_programme_order = {};
            await user.save();
            res.status(200).json({
                message: 'JUPAS programme order field initialized for legacy user',
                programmeOrder: user.jupas_programme_order
            });
        } else {
            res.status(200).json({
                message: 'JUPAS programme order field already exists',
                programmeOrder: user.jupas_programme_order
            });
        }
    } catch (error) {
        console.error('Error migrating JUPAS programme order:', error);
        res.status(500).json({ message: 'Error migrating JUPAS programme order', error: error.message });
    }
});

// Usage Statistics API endpoints
// Get all usage statistics (admin only)
router.get('/usage/stats', verifyToken, requireRole('Sta'), trackRouteUsage, async (req, res) => {
    try {
        const usageStats = await Usage.find({})
            .sort({ total_requests: -1 })
            .select('route_path route_method total_requests last_accessed created_at')
            .lean()
            .exec();

        res.status(200).json({
            success: true,
            total_routes: usageStats.length,
            data: usageStats
        });
    } catch (error) {
        console.error('Error fetching usage stats:', error);
        res.status(500).json({ message: 'Error fetching usage statistics', error: error.message });
    }
});

// Get usage statistics for a specific route
router.get('/usage/stats/:route_path', verifyToken, requireRole('Sta'), trackRouteUsage, async (req, res) => {
    try {
        const { route_path } = req.params;
        const { method = 'GET', include_daily_tallies = 'false' } = req.query;

        let selectFields = 'route_path route_method total_requests last_accessed created_at access_logs';
        if (include_daily_tallies === 'true') {
            selectFields += ' daily_usage_tally';
        }

        const usageDoc = await Usage.findOne({
            route_path: route_path,
            route_method: method.toUpperCase()
        }).select(selectFields).lean();

        if (!usageDoc) {
            return res.status(404).json({
                success: false,
                message: 'Usage statistics not found for this route'
            });
        }

        // Get recent access logs (last 100)
        const recentLogs = usageDoc.access_logs
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 100);

        const response = {
            success: true,
            route_path: usageDoc.route_path,
            route_method: usageDoc.route_method,
            total_requests: usageDoc.total_requests,
            last_accessed: usageDoc.last_accessed,
            created_at: usageDoc.created_at,
            recent_access_logs: recentLogs
        };

        // Include daily tallies if requested
        if (include_daily_tallies === 'true' && usageDoc.daily_usage_tally) {
            response.daily_usage_tally = usageDoc.daily_usage_tally.map(tally => ({
                date: tally.date,
                total_requests: tally.total_requests,
                unique_users: tally.unique_users,
                avg_response_time: Math.round(tally.avg_response_time * 100) / 100,
                status_codes: tally.status_codes || {},
                user_ids: tally.user_ids || []
            }));
        }

        res.status(200).json(response);
    } catch (error) {
        console.error('Error fetching route usage stats:', error);
        res.status(500).json({ message: 'Error fetching route usage statistics', error: error.message });
    }
});

// Get usage statistics for current user
router.get('/usage/my-stats', verifyToken, trackRouteUsage, async (req, res) => {
    try {
        const userId = req.userId;

        // Find all routes where this user has made requests
        const userUsage = await Usage.find({
            'access_logs.User_ID': userId
        })
            .sort({ last_accessed: -1 })
            .select('route_path route_method total_requests last_accessed')
            .lean()
            .exec();

        // Count total requests by this user
        const userStats = userUsage.map(route => {
            const userRequests = route.access_logs.filter(log => log.User_ID === userId).length;
            return {
                route_path: route.route_path,
                route_method: route.route_method,
                total_requests: route.total_requests,
                user_requests: userRequests,
                last_accessed: route.last_accessed
            };
        });

        res.status(200).json({
            success: true,
            user_id: userId,
            total_routes_used: userStats.length,
            data: userStats
        });
    } catch (error) {
        console.error('Error fetching user usage stats:', error);
        res.status(500).json({ message: 'Error fetching user usage statistics', error: error.message });
    }
});

// Get top used routes (admin only)
router.get('/usage/top-routes', verifyToken, requireRole('Sta'), trackRouteUsage, async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const topRoutes = await Usage.find({})
            .sort({ total_requests: -1 })
            .limit(parseInt(limit))
            .select('route_path route_method total_requests last_accessed')
            .lean()
            .exec();

        res.status(200).json({
            success: true,
            limit: parseInt(limit),
            data: topRoutes
        });
    } catch (error) {
        console.error('Error fetching top routes:', error);
        res.status(500).json({ message: 'Error fetching top routes', error: error.message });
    }
});

// Get usage statistics by date range (admin only)
router.get('/usage/by-date', verifyToken, requireRole('Sta'), trackRouteUsage, async (req, res) => {
    try {
        const { start_date, end_date, route_path } = req.query;

        let query = {};

        // Add date filter if provided
        if (start_date && end_date) {
            query['access_logs.timestamp'] = {
                $gte: new Date(start_date),
                $lte: new Date(end_date)
            };
        }

        // Add route filter if provided
        if (route_path) {
            query.route_path = route_path;
        }

        const usageStats = await Usage.find(query)
            .sort({ last_accessed: -1 })
            .select('route_path route_method total_requests last_accessed')
            .lean()
            .exec();

        res.status(200).json({
            success: true,
            start_date: start_date || 'all',
            end_date: end_date || 'all',
            route_path: route_path || 'all',
            total_routes: usageStats.length,
            data: usageStats
        });
    } catch (error) {
        console.error('Error fetching usage by date:', error);
        res.status(500).json({ message: 'Error fetching usage by date', error: error.message });
    }
});

// Get daily usage analytics (admin only)
router.get('/usage/daily-analytics', verifyToken, requireRole('Sta'), trackRouteUsage, async (req, res) => {
    try {
        const { route_path, method, start_date, end_date } = req.query;

        let query = {};

        // Add route filter if provided
        if (route_path) {
            query.route_path = route_path;
        }

        // Add method filter if provided
        if (method) {
            query.route_method = method.toUpperCase();
        }

        const usageDocs = await Usage.find(query)
            .select('route_path route_method daily_usage_tally total_requests access_logs')
            .lean()
            .exec();

        // Process aggregated data (popped + unpopped)
        const dailyAnalytics = [];
        usageDocs.forEach(doc => {
            // Aggregate all data using the helper function
            const aggregatedData = aggregateAllData(doc);

            if (aggregatedData.length > 0) {
                // Filter by date range if provided
                let filteredData = aggregatedData;
                if (start_date && end_date) {
                    filteredData = aggregatedData.filter(tally =>
                        tally.date >= start_date && tally.date <= end_date
                    );
                }

                // Sort by date
                filteredData.sort((a, b) => a.date.localeCompare(b.date));

                dailyAnalytics.push({
                    route_path: doc.route_path,
                    route_method: doc.route_method,
                    total_requests: doc.total_requests,
                    daily_tallies: filteredData.map(tally => ({
                        date: tally.date,
                        total_requests: tally.total_requests,
                        unique_users: tally.unique_users,
                        avg_response_time: Math.round(tally.avg_response_time * 100) / 100, // Round to 2 decimal places
                        status_codes: tally.status_codes || {},
                        user_ids: tally.user_ids || []
                    }))
                });
            }
        });

        res.status(200).json({
            success: true,
            route_path: route_path || 'all',
            method: method || 'all',
            start_date: start_date || 'all',
            end_date: end_date || 'all',
            total_routes: dailyAnalytics.length,
            data: dailyAnalytics
        });
    } catch (error) {
        console.error('Error fetching daily analytics:', error);
        res.status(500).json({ message: 'Error fetching daily analytics', error: error.message });
    }
});

// Get aggregated usage statistics with daily tallies (admin only)
router.get('/usage/aggregated-stats', verifyToken, requireRole('Sta'), trackRouteUsage, async (req, res) => {
    try {
        const { include_daily_tallies = 'false' } = req.query;

        let selectFields = 'route_path route_method total_requests last_accessed created_at';
        if (include_daily_tallies === 'true') {
            selectFields += ' daily_usage_tally';
        }

        const usageStats = await Usage.find({})
            .sort({ total_requests: -1 })
            .select(selectFields)
            .lean()
            .exec();

        // Process the data to include daily tallies if requested
        const processedData = usageStats.map(stat => {
            const result = {
                route_path: stat.route_path,
                route_method: stat.route_method,
                total_requests: stat.total_requests,
                last_accessed: stat.last_accessed,
                created_at: stat.created_at
            };

            if (include_daily_tallies === 'true' && stat.daily_usage_tally) {
                result.daily_usage_tally = stat.daily_usage_tally.map(tally => ({
                    date: tally.date,
                    total_requests: tally.total_requests,
                    unique_users: tally.unique_users,
                    avg_response_time: Math.round(tally.avg_response_time * 100) / 100,
                    status_codes: tally.status_codes || {},
                    user_ids: tally.user_ids || []
                }));
            }

            return result;
        });

        res.status(200).json({
            success: true,
            total_routes: usageStats.length,
            include_daily_tallies: include_daily_tallies === 'true',
            data: processedData
        });
    } catch (error) {
        console.error('Error fetching aggregated usage stats:', error);
        res.status(500).json({ message: 'Error fetching aggregated usage statistics', error: error.message });
    }
});

// User Analytics Aggregation Endpoint
router.get('/analytics/user-stats', verifyToken, requireRole('Sta'), async (req, res) => {
    try {
        // Fetch only needed fields for efficiency
        const users = await User.find({}, { dse_scores: 1, createdAt: 1, _id: 0 }).lean();
        console.log('[user-stats] Users fetched:', users.length);
        if (users.length > 0) {
            console.log('[user-stats] Example user:', users[0]);
        }

        // DSE Score Distribution
        const dseScoreDistribution = {};
        users.forEach(user => {
            const scores = user.dse_scores || {};

            // Map old format keys to subject codes
            const mappedScores = {};
            let coreSubjectCode = null;

            Object.entries(scores).forEach(([key, value]) => {
                switch (key) {
                    case 'Chinese Language':
                        mappedScores['CHI'] = value;
                        break;
                    case 'English Language':
                        mappedScores['ENG'] = value;
                        break;
                    case 'Mathematics Compulsory Part':
                        mappedScores['MAT'] = value;
                        break;
                    case 'Core Subject Code':
                        coreSubjectCode = value;
                        break;
                    case 'Core Score':
                        // Map to the actual core subject code
                        if (coreSubjectCode) {
                            // Translate Chinese score values to English
                            let translatedScore = value;
                            if (coreSubjectCode === 'CSD') {
                                switch (value) {
                                    case '達標': // Traditional Chinese
                                    case '达标': // Simplified Chinese
                                        translatedScore = 'Attained';
                                        break;
                                    case '不達標': // Traditional Chinese
                                    case '不达标': // Simplified Chinese
                                        translatedScore = 'Failed';
                                        break;
                                    default:
                                        translatedScore = value; // Keep original if not recognized
                                }
                            }
                            mappedScores[coreSubjectCode] = translatedScore;
                        } else {
                            // Default to CSD if no core subject code is found
                            let translatedScore = value;
                            switch (value) {
                                case '達標': // Traditional Chinese
                                case '达标': // Simplified Chinese
                                    translatedScore = 'Attained';
                                    break;
                                case '不達標': // Traditional Chinese
                                case '不达标': // Simplified Chinese
                                    translatedScore = 'Failed';
                                    break;
                                default:
                                    translatedScore = value; // Keep original if not recognized
                            }
                            mappedScores['CSD'] = translatedScore;
                        }
                        break;
                    default:
                        // For other subjects, assume the key is already a subject code
                        mappedScores[key] = value;
                }
            });

            // Aggregate the mapped scores
            Object.entries(mappedScores).forEach(([subject, score]) => {
                if (!dseScoreDistribution[subject]) dseScoreDistribution[subject] = {};
                dseScoreDistribution[subject][score] = (dseScoreDistribution[subject][score] || 0) + 1;
            });
        });
        console.log('[user-stats] dseScoreDistribution sample:', Object.entries(dseScoreDistribution).slice(0, 3));

        // User Signups by Day
        const signupsByDay = {};
        users.forEach(user => {
            if (user.createdAt) {
                const date = new Date(user.createdAt);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                signupsByDay[key] = (signupsByDay[key] || 0) + 1;
            }
        });
        console.log('[user-stats] signupsByDay sample:', Object.entries(signupsByDay).slice(0, 3));

        // USAGE: Aggregate all access_logs timestamps per day, and per route
        const Usage = mongoose.models.Usage || mongoose.model('Usage');
        const allUsageDocs = await Usage.find({}, { access_logs: 1, route_path: 1, _id: 0 }).lean();
        let usageByDay = {};
        let usageByDayByRoute = {};
        allUsageDocs.forEach(doc => {
            const route = doc.route_path || 'unknown';
            (doc.access_logs || []).forEach(log => {
                if (log.timestamp) {
                    const d = new Date(log.timestamp);
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    usageByDay[key] = (usageByDay[key] || 0) + 1;
                    if (!usageByDayByRoute[route]) usageByDayByRoute[route] = {};
                    usageByDayByRoute[route][key] = (usageByDayByRoute[route][key] || 0) + 1;
                }
            });
        });
        console.log('[user-stats] usageByDay sample:', Object.entries(usageByDay).slice(0, 3));
        console.log('[user-stats] usageByDayByRoute sample:', Object.entries(usageByDayByRoute).slice(0, 2));

        res.status(200).json({
            success: true,
            dseScoreDistribution,
            signupsByDay,
            usageByDay,
            usageByDayByRoute,
            users
        });
    } catch (error) {
        console.error('[user-stats] Error aggregating user stats:', error);
        res.status(500).json({ success: false, message: 'Error aggregating user stats', error: error.message });
    }
});

export let userRoutes = router;