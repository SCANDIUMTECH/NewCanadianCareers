---
name: frontend-ui-ux
description: Build premium, animation-rich frontend experiences for Orion with Three.js, Framer Motion, and advanced motion design
---

# Frontend UI/UX Designer Skill

Build cohesive, premium UI experiences with advanced animations for Orion. This skill ensures visual consistency, performant motion design, and accessibility compliance.

## When to Use This Skill

- Marketing pages and hero sections
- Interactive components with complex animations
- Three.js/3D element integration
- Scroll-driven animations and parallax effects
- Micro-interactions and gesture-based UI
- Component library extensions

## Design System Reference

### Color Palette

**Current System (Primary Blue)**
```css
--primary: #3B5BDB          /* Brand blue */
--background: #FAFAFA       /* Light background */
--card: white               /* Card surfaces */
--foreground: #0A0A0A       /* Text */
--muted: #F5F5F5            /* Muted backgrounds */
--muted-foreground: #737373 /* Secondary text */
```

**Warm Organic Direction** (for new marketing pages)
```css
--warm-cream: #F7F6F5       /* Background */
--warm-black: #1D1916       /* Text */
--golden-accent: #FFD84B    /* Accent */
--warm-gray: #8B8680        /* Secondary text */
```

### Typography

- **Font**: Inter (system fallback: -apple-system, BlinkMacSystemFont)
- **Responsive sizing**: Use `clamp()` for fluid typography
  ```css
  /* Hero: 48px → 80px */
  font-size: clamp(3rem, 5vw + 1rem, 5rem);

  /* Body: 16px → 18px */
  font-size: clamp(1rem, 0.5vw + 0.875rem, 1.125rem);
  ```

### Spacing & Radius

- **Section padding**: `py-24` (96px) or `py-32` (128px)
- **Card radius**: `rounded-xl` (12px) or `rounded-2xl` (16px)
- **Button radius**: `rounded-lg` (8px)

## Animation Philosophy

### Core Easing
```css
/* Primary easing - smooth deceleration */
transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
```

### Duration Guidelines
| Type | Duration | Use Case |
|------|----------|----------|
| Micro | 0.15-0.3s | Hover, focus states |
| Transition | 0.4-0.6s | Page transitions, modals |
| Reveal | 0.6-0.9s | Scroll animations, hero reveals |
| Orchestrated | 1.2-2s | Full sequence animations |

### Stagger Patterns
- **Text words**: 50ms between words
- **Cards/items**: 100ms between items
- **Sections**: 150-200ms between sections

### Reduced Motion Support
**Required** for all animations:
```tsx
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Framer Motion
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: prefersReducedMotion ? 0 : 0.6 }}
/>
```

## Animation Layers

### Layer 1: CSS Transitions
Simple hover/focus states. No JavaScript needed.
```css
.button {
  transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1),
              box-shadow 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}
.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(59, 91, 219, 0.15);
}
```

### Layer 2: Scroll Reveals
Use existing `MotionWrapper` and `TextReveal` components:
```tsx
import { MotionWrapper } from '@/components/motion-wrapper'
import { TextReveal } from '@/components/text-reveal'

<MotionWrapper delay={100} direction="up">
  <TextReveal as="h2">Premium hiring platform</TextReveal>
</MotionWrapper>
```

### Layer 3: Framer Motion
Complex orchestration, layout animations, gestures:
```tsx
import { motion, AnimatePresence } from 'framer-motion'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
}
```

### Layer 4: Canvas/Three.js
3D elements, particle systems, shaders. See `three-js-guide.md`.

## Component Patterns

### Glassmorphism
```tsx
<div className="bg-card/70 backdrop-blur-2xl border border-white/20 shadow-xl">
  {/* Content */}
</div>
```

### Magnetic Button
```tsx
<MagneticButton>
  <span>Get Started</span>
</MagneticButton>
```

### 3D Tilt Effect
```tsx
<UIFrame tilt={true} className="p-6">
  {/* Card content */}
</UIFrame>
```

### Text Reveals
```tsx
// Word-by-word
<TextReveal as="h1" delay={200}>
  Build your dream team
</TextReveal>

// Line-by-line
<LineReveal
  lines={["Enterprise hiring", "Made simple"]}
  delay={100}
/>
```

## Three.js Integration

**When to use:**
- Hero section backgrounds
- Data visualization
- Interactive 3D product showcases
- Ambient decorative elements

**Performance budget:**
- Frame time: < 16ms (60fps target)
- Max draw calls: 50-100
- Texture memory: < 50MB

See `resources/three-js-guide.md` for detailed patterns.

## File Locations

### Animation Components
- `components/motion-wrapper.tsx` - Scroll reveal wrapper
- `components/text-reveal.tsx` - Word-by-word text animation
- `components/line-reveal.tsx` - Line-by-line reveal
- `components/constellation-canvas.tsx` - Particle canvas

### UI Components
- `components/ui/` - shadcn/ui primitives
- `components/magnetic-button.tsx` - Magnetic interaction
- `components/ui-frame.tsx` - 3D tilt card

### Styles
- `app/globals.css` - CSS variables, base styles
- `tailwind.config.ts` - Theme configuration

## Pre-Flight Checklist

Before shipping new UI features:

- [ ] **Reduced motion**: Tested with `prefers-reduced-motion`
- [ ] **Performance**: Lighthouse score > 95
- [ ] **Responsive**: Tested on mobile (375px) and desktop (1440px)
- [ ] **Dark mode**: If applicable, tested dark theme
- [ ] **Focus states**: Keyboard navigation works
- [ ] **Loading states**: Skeleton/placeholder while content loads
- [ ] **Error states**: Graceful degradation if animations fail
- [ ] **Cross-browser**: Chrome, Firefox, Safari tested

## Resources

Detailed guides in `resources/`:
- `design-tokens.md` - Complete color, typography, spacing reference
- `animation-patterns.md` - Motion design patterns with code
- `component-patterns.md` - UI component library reference
- `three-js-guide.md` - Three.js/R3F integration guide
- `accessibility-checklist.md` - A11y requirements
