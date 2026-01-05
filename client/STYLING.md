# Styling the Guideants Chat Component

The `<guideants-chat>` component uses Shadow DOM for encapsulation. This document explains how to customize its appearance.

## Styling Approaches

### 1. CSS Custom Properties (Recommended)

The component exposes CSS custom properties (CSS variables) that can be overridden from outside the Shadow DOM.

#### Basic Example

```css
guideants-chat {
  /* Primary brand color */
  --wf-primary-color: #10b981;
  --wf-primary-hover: #059669;
  
  /* Danger/destructive actions */
  --wf-danger-color: #ef4444;
  --wf-danger-hover: #dc2626;
  
  /* Borders and backgrounds */
  --wf-border-color: #d1d5db;
  --wf-bg-container: #ffffff;
  --wf-bg-user: #dbeafe;
  --wf-bg-assistant: #f3f4f6;
  
  /* Typography */
  --wf-font-family: 'Inter', sans-serif;
  --wf-font-size-base: 1rem;
  
  /* Spacing */
  --wf-border-radius: 8px;
  --wf-spacing-md: 1rem;
}
```

### 2. Available CSS Custom Properties

#### Colors
| Property | Default | Description |
|----------|---------|-------------|
| `--wf-primary-color` | `#3b82f6` | Primary action color (Send button, links) |
| `--wf-primary-hover` | `#2563eb` | Primary color hover state |
| `--wf-danger-color` | `#dc2626` | Danger action color (Restart button) |
| `--wf-danger-hover` | `#b91c1c` | Danger color hover state |
| `--wf-border-color` | `#e5e7eb` | Border color for inputs and containers |
| `--wf-bg-user` | `#dbeafe` | User message background |
| `--wf-bg-assistant` | `#f3f4f6` | Assistant message background |
| `--wf-bg-control-bar` | `#f3f4f6` | Control bar background |
| `--wf-bg-container` | `#ffffff` | Main container background |
| `--wf-text-primary` | `#111827` | Primary text color |
| `--wf-text-secondary` | `#6b7280` | Secondary text color (labels, timestamps) |
| `--wf-text-error` | `#dc2626` | Error message color |

#### Spacing & Layout
| Property | Default | Description |
|----------|---------|-------------|
| `--wf-border-radius` | `0.375rem` | Border radius for buttons and inputs |
| `--wf-border-radius-lg` | `0.5rem` | Border radius for containers |
| `--wf-spacing-sm` | `0.5rem` | Small spacing unit |
| `--wf-spacing-md` | `0.75rem` | Medium spacing unit |
| `--wf-spacing-lg` | `1rem` | Large spacing unit |
| `--wf-button-height` | `38px` | Height of all buttons |
| `--wf-input-min-height` | `90px` | Minimum height of textarea |
| `--wf-max-chat-height` | `calc(100vh - 250px)` | Maximum height of conversation area |

#### Typography
| Property | Default | Description |
|----------|---------|-------------|
| `--wf-font-family` | system fonts | Font family for the component |
| `--wf-font-size-xs` | `0.75rem` | Extra small font size |
| `--wf-font-size-sm` | `0.875rem` | Small font size |
| `--wf-font-size-base` | `1rem` | Base font size |

#### Effects
| Property | Default | Description |
|----------|---------|-------------|
| `--wf-shadow-sm` | subtle shadow | Small shadow for elevated elements |
| `--wf-shadow-md` | medium shadow | Medium shadow for floating elements |
| `--wf-focus-ring-color` | `#3b82f6` | Color of focus rings |
| `--wf-focus-ring-width` | `2px` | Width of focus rings |

### 3. Real-World Examples

#### Dark Mode Theme
```css
guideants-chat {
  --wf-primary-color: #60a5fa;
  --wf-primary-hover: #3b82f6;
  --wf-danger-color: #f87171;
  --wf-danger-hover: #ef4444;
  
  --wf-border-color: #374151;
  --wf-bg-container: #1f2937;
  --wf-bg-user: #1e3a5f;
  --wf-bg-assistant: #374151;
  --wf-bg-control-bar: #111827;
  
  --wf-text-primary: #f3f4f6;
  --wf-text-secondary: #9ca3af;
  --wf-text-error: #f87171;
}
```

#### Rounded/Playful Theme
```css
guideants-chat {
  --wf-border-radius: 16px;
  --wf-border-radius-lg: 20px;
  --wf-spacing-md: 1.25rem;
  --wf-font-family: 'Comic Sans MS', 'Chalkboard SE', cursive;
}
```

#### Corporate/Minimal Theme
```css
guideants-chat {
  --wf-primary-color: #000000;
  --wf-primary-hover: #333333;
  --wf-border-radius: 2px;
  --wf-border-radius-lg: 4px;
  --wf-bg-user: #f5f5f5;
  --wf-bg-assistant: #fafafa;
  --wf-shadow-sm: none;
  --wf-shadow-md: 0 1px 3px rgba(0,0,0,0.12);
}
```

### 4. Using CSS Parts (Advanced)

For more granular control, the component exposes CSS parts for specific elements:

```css
guideants-chat::part(container) {
  /* Style the main container */
}

guideants-chat::part(input) {
  /* Style the textarea */
}

guideants-chat::part(button-send) {
  /* Style the send button */
}

guideants-chat::part(button-undo) {
  /* Style the undo button */
}

guideants-chat::part(button-restart) {
  /* Style the restart button */
}

guideants-chat::part(message-user) {
  /* Style user message bubbles */
}

guideants-chat::part(message-assistant) {
  /* Style assistant message bubbles */
}
```

### 5. Responsive Styling

Use container queries or media queries:

```css
@media (max-width: 640px) {
  guideants-chat {
    --wf-border-radius: 0;
    --wf-spacing-md: 0.5rem;
    --wf-button-height: 44px; /* Larger touch targets on mobile */
  }
}
```

### 6. Programmatic Styling

You can also set CSS custom properties via JavaScript:

```javascript
const chat = document.querySelector('guideants-chat');
chat.style.setProperty('--wf-primary-color', '#10b981');
chat.style.setProperty('--wf-border-radius', '12px');
```

## Best Practices

1. **Start with CSS Custom Properties** - They're the most flexible and maintainable approach
2. **Test Accessibility** - Ensure sufficient color contrast when changing colors
3. **Respect User Preferences** - Consider `prefers-color-scheme` for dark mode
4. **Performance** - CSS variables are performant and don't require re-rendering
5. **Fallbacks** - The component provides sensible defaults for all properties

## Migration from Inline Styles

If you were previously modifying the component's internal styles, migrate to CSS variables:

**Before:**
```css
/* This doesn't work with Shadow DOM */
.some-internal-class {
  background: red;
}
```

**After:**
```css
guideants-chat {
  --wf-bg-container: red;
}
```




