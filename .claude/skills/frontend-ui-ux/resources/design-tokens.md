# Design Tokens

Complete reference for Orion's design system tokens.

## Color System

### Current Primary Palette
```css
/* Brand Colors */
--primary: #3B5BDB;           /* Primary blue */
--primary-foreground: white;

/* Backgrounds */
--background: #FAFAFA;
--card: white;
--muted: #F5F5F5;

/* Text */
--foreground: #0A0A0A;
--muted-foreground: #737373;

/* Borders */
--border: #E5E5E5;

/* Chart Colors */
--chart-1: #3B5BDB;  /* Primary blue */
--chart-2: #22C55E;  /* Success green */
--chart-3: #F59E0B;  /* Warning amber */
--chart-4: #EF4444;  /* Error red */
--chart-5: #8B5CF6;  /* Purple */
```

### Warm Organic Palette (New Direction)

For marketing pages transitioning to warm organic aesthetic:

```css
/* Core Warm Colors */
--warm-cream: #F7F6F5;        /* Primary background */
--warm-cream-light: #FCFBFA;  /* Elevated surfaces */
--warm-black: #1D1916;        /* Primary text */
--warm-gray: #8B8680;         /* Secondary text */
--warm-gray-light: #C4C0BB;   /* Borders, dividers */

/* Accent Colors */
--golden-accent: #FFD84B;     /* Primary accent */
--golden-dark: #E5C144;       /* Hover state */
--crimson: #DC3545;           /* Secondary accent */
--terracotta: #C17F59;        /* Tertiary accent */

/* Gradients */
--gradient-warm: linear-gradient(135deg, #F7F6F5 0%, #FFD84B 50%, #DC3545 100%);
--gradient-cream: linear-gradient(180deg, #FCFBFA 0%, #F7F6F5 100%);
--gradient-golden: linear-gradient(135deg, #FFD84B 0%, #E5C144 100%);
```

### Usage in Tailwind

```tsx
// Current system
<div className="bg-primary text-primary-foreground" />
<div className="bg-card text-foreground" />

// Warm organic (add to tailwind.config.ts)
<div className="bg-warm-cream text-warm-black" />
<div className="text-golden-accent" />
```

## Typography Scale

### Font Family
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Responsive Type Scale

| Name | Mobile | Desktop | CSS |
|------|--------|---------|-----|
| Display | 48px | 80px | `clamp(3rem, 5vw + 1rem, 5rem)` |
| H1 | 36px | 60px | `clamp(2.25rem, 4vw + 0.5rem, 3.75rem)` |
| H2 | 30px | 48px | `clamp(1.875rem, 3vw + 0.5rem, 3rem)` |
| H3 | 24px | 36px | `clamp(1.5rem, 2vw + 0.5rem, 2.25rem)` |
| H4 | 20px | 24px | `clamp(1.25rem, 1vw + 0.75rem, 1.5rem)` |
| Body | 16px | 18px | `clamp(1rem, 0.5vw + 0.875rem, 1.125rem)` |
| Small | 14px | 14px | `0.875rem` |
| XS | 12px | 12px | `0.75rem` |

### Font Weights
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Line Heights
```css
--leading-tight: 1.1;    /* Display, headings */
--leading-snug: 1.3;     /* Subheadings */
--leading-normal: 1.5;   /* Body text */
--leading-relaxed: 1.7;  /* Long-form content */
```

### Letter Spacing
```css
--tracking-tight: -0.02em;   /* Display headings */
--tracking-normal: 0;         /* Body */
--tracking-wide: 0.02em;      /* All caps, labels */
```

### Typography Examples

```tsx
// Display heading
<h1 className="text-[clamp(3rem,5vw+1rem,5rem)] font-bold leading-tight tracking-tight">
  Build your dream team
</h1>

// Body text
<p className="text-[clamp(1rem,0.5vw+0.875rem,1.125rem)] leading-relaxed text-muted-foreground">
  Premium hiring platform for modern companies.
</p>

// Warm organic editorial style
<h2 className="text-[clamp(2.25rem,4vw+0.5rem,3.75rem)] font-medium leading-tight tracking-tight text-warm-black">
  Hire with intention
</h2>
```

## Spacing System

Based on 4px grid:

| Token | Value | Tailwind |
|-------|-------|----------|
| xs | 4px | `p-1` |
| sm | 8px | `p-2` |
| md | 16px | `p-4` |
| lg | 24px | `p-6` |
| xl | 32px | `p-8` |
| 2xl | 48px | `p-12` |
| 3xl | 64px | `p-16` |
| 4xl | 96px | `p-24` |
| 5xl | 128px | `p-32` |

### Section Spacing
```tsx
// Standard section
<section className="py-24 px-4 md:px-8">

// Large section (hero, CTA)
<section className="py-32 px-4 md:px-8">

// Compact section
<section className="py-16 px-4 md:px-8">
```

### Component Spacing
```tsx
// Card padding
<div className="p-6 md:p-8">

// Button padding
<button className="px-6 py-3">

// Input padding
<input className="px-4 py-2.5">
```

## Border Radius

| Token | Value | Use Case |
|-------|-------|----------|
| sm | 4px | Small elements, tags |
| md | 6px | Buttons, inputs |
| lg | 8px | Cards, modals |
| xl | 12px | Large cards |
| 2xl | 16px | Hero sections |
| full | 9999px | Pills, avatars |

```tsx
// Standard card
<div className="rounded-xl">

// Hero card
<div className="rounded-2xl">

// Button
<button className="rounded-lg">

// Avatar
<div className="rounded-full">
```

## Shadow System

### Current Shadows
```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
--shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 50px rgba(0, 0, 0, 0.15);
```

### Warm Organic Shadows
```css
--shadow-warm-sm: 0 1px 2px rgba(29, 25, 22, 0.04);
--shadow-warm-md: 0 4px 12px rgba(29, 25, 22, 0.06);
--shadow-warm-lg: 0 10px 30px rgba(29, 25, 22, 0.08);
--shadow-warm-xl: 0 20px 50px rgba(29, 25, 22, 0.12);
```

### Colored Shadows (for elevated elements)
```css
/* Blue glow */
box-shadow: 0 8px 30px rgba(59, 91, 219, 0.15);

/* Golden glow */
box-shadow: 0 8px 30px rgba(255, 216, 75, 0.2);
```

## Grain/Noise Texture

For warm organic aesthetic, add subtle grain overlay:

```css
/* Grain overlay mixin */
.grain::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.03;
  pointer-events: none;
  mix-blend-mode: multiply;
}
```

```tsx
// React component
const GrainOverlay = () => (
  <div
    className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-multiply"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
    }}
  />
)
```

## Z-Index Scale

```css
--z-base: 0;
--z-dropdown: 10;
--z-sticky: 20;
--z-fixed: 30;
--z-modal-backdrop: 40;
--z-modal: 50;
--z-popover: 60;
--z-toast: 70;
```

## Breakpoints

```css
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Wide screens */
```

## Animation Tokens

### Easing
```css
--ease-smooth: cubic-bezier(0.22, 1, 0.36, 1);
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

### Duration
```css
--duration-fast: 150ms;
--duration-normal: 300ms;
--duration-slow: 500ms;
--duration-reveal: 800ms;
```

### Spring Config (Framer Motion)
```ts
const springConfig = {
  gentle: { type: 'spring', stiffness: 120, damping: 14 },
  snappy: { type: 'spring', stiffness: 300, damping: 30 },
  bouncy: { type: 'spring', stiffness: 400, damping: 10 },
}
```
