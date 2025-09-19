# Chatbot Language Integration

## Overview

EDVise's chatbot (Eddy) now responds in the user's preferred language across all interactions. The system automatically detects the user's language preference and instructs the AI to respond appropriately.

## Language Modes

### 1. **Traditional Chinese (tc)** - 繁體中文
- **Response Style**: Vernacular Cantonese (廣東話/粵語)
- **Target Audience**: Hong Kong students
- **AI Name**: 愛迪生 (Ai Di Sheng)
- **Greeting**: Hi 愛迪生
- **Characteristics**: 
  - Natural, conversational Cantonese
  - Uses Cantonese expressions and phrases
  - Informal, friendly tone
  - Examples: "你嘅能力分數好高喎！" "我建議你可以考慮..." "我係愛迪生，你嘅學術輔導員"

### 2. **Simplified Chinese (sc)** - 简体中文
- **Response Style**: Standard Simplified Chinese
- **Target Audience**: Mainland Chinese students
- **AI Name**: 爱迪生 (Ai Di Sheng)
- **Greeting**: 嗨！爱迪生
- **Characteristics**:
  - Clear, natural Chinese
  - Formal but accessible tone
  - Examples: "你的能力分数很高！" "我建议你可以考虑..." "我是爱迪生，你的学术辅导员"

### 3. **English (en)** - Default
- **Response Style**: Professional English
- **Target Audience**: International students
- **AI Name**: Eddy
- **Greeting**: Hi Eddy
- **Characteristics**:
  - Clear, professional advice
  - Academic tone
  - Examples: "Your ability scores are excellent!" "I recommend you consider..." "I'm Eddy, your academic counselor"

## Implementation Details

### Backend Changes

#### 1. **User Schema Update** (`routes/userRoutes.js`)
```javascript
preferred_language: { type: String, enum: ['tc', 'sc', 'en'], default: 'en' }
```

#### 2. **Chat Schema Update** (`routes/userRoutes.js`)
```javascript
User_Context: {
  // ... existing fields
  preferred_language: String
}
```

#### 3. **System Prompt Integration** (`routes/userRoutes.js`)
```javascript
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
```

#### 4. **Chatbot API Update** (`routes/chatbotRoutes.js`)
```javascript
router.post('/chatbot/generate', async (req, res) => {
  const { text, language = 'en' } = req.body;
  // ... language instruction logic
});
```

### Frontend Changes

#### 1. **Recommendation Handler** (`client/src/handlers/RecommendationHandler.js`)
```javascript
// Get user's language preference
const userLanguage = userData.preferred_language || 'en';

// Pass language to chatbot API
body: JSON.stringify({ 
  text: recommendationPrompt,
  language: userLanguage
})
```

## Integration Points

### 1. **Main Chat System** (`/api/chat/:chat_id/message`)
- **Location**: `routes/userRoutes.js`
- **Function**: Handles all chat messages with Eddy
- **Language Source**: `chat.User_Context.preferred_language`
- **Usage**: All chat interactions in the main chatbot interface

### 2. **Recommendation Generation** (`/api/chatbot/generate`)
- **Location**: `routes/chatbotRoutes.js`
- **Function**: Generates personalized recommendations
- **Language Source**: `userData.preferred_language`
- **Usage**: Personality test results, ability recommendations

### 3. **JUPAS Chat Integration** (`client/src/pages/JUPASelect.js`)
- **Function**: Creates chat for JUPAS programme discussion
- **Language Source**: User's current language preference
- **Usage**: When users click "Chat with Eddy" from JUPAS selection

### 4. **Trajectory Analysis Chat** (`client/src/pages/TrajectoryMap.js`)
- **Function**: Creates chat for trajectory analysis discussion
- **Language Source**: User's current language preference
- **Usage**: When users click "Ask Eddy" from trajectory analysis

### 5. **Report Chat Integration** (`client/src/pages/ViewReport.js`)
- **Function**: Creates chat for report discussion
- **Language Source**: User's current language preference
- **Usage**: When users click "Chat with Eddy" from report view

## Language Detection Flow

### 1. **User Authentication**
- Language preference loaded from user profile
- Stored in `AuthContext` for frontend access

### 2. **Chat Creation**
- Language preference included in `User_Context`
- Available for all future chat interactions

### 3. **Message Processing**
- Language instruction added to system prompt
- AI responds in appropriate language

### 4. **Recommendation Generation**
- Language parameter passed to chatbot API
- Consistent language across all recommendations

## Example Prompts

### Traditional Chinese (tc)
```
System: You are Eddy, a secondary school career consultant. 
Please respond in vernacular Cantonese (廣東話/粵語). 
Use natural, conversational Cantonese that Hong Kong students would use. 
Feel free to use Cantonese expressions and phrases.
Refer to yourself as 愛迪生 instead of Eddy.

User: Hi 愛迪生，我想問下我嘅能力分數點樣？
```

### Simplified Chinese (sc)
```
System: You are Eddy, a secondary school career consultant. 
Please respond in Simplified Chinese (简体中文). 
Use clear, natural Chinese that mainland Chinese students would understand.
Refer to yourself as 爱迪生 instead of Eddy.

User: 嗨！爱迪生，我想问一下我的能力分数怎么样？
```

### English (en)
```
System: You are Eddy, a secondary school career consultant. 
Please respond in English.

User: Hi Eddy, how are my ability scores?
```

## Testing

### Manual Testing Scenarios

1. **Language Switch Test**
   - Change language in LanguageSwitcher
   - Start new chat with Eddy
   - Verify responses in correct language

2. **Cross-Feature Consistency**
   - Test recommendations in different languages
   - Test JUPAS chat in different languages
   - Test trajectory analysis chat in different languages

3. **Persistence Test**
   - Set language preference
   - Logout and login
   - Verify language preference persists

### API Testing

```bash
# Test chatbot with different languages
curl -X POST /api/chatbot/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello Eddy", "language": "tc"}'

curl -X POST /api/chatbot/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello Eddy", "language": "sc"}'

curl -X POST /api/chatbot/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello Eddy", "language": "en"}'
```

## Benefits

### 1. **User Experience**
- Eddy responds in user's preferred language
- More natural and comfortable interaction
- Better understanding of advice and recommendations

### 2. **Accessibility**
- Supports Hong Kong students (Cantonese)
- Supports mainland Chinese students (Simplified Chinese)
- Supports international students (English)

### 3. **Consistency**
- Same language across all chatbot interactions
- Consistent with UI language preference
- Seamless experience across features

### 4. **Future Extensibility**
- Easy to add more languages
- Centralized language management
- Scalable architecture

## Future Enhancements

1. **Language-Specific Content**
   - Localized examples and references
   - Region-specific academic advice
   - Cultural context awareness

2. **Language Analytics**
   - Track which languages are most popular
   - Understand user demographics
   - Optimize language-specific responses

3. **Advanced Language Features**
   - Code-switching support
   - Dialect variations
   - Formal vs informal tone options 