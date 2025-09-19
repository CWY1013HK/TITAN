# EDVise Frontend

This directory contains the React frontend application for EDVise, a career guidance platform.

## Project Structure

```
client/
├── src/
│   ├── components/     # Reusable UI components
│   ├── contexts/       # React contexts for state management
│   ├── handlers/       # Utility handlers for various functionalities
│   │   ├── MarkdownHandler.js    # Markdown rendering utility
│   │   ├── ChatbotHandler.js     # Chatbot communication
│   │   ├── DatabaseHandler.js    # Database operations
│   │   ├── RecommendationHandler.js  # Recommendation management
│   │   └── ReportHandler.js      # Report generation
│   ├── pages/         # Page components
│   ├── App.js         # Main application component
│   └── index.js       # Application entry point
├── public/            # Static assets
└── package.json       # Project dependencies
```

### Handlers

The application uses several handlers to manage different aspects of functionality:

- **MarkdownHandler**: Unified markdown rendering for formatted text across the application
- **ChatbotHandler**: Manages communication with the chatbot backend
- **DatabaseHandler**: Handles database operations and data management
- **RecommendationHandler**: Manages career and education recommendations
- **ReportHandler**: Handles report generation and formatting

For detailed information about each handler, see the [handlers README](./src/handlers/README.md).

## Main Features

### Pages

#### ChatBot (`
