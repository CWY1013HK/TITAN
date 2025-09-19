# EDVise Backend

EDVise is a career guidance platform that helps students analyze their life trajectories and receive personalized advice through an AI-powered chatbot.

## Features

### User Management

- User registration and authentication
- Profile management
- Role-based access control (Student, Teacher, Staff)

### Trajectory Analysis

- Life event tracking and visualization
- Event-connection mapping
- AI-powered trajectory analysis
- Analysis history management

### Chat System

- AI-powered chatbot (Eddy)
- Chat history management
- Analysis reference in conversations
- Real-time chat interface

## Tech Stack

### Backend

- Node.js
- Express.js
- MongoDB
- JWT Authentication
- Fireworks AI API

### Frontend

- React.js
- Tailwind CSS
- React Router
- Context API

## Project Structure

```
EDVise-Backend/
├── client/                 # Frontend React application
├── config/                 # Configuration files
├── models/                 # MongoDB models
├── routes/                 # API routes
├── test/                  # Test files
└── views/                 # Server-side views
```

## API Documentation

### Authentication

- POST `/api/auth/login` - User login
- POST `/api/auth/register` - User registration
- GET `/api/auth/me` - Get current user profile
- PATCH `/api/auth/me` - Update user profile

### Chat

- POST `/api/chat/create` - Create new chat
- POST `/api/chat/:chat_id/message` - Send message
- GET `/api/chat/:chat_id` - Get chat details
- GET `/api/chat/user/:user_id` - Get user's chat history
- POST `/api/database/delete` - Delete chat (universal delete endpoint)

### Trajectory

- PATCH `/api/auth/me` - Update trajectory events and analyses
- GET `/api/chat/:chat_id/analyses` - Get available analyses

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   cd client
   npm install
   ```
3. Set up environment variables:
   - Create `.env` file in root directory
   - Add required environment variables
4. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

Required environment variables:

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT secret key
- `ORG_TEST` - Test for npm build

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
