# Animation Patterns

Motion design patterns for Orion with code examples.

## Existing Animation System

### MotionWrapper

Scroll-triggered reveal using IntersectionObserver:

```tsx
import { MotionWrapper } from '@/components/motion-wrapper'

// Basic usage
<MotionWrapper>
  <Card />
</MotionWrapper>

// With options
<MotionWrapper
  delay={100}          // ms delay before animation
  direction="up"       // 'up' | 'down' | 'left' | 'right'
  distance={30}        // px to travel
  duration={600}       // ms duration
  threshold={0.1}      // IntersectionObserver threshold
>
  <Content />
</MotionWrapper>
```

### TextReveal

Word-by-word text reveal:

```tsx
import { TextReveal } from '@/components/text-reveal'

<TextReveal
  as="h1"              // HTML element
  delay={200}          // Initial delay
  stagger={50}         // Delay between words
  className="text-4xl font-bold"
>
  Build your dream team
</TextReveal>
```

### LineReveal

Multi-line staggered reveal:

```tsx
import { LineReveal } from '@/components/line-reveal'

<LineReveal
  lines={[
    "Enterprise-grade hiring",
    "Made beautifully simple"
  ]}
  delay={100}
  lineDelay={150}      // Delay between lines
/>
```

### ConstellationCanvas

Interactive particle background:

```tsx
import { ConstellationCanvas } from '@/components/constellation-canvas'

<div className="relative">
  <ConstellationCanvas
    particleCount={80}
    connectionDistance={150}
    particleColor="rgba(59, 91, 219, 0.5)"
    lineColor="rgba(59, 91, 219, 0.1)"
  />
  <div className="relative z-10">
    {/* Content */}
  </div>
</div>
```

## Framer Motion Patterns

### Container/Item Variants (Staggered Reveals)

```tsx
import { motion } from 'framer-motion'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

// Usage
<motion.div
  variants={containerVariants}
  initial="hidden"
  whileInView="show"
  viewport={{ once: true, margin: "-100px" }}
>
  {items.map((item) => (
    <motion.div key={item.id} variants={itemVariants}>
      {item.content}
    </motion.div>
  ))}
</motion.div>
```

### Layout Animations

```tsx
import { motion, LayoutGroup } from 'framer-motion'

// Shared layout animation
<LayoutGroup>
  {tabs.map((tab) => (
    <button key={tab.id} onClick={() => setActive(tab.id)}>
      {tab.label}
      {active === tab.id && (
        <motion.div
          layoutId="activeTab"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}
    </button>
  ))}
</LayoutGroup>

// Auto-layout on content change
<motion.div layout className="grid gap-4">
  {filteredItems.map((item) => (
    <motion.div
      key={item.id}
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
    >
      {item.content}
    </motion.div>
  ))}
</motion.div>
```

### Gesture Interactions

```tsx
// Hover and tap
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
>
  Click me
</motion.button>

// Drag
<motion.div
  drag
  dragConstraints={{ left: 0, right: 300, top: 0, bottom: 200 }}
  dragElastic={0.1}
  whileDrag={{ scale: 1.05 }}
>
  Drag me
</motion.div>

// Hover with complex animation
<motion.div
  whileHover="hover"
  initial="initial"
>
  <motion.span
    variants={{
      initial: { x: 0 },
      hover: { x: 4 },
    }}
    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
  >
    →
  </motion.span>
</motion.div>
```

### AnimatePresence (Exit Animations)

```tsx
import { motion, AnimatePresence } from 'framer-motion'

<AnimatePresence mode="wait">
  {isVisible && (
    <motion.div
      key="modal"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <Modal />
    </motion.div>
  )}
</AnimatePresence>

// Page transitions
<AnimatePresence mode="wait">
  <motion.div
    key={pathname}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
</AnimatePresence>
```

### Scroll-Linked Animations

```tsx
import { motion, useScroll, useTransform } from 'framer-motion'

function ParallaxSection() {
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], [0, -100])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  return (
    <motion.div style={{ y, opacity }}>
      {/* Content moves up and fades as user scrolls */}
    </motion.div>
  )
}

// Element-specific scroll tracking
function ElementParallax() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  })
  const y = useTransform(scrollYProgress, [0, 1], [100, -100])

  return (
    <motion.div ref={ref} style={{ y }}>
      {/* Parallax relative to element position */}
    </motion.div>
  )
}
```

## Warm Organic Motion Patterns

### Spring Physics

Natural, organic feel with spring animations:

```tsx
// Gentle spring for UI elements
const gentleSpring = {
  type: 'spring',
  stiffness: 120,
  damping: 14,
}

// Snappy spring for buttons
const snappySpring = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
}

// Bouncy spring for playful elements
const bouncySpring = {
  type: 'spring',
  stiffness: 400,
  damping: 10,
}

<motion.div
  whileHover={{ scale: 1.05 }}
  transition={gentleSpring}
/>
```

### Morphing Blob Shapes

SVG path morphing for organic shapes:

