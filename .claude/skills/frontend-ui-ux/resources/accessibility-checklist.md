# Accessibility Checklist

Required accessibility standards for all Orion UI features.

## Reduced Motion Support (Required)

All animations must respect `prefers-reduced-motion`:

### CSS Approach

```css
/* Always define with motion first, then override */
.animated-element {
  transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

@media (prefers-reduced-motion: reduce) {
  .animated-element {
    transition: none;
  }
}

/* Or use Tailwind */
<div className="transition-transform duration-600 motion-reduce:transition-none" />
```

### Framer Motion Approach

```tsx
import { useReducedMotion } from 'framer-motion'

function AnimatedComponent() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.6 }}
    />
  )
}
```

### Global Framer Motion Config

```tsx
// In a provider or layout
import { MotionConfig } from 'framer-motion'

function App({ children }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
    </MotionConfig>
  )
}
```

### Three.js Fallback

```tsx
function ThreeSection() {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return (
      <div className="bg-gradient-to-br from-primary/5 to-primary/10">
        {/* Static visual alternative */}
      </div>
    )
  }

  return (
    <Canvas>
      <AnimatedScene />
    </Canvas>
  )
}
```

## Focus Management

### Visible Focus States

```tsx
// All interactive elements need visible focus
<Button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
  Click me
</Button>

// Custom focus style
<button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
  Custom focus
</button>
```

### Focus Trapping in Modals

```tsx
import { Dialog, DialogContent } from '@/components/ui/dialog'

// shadcn/ui Dialog handles focus trapping automatically
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    {/* Focus is trapped here */}
  </DialogContent>
</Dialog>
```

### Skip Links

```tsx
// Add at the start of layout
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-4 focus:text-foreground"
>
  Skip to main content
</a>

// Target element
<main id="main-content" tabIndex={-1}>
  {/* Page content */}
</main>
```

## Keyboard Navigation

### Tab Order

```tsx
// Ensure logical tab order (avoid tabindex > 0)

// Good
<button>First</button>
<button>Second</button>
<button>Third</button>

// Bad - creates confusing tab order
<button tabIndex={3}>First</button>
<button tabIndex={1}>Second</button>
<button tabIndex={2}>Third</button>
```

### Keyboard Event Handlers

```tsx
// Handle both click and keyboard
<div
  role="button"
  tabIndex={0}
  onClick={handleAction}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleAction()
    }
  }}
>
  Interactive element
</div>

// Better: just use a button
<button onClick={handleAction}>Interactive element</button>
```

### Arrow Key Navigation

```tsx
// For lists, tabs, menus
function NavigableList({ items }) {
  const [focusedIndex, setFocusedIndex] = useState(0)

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex((i) => Math.min(i + 1, items.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex((i) => Math.max(i - 1, 0))
        break
      case 'Home':
        e.preventDefault()
        setFocusedIndex(0)
        break
      case 'End':
        e.preventDefault()
        setFocusedIndex(items.length - 1)
        break
    }
  }

  return (
    <ul role="listbox" onKeyDown={handleKeyDown}>
      {items.map((item, index) => (
        <li
          key={item.id}
          role="option"
          tabIndex={index === focusedIndex ? 0 : -1}
          aria-selected={index === focusedIndex}
        >
          {item.label}
        </li>
      ))}
    </ul>
  )
}
```

## ARIA Labels

### Interactive Elements

```tsx
// Icon-only buttons need labels
<button aria-label="Close menu">
  <X className="h-5 w-5" />
</button>

// Links with icons
<a href="/settings" aria-label="Settings">
  <Settings className="h-5 w-5" />
</a>

// Buttons with loading state
<button disabled={isLoading} aria-busy={isLoading}>
  {isLoading ? (
    <>
      <span className="sr-only">Loading</span>
      <Spinner className="h-4 w-4" />
    </>
  ) : (
    'Submit'
  )}
</button>
```

### Live Regions

```tsx
// Announce dynamic content changes
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// For urgent announcements
<div role="alert" aria-live="assertive">
  {errorMessage}
</div>

// Toast notifications
<div role="status" aria-live="polite" className="sr-only">
  {toastMessage}
</div>
```

### Form Labels

```tsx
// Always associate labels with inputs
<div>
  <Label htmlFor="email">Email address</Label>
  <Input id="email" type="email" aria-describedby="email-hint" />
  <p id="email-hint" className="text-sm text-muted-foreground">
    We'll never share your email.
  </p>
</div>

// Error state
<div>
  <Label htmlFor="password">Password</Label>
  <Input
    id="password"
    type="password"
    aria-invalid={!!error}
    aria-describedby={error ? 'password-error' : undefined}
  />
  {error && (
    <p id="password-error" className="text-sm text-destructive">
      {error}
    </p>
  )}
</div>
```

### Navigation

