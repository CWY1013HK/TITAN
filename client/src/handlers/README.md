# Handlers

This directory contains various utility handlers used across the application.

## Available Handlers

### MarkdownHandler

- **File**: `MarkdownHandler.js`
- **Purpose**: Unified markdown rendering for formatted text across the application
- **Features**:
  - Supports bullet points (both `*` and `-`)
  - Numbered lists
  - Headers (surrounded by `**`)
  - Bold text (surrounded by `**`)
  - Proper indentation for nested lists
  - Truncation with "Click to view full content..." message
  - Different styling for bot vs user messages
- **Usage**:

  ```javascript
  import { renderMarkdown } from "./handlers/MarkdownHandler";

  // Basic usage
  renderMarkdown(text);

  // With options
  renderMarkdown(text, {
    isBot: true,
    showFullContent: false,
    maxLines: 5,
  });
  ```

### ChatbotHandler

- **File**: `ChatbotHandler.js`
- **Purpose**: Handles communication with the chatbot backend
- **Features**:
  - Message sending and receiving
  - Chat creation and management
  - Analysis reference handling

### DatabaseHandler

- **File**: `DatabaseHandler.js`
- **Purpose**: Manages database operations
- **Features**:
  - CRUD operations for various collections
  - User data management
  - Trajectory data handling

### RecommendationHandler

- **File**: `RecommendationHandler.js`
- **Purpose**: Manages career and education recommendations
- **Features**:
  - Recommendation generation
  - Recommendation storage and retrieval
  - User preference handling

### ReportHandler

- **File**: `ReportHandler.js`
- **Purpose**: Handles report generation and management
- **Features**:
  - Report creation
  - Report formatting
  - Report storage and retrieval

## Best Practices

1. **Import Paths**: Always use relative imports from the handlers directory

   ```javascript
   import { handlerFunction } from "./handlers/HandlerName";
   ```

2. **Error Handling**: All handlers should implement proper error handling and return meaningful error messages

3. **Type Safety**: Use TypeScript types or PropTypes where applicable

4. **Documentation**: Keep JSDoc comments up to date for all exported functions

5. **Testing**: Ensure handlers are properly tested with unit tests
