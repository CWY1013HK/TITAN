# Language Preference System

## Overview

EDVise implements a hybrid language preference system that stores user language choices in both the user profile (for authenticated users) and localStorage (for anonymous users and fallback).

## Architecture

### Storage Strategy

1. **Primary Storage**: User Profile (Database)
   - Field: `preferred_language`
   - Default: `"en"`
   - Used for: Authenticated users
   - Benefits: Cross-device consistency, user analytics

2. **Fallback Storage**: localStorage
   - Managed by: i18next-browser-languagedetector
   - Used for: Anonymous users, initial detection
   - Benefits: Works without authentication, browser persistence

### Language Detection Order

1. User profile preference (if authenticated)
2. localStorage (if previously set)
3. Browser language detection
4. Default to English

## Implementation Details

### Key Files

- `client/src/components/LanguageSwitcher.js` - Main language switching component
- `client/src/utils/languageUtils.js` - Utility functions for language management
- `client/src/contexts/AuthContext.js` - User profile schema includes language preference
- `client/src/i18n.js` - i18n configuration with language detection

### Database Schema

The user profile now includes:
```javascript
{
  // ... existing fields
  preferred_language: "en" // Default language preference
}
```

### Utility Functions

#### `setLanguagePreference(languageCode, userTable, userId)`
- Updates i18n immediately for responsive UI
- Saves to user profile if authenticated
- Handles errors gracefully (language still works locally)

#### `loadLanguageFromProfile(userData, supportedLanguages)`
- Loads language from user profile
- Falls back to current i18n language
- Validates against supported languages

#### `getLanguageInfo(languageCode)`
- Returns language display information (name, flag)
- Provides fallback for unknown languages

## User Experience

### For Authenticated Users
1. Language preference is saved to their profile
2. Preference persists across devices and sessions
3. Language loads automatically on login
4. Changes are immediately reflected in UI

### For Anonymous Users
1. Language preference stored in localStorage
2. Preference persists within the same browser
3. Falls back to browser language detection
4. No database storage required

## Benefits

### Cross-Device Consistency
- Authenticated users get their language preference on any device
- No need to reset language on new devices

### Analytics & Insights
- Track language preferences for user insights
- Understand user demographics and preferences

### Future Features
- Personalized content based on language
- Language-specific recommendations
- A/B testing by language preference

### Graceful Degradation
- System works even if database is unavailable
- localStorage provides reliable fallback
- No breaking changes for existing users

## Migration

### For Existing Users
- No migration required
- Language preference will be set to default ("en") on first login
- Users can change language anytime through the switcher

### For New Users
- Language preference starts with browser detection
- Can be changed immediately through the language switcher
- Automatically saved to profile upon authentication

## Testing

### Test Scenarios
1. **Authenticated User**: Change language → logout → login → verify language persists
2. **Anonymous User**: Change language → refresh → verify language persists
3. **Cross-Device**: Change language on device A → login on device B → verify language loads
4. **Fallback**: Disable database → verify language still works via localStorage

### Manual Testing
```javascript
// Test language preference in browser console
localStorage.getItem('i18nextLng') // Check localStorage
// Check user profile in database for preferred_language field
```

## Future Enhancements

1. **Language Analytics**: Track which languages are most popular
2. **Auto-Detection**: Suggest language based on user location
3. **Content Localization**: Language-specific content and recommendations
4. **Admin Panel**: View and manage user language preferences
5. **Bulk Operations**: Update language preferences for multiple users 