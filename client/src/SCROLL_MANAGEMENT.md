# Scroll Management

This document describes the scroll management features implemented in the EDVise application.

## Overview

The application includes automatic scroll reset on page navigation and utility functions for manual scroll control.

## Automatic Scroll Reset

### How it works

The `ScrollToTop` component in `App.js` automatically resets scroll position to the top when navigating between pages. It uses the `useScrollToTop` custom hook for configuration.

### Configuration

The scroll reset can be configured with the following options:

```javascript
useScrollToTop({
  enabled: true,           // Enable/disable scroll reset
  behavior: 'auto',        // 'auto', 'smooth', or 'instant'
  delay: 10,              // Delay before scrolling (ms) - ensures DOM is ready
  excludePaths: ['/trajectory'],  // Paths to exclude from scroll reset
  retryAttempts: 3,       // Number of retry attempts if scroll fails
  retryDelay: 100         // Delay between retry attempts (ms)
});
```

### Current Configuration

- **Enabled**: Yes
- **Behavior**: Auto (instant scroll)
- **Delay**: 10ms (ensures DOM is ready)
- **Excluded Paths**: `/trajectory` (has its own scroll management)
- **Retry Attempts**: 3 (improves reliability)
- **Retry Delay**: 100ms

## Manual Scroll Control

### Utility Functions

Import scroll utilities from `utils/scrollUtils.js`:

```javascript
import { 
  scrollToTop, 
  scrollToElement, 
  isElementInViewport,
  getScrollPosition,
  saveScrollPosition,
  restoreScrollPosition 
} from '../utils/scrollUtils';
```

### Available Functions

#### `scrollToTop(options)`
Scroll to the top of the page.

```javascript
// Basic usage
scrollToTop();

// With options
scrollToTop({
  behavior: 'smooth',
  delay: 100
});
```

#### `scrollToElement(element, options)`
Scroll to a specific element.

```javascript
// By selector
scrollToElement('#section-1', {
  behavior: 'smooth',
  offset: 80  // Account for fixed header
});

// By DOM element
const element = document.getElementById('section-1');
scrollToElement(element, { behavior: 'smooth' });
```

#### `isElementInViewport(element, threshold)`
Check if an element is visible in the viewport.

```javascript
const element = document.getElementById('section-1');
const isVisible = isElementInViewport(element, 0.5); // 50% visible
```

#### `getScrollPosition()`
Get current scroll position.

```javascript
const position = getScrollPosition();
console.log(`X: ${position.x}, Y: ${position.y}`);
```

#### `saveScrollPosition(key)`
Save current scroll position to sessionStorage.

```javascript
saveScrollPosition('home-page');
```

#### `restoreScrollPosition(key, options)`
Restore scroll position from sessionStorage.

```javascript
restoreScrollPosition('home-page', {
  behavior: 'smooth',
  delay: 200
});
```

## Custom Hooks

### `useScrollToTop(options)`

A custom hook for automatic scroll management in individual components.

```javascript
import useScrollToTop from '../hooks/useScrollToTop';

const MyComponent = () => {
  useScrollToTop({
    enabled: true,
    behavior: 'smooth',
    excludePaths: ['/special-page']
  });
  
  return <div>My Component</div>;
};
```

### `useLoadingScrollReset(options)`

A custom hook for scroll reset when loading states complete, specifically for pages with loading popups.

```javascript
import useLoadingScrollReset from '../hooks/useLoadingScrollReset';

const MyComponent = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  useLoadingScrollReset({
    isLoading: isLoading,
    behavior: 'smooth',
    delay: 200,
    enabled: true
  });
  
  return <div>My Component</div>;
};
```

## Use Cases

### 1. Automatic Page Navigation
- Automatically scrolls to top when navigating between pages
- Excludes pages with custom scroll management (like TrajectoryMap)
- Uses multiple scroll methods and retry logic for improved reliability

### 2. Loading Popup Completion
- Automatically scrolls to top when loading popups complete
- Used in JUPASelect, ViewReport, and UserDashboard components
- Configurable delay and behavior

### 3. Form Submissions
```javascript
const handleSubmit = async (formData) => {
  await submitForm(formData);
  scrollToTop({ behavior: 'smooth' });
};
```

### 4. Error Messages
```javascript
const handleError = (error) => {
  setError(error.message);
  scrollToElement('#error-section', { 
    behavior: 'smooth', 
    offset: 100 
  });
};
```

### 5. Save/Restore Scroll Position
```javascript
// Save position before navigation
useEffect(() => {
  return () => {
    saveScrollPosition('current-page');
  };
}, []);

// Restore position after navigation
useEffect(() => {
  restoreScrollPosition('current-page', { behavior: 'smooth' });
}, []);
```

## Browser Compatibility

- **Smooth Scrolling**: Supported in all modern browsers
- **Scroll Behavior**: Falls back to 'auto' for older browsers
- **SessionStorage**: Supported in all modern browsers

## Performance Considerations

- Scroll reset is lightweight and doesn't impact performance
- Custom hook uses `useEffect` with proper dependencies
- Utility functions are pure and don't cause re-renders
- SessionStorage operations are synchronous and fast

## Troubleshooting

### Scroll not resetting
1. Check if the path is in `excludePaths`
2. Verify the `ScrollToTop` component is rendered
3. Check browser console for errors

### Smooth scroll not working
1. Ensure browser supports `scroll-behavior: smooth`
2. Check if CSS is overriding scroll behavior
3. Verify the element exists before scrolling

### Performance issues
1. Avoid calling scroll functions in render loops
2. Use `useCallback` for scroll functions in components
3. Debounce scroll event handlers if needed 