```tsx
import { motion } from 'framer-motion'

const blobPaths = {
  initial: "M45.4,-51.3C58.6,-40.2,69.2,-25.1,71.7,-8.5C74.2,8.1,68.6,26.1,57.6,39.3C46.6,52.5,30.2,60.8,12.5,65.3C-5.2,69.8,-24.2,70.5,-39.6,63.1C-55,55.7,-66.8,40.2,-71.8,22.9C-76.8,5.6,-75,-13.5,-67.3,-30.3C-59.6,-47.1,-46,-61.6,-30.8,-72C-15.6,-82.4,1.2,-88.7,16.1,-83.1C31,-77.5,32.2,-62.4,45.4,-51.3Z",
  hover: "M47.7,-55.4C60.9,-44.8,70.3,-28.7,73.2,-11.4C76.1,5.9,72.5,24.4,62.2,38.3C51.9,52.2,34.9,61.5,16.7,66.3C-1.5,71.1,-20.9,71.4,-37.9,64.6C-54.9,57.8,-69.5,43.9,-75.3,27C-81.1,10.1,-78.1,-9.8,-70.2,-27.1C-62.3,-44.4,-49.5,-59.1,-34.6,-69.2C-19.7,-79.3,-2.7,-84.8,12.8,-81.6C28.3,-78.4,42.3,-66.5,47.7,-55.4Z",
}

<motion.svg viewBox="0 0 200 200">
  <motion.path
    initial="initial"
    animate="hover"
    variants={blobPaths}
    fill="#FFD84B"
    transition={{
      duration: 8,
      repeat: Infinity,
      repeatType: 'reverse',
      ease: 'easeInOut',
    }}
  />
</motion.svg>
```

### Cursor-Reactive Elements

```tsx
import { motion, useMotionValue, useSpring } from 'framer-motion'

function CursorReactive({ children }) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springConfig = { damping: 25, stiffness: 150 }
  const x = useSpring(mouseX, springConfig)
  const y = useSpring(mouseY, springConfig)

  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    mouseX.set((e.clientX - centerX) * 0.1)
    mouseY.set((e.clientY - centerY) * 0.1)
  }

  function handleMouseLeave() {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x, y }}
    >
      {children}
    </motion.div>
  )
}
```

### Fluid State Transitions

```tsx
const cardVariants = {
  idle: {
    scale: 1,
    boxShadow: '0 4px 12px rgba(29, 25, 22, 0.06)',
  },
  hover: {
    scale: 1.02,
    boxShadow: '0 20px 50px rgba(29, 25, 22, 0.12)',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
  tap: {
    scale: 0.98,
    boxShadow: '0 2px 8px rgba(29, 25, 22, 0.08)',
  },
}

<motion.div
  variants={cardVariants}
  initial="idle"
  whileHover="hover"
  whileTap="tap"
/>
```

## Keyframe Animations

### CSS Keyframes for Simple Loops

```css
/* Float animation */
@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.float {
  animation: float 3s ease-in-out infinite;
}

/* Pulse glow */
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(59, 91, 219, 0.3);
  }
  50% {
    box-shadow: 0 0 40px rgba(59, 91, 219, 0.5);
  }
}

/* Grain texture animation */
@keyframes grain {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-5%, -10%); }
  20% { transform: translate(-15%, 5%); }
  30% { transform: translate(7%, -25%); }
  40% { transform: translate(-5%, 25%); }
  50% { transform: translate(-15%, 10%); }
  60% { transform: translate(15%, 0%); }
  70% { transform: translate(0%, 15%); }
  80% { transform: translate(3%, 35%); }
  90% { transform: translate(-10%, 10%); }
}

.grain::before {
  animation: grain 8s steps(10) infinite;
}
```

### Framer Motion Keyframes

```tsx
<motion.div
  animate={{
    scale: [1, 1.1, 1],
    opacity: [0.5, 1, 0.5],
  }}
  transition={{
    duration: 2,
    repeat: Infinity,
    ease: 'easeInOut',
  }}
/>
```

## Performance Tips

### GPU Acceleration

```css
/* Force GPU rendering */
.accelerated {
  transform: translateZ(0);
  will-change: transform;
}
```

### Reduced Motion

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

### Lazy Loading Animations

```tsx
// Only animate when in viewport
<motion.div
  initial={{ opacity: 0 }}
  whileInView={{ opacity: 1 }}
  viewport={{ once: true, amount: 0.3 }}
/>
```

### Animation Frame Budget

- Keep animations under 16ms per frame
- Avoid animating `width`, `height`, `top`, `left` (triggers layout)
- Prefer `transform` and `opacity` (compositor-only)
- Use `will-change` sparingly (memory cost)

```tsx
// Good: transform-based animation
<motion.div animate={{ x: 100, scale: 1.1 }} />

// Avoid: layout-triggering properties
<motion.div animate={{ width: 200, marginLeft: 50 }} />
```

## Common Animation Recipes

### Page Load Sequence

```tsx
const pageVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
}

const sectionVariants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
}

<motion.main variants={pageVariants} initial="hidden" animate="show">
  <motion.section variants={sectionVariants}>Hero</motion.section>
  <motion.section variants={sectionVariants}>Features</motion.section>
  <motion.section variants={sectionVariants}>CTA</motion.section>
</motion.main>
```

### Card Hover Effect

```tsx
<motion.div
  className="relative overflow-hidden rounded-xl bg-card p-6"
  whileHover="hover"
  initial="initial"
>
  {/* Gradient overlay */}
  <motion.div
    className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"
    variants={{
      initial: { opacity: 0 },
      hover: { opacity: 1 },
    }}
  />
  {/* Arrow indicator */}
  <motion.span
    className="absolute right-4 top-4"
    variants={{
      initial: { x: 0, opacity: 0.5 },
      hover: { x: 4, opacity: 1 },
    }}
  >
    →
  </motion.span>
  {/* Content */}
  <div className="relative z-10">{content}</div>
</motion.div>
```

### Number Counter

```tsx
import { motion, useSpring, useTransform } from 'framer-motion'

function Counter({ value }) {
  const spring = useSpring(0, { stiffness: 100, damping: 30 })
  const display = useTransform(spring, (v) => Math.round(v))

  useEffect(() => {
    spring.set(value)
  }, [spring, value])

  return <motion.span>{display}</motion.span>
}
```