```tsx
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>

// Multiple navs need distinct labels
<nav aria-label="Footer navigation">
  {/* ... */}
</nav>
```

## Color Contrast

### Minimum Requirements

| Text Size | Contrast Ratio |
|-----------|----------------|
| Normal text (< 18px) | 4.5:1 |
| Large text (≥ 18px or 14px bold) | 3:1 |
| UI components, graphics | 3:1 |

### Orion Colors Contrast Reference

| Combination | Ratio | Pass |
|-------------|-------|------|
| `#0A0A0A` on `#FAFAFA` | 19.6:1 | ✓ AAA |
| `#737373` on `#FAFAFA` | 4.8:1 | ✓ AA |
| `#3B5BDB` on `#FFFFFF` | 4.7:1 | ✓ AA |
| `#1D1916` on `#F7F6F5` | 14.8:1 | ✓ AAA |
| `#8B8680` on `#F7F6F5` | 4.0:1 | ⚠ (large text only) |

### Checking Contrast

```tsx
// Don't rely solely on color for meaning
// Bad
<span className={isError ? 'text-red-500' : 'text-green-500'}>
  Status
</span>

// Good - includes icon and text
<span className={isError ? 'text-destructive' : 'text-green-600'}>
  {isError ? (
    <>
      <XCircle className="inline h-4 w-4 mr-1" />
      Error: {message}
    </>
  ) : (
    <>
      <CheckCircle className="inline h-4 w-4 mr-1" />
      Success
    </>
  )}
</span>
```

## Screen Reader Considerations

### Hidden Content

```tsx
// Hide from screen readers
<div aria-hidden="true">
  {/* Decorative element */}
</div>

// Hide visually but keep for screen readers
<span className="sr-only">Additional context</span>

// Tailwind sr-only class
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### Meaningful Link Text

```tsx
// Bad
<a href="/pricing">Click here</a>
<a href="/docs">Learn more</a>

// Good
<a href="/pricing">View pricing plans</a>
<a href="/docs">Read the documentation</a>

// With context
<a href={`/jobs/${job.id}`} aria-label={`View details for ${job.title}`}>
  View details
</a>
```

### Table Accessibility

```tsx
<table>
  <caption className="sr-only">User statistics for Q4 2024</caption>
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Role</th>
      <th scope="col">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">John Doe</th>
      <td>Developer</td>
      <td>Active</td>
    </tr>
  </tbody>
</table>
```

## Animation-Specific Accessibility

### Pause Controls

```tsx
// For auto-playing animations, provide pause control
function AnimatedBanner() {
  const [isPaused, setIsPaused] = useState(false)

  return (
    <div>
      <motion.div
        animate={isPaused ? {} : { x: [0, 100, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        Animated content
      </motion.div>
      <button
        onClick={() => setIsPaused(!isPaused)}
        aria-label={isPaused ? 'Play animation' : 'Pause animation'}
      >
        {isPaused ? <Play /> : <Pause />}
      </button>
    </div>
  )
}
```

### No Seizure-Inducing Content

- No flashing more than 3 times per second
- No large areas (> 25% of screen) with rapid color changes
- Test with photosensitive epilepsy analysis tools

### Parallax and Scroll Effects

```tsx
// Provide option to disable
function ParallaxSection() {
  const prefersReducedMotion = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? 0 : -100])

  return <motion.div style={{ y }} />
}
```

## Testing Checklist

### Manual Testing

- [ ] Tab through entire page - logical order?
- [ ] All interactive elements reachable via keyboard?
- [ ] Focus visible at all times?
- [ ] Can complete all actions without mouse?
- [ ] Test with screen reader (VoiceOver, NVDA)
- [ ] Enable `prefers-reduced-motion` and verify animations disabled
- [ ] Check at 200% zoom - content still usable?

### Automated Testing

```bash
# Run axe-core or similar
npx @axe-core/cli https://orion.app

# Lighthouse accessibility audit
npx lighthouse https://orion.app --only-categories=accessibility
```

### Tools

- **axe DevTools** - Browser extension for accessibility testing
- **WAVE** - Web accessibility evaluation tool
- **Stark** - Figma/Sketch plugin for contrast checking
- **VoiceOver** (macOS) / **NVDA** (Windows) - Screen readers

## Quick Reference

| Requirement | Implementation |
|-------------|----------------|
| Reduced motion | `useReducedMotion()` hook |
| Focus visible | `focus-visible:ring-2` |
| Icon buttons | `aria-label="Action name"` |
| Loading states | `aria-busy={true}` |
| Dynamic content | `aria-live="polite"` |
| Form errors | `aria-invalid`, `aria-describedby` |
| Decorative images | `aria-hidden="true"` or empty `alt=""` |
| Skip links | `sr-only focus:not-sr-only` |
| Color contrast | Min 4.5:1 normal, 3:1 large |
