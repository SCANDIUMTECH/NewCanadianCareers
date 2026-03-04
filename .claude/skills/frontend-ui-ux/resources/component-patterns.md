# Component Patterns

UI component library reference for Orion.

## Button Variants

### Primary Button

```tsx
import { Button } from '@/components/ui/button'

<Button>Get Started</Button>

// With icon
<Button>
  Get Started
  <ArrowRight className="ml-2 h-4 w-4" />
</Button>
```

### Ghost Button

```tsx
<Button variant="ghost">Learn More</Button>
```

### Outline Button

```tsx
<Button variant="outline">View Demo</Button>
```

### Animated Button with Hover Effect

```tsx
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
  <Button className="relative overflow-hidden group">
    <span className="relative z-10">Get Started</span>
    <motion.div
      className="absolute inset-0 bg-primary-foreground/10"
      initial={{ x: '-100%' }}
      whileHover={{ x: 0 }}
      transition={{ duration: 0.3 }}
    />
  </Button>
</motion.div>
```

### Magnetic Button

Interactive button that follows cursor:

```tsx
import { MagneticButton } from '@/components/magnetic-button'

<MagneticButton strength={0.3}>
  <Button size="lg">
    Start Hiring
    <ArrowRight className="ml-2 h-4 w-4" />
  </Button>
</MagneticButton>
```

Implementation:
```tsx
'use client'

import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useRef } from 'react'

interface MagneticButtonProps {
  children: React.ReactNode
  strength?: number
}

export function MagneticButton({ children, strength = 0.3 }: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const springConfig = { damping: 15, stiffness: 150 }
  const springX = useSpring(x, springConfig)
  const springY = useSpring(y, springConfig)

  function handleMouseMove(e: React.MouseEvent) {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    x.set((e.clientX - centerX) * strength)
    y.set((e.clientY - centerY) * strength)
  }

  function handleMouseLeave() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
    >
      {children}
    </motion.div>
  )
}
```

## Card Patterns

### Basic Card

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Feature Title</CardTitle>
    <CardDescription>Feature description text</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Glassmorphism Card

```tsx
<div className="bg-card/70 backdrop-blur-2xl border border-white/20 rounded-xl p-6 shadow-xl">
  {/* Content */}
</div>

// With hover effect
<motion.div
  className="bg-card/70 backdrop-blur-2xl border border-white/20 rounded-xl p-6 shadow-xl"
  whileHover={{
    y: -4,
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
  }}
  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
>
  {/* Content */}
</motion.div>
```

### 3D Tilt Card

```tsx
import { UIFrame } from '@/components/ui-frame'

<UIFrame tilt={true} className="p-6">
  <h3 className="text-xl font-semibold">Card Title</h3>
  <p className="text-muted-foreground">Card content goes here</p>
</UIFrame>
```

Implementation:
```tsx
'use client'

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useRef } from 'react'

interface UIFrameProps {
  children: React.ReactNode
  tilt?: boolean
  className?: string
}

export function UIFrame({ children, tilt = false, className }: UIFrameProps) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [10, -10]), {
    stiffness: 300,
    damping: 30,
  })
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-10, 10]), {
    stiffness: 300,
    damping: 30,
  })

  function handleMouseMove(e: React.MouseEvent) {
    if (!ref.current || !tilt) return
    const rect = ref.current.getBoundingClientRect()
    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  function handleMouseLeave() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      className={cn('bg-card rounded-xl border shadow-lg', className)}
    >
      {children}
    </motion.div>
  )
}
```

### Feature Card with Icon

```tsx
<Card className="group relative overflow-hidden">
  <CardContent className="pt-6">
    <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
      <Sparkles className="h-6 w-6 text-primary" />
    </div>
    <h3 className="mb-2 text-xl font-semibold">AI-Powered Matching</h3>
    <p className="text-muted-foreground">
      Our algorithms find the perfect candidates for your roles.
    </p>
    {/* Hover gradient */}
    <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
  </CardContent>
</Card>
```

### Stats Card

```tsx
<Card className="text-center">
  <CardContent className="pt-6">
    <motion.span
      className="text-4xl font-bold text-primary"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      10K+
    </motion.span>
    <p className="mt-2 text-muted-foreground">Active Companies</p>
  </CardContent>
</Card>
```

## Section Layouts

### Hero Section

```tsx
<section className="relative min-h-screen overflow-hidden">
  {/* Background */}
  <div className="absolute inset-0 -z-10">
    <ConstellationCanvas />
    <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-background" />
  </div>

  {/* Content */}
  <div className="container mx-auto px-4 py-32">
    <div className="mx-auto max-w-3xl text-center">
      <MotionWrapper>
        <Badge className="mb-6">Now in Beta</Badge>
      </MotionWrapper>

      <TextReveal as="h1" className="text-5xl font-bold md:text-7xl">
        Build your dream team
      </TextReveal>

      <MotionWrapper delay={300}>
        <p className="mt-6 text-xl text-muted-foreground">
          The modern hiring platform for ambitious companies.
        </p>
      </MotionWrapper>

      <MotionWrapper delay={500}>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Button size="lg">Get Started Free</Button>
          <Button size="lg" variant="outline">Watch Demo</Button>
        </div>
      </MotionWrapper>
    </div>
  </div>
</section>
```

### Features Grid Section

```tsx
<section className="py-24">
  <div className="container mx-auto px-4">
    <div className="mx-auto max-w-2xl text-center">
      <TextReveal as="h2" className="text-3xl font-bold md:text-4xl">
        Everything you need to hire smarter
      </TextReveal>
      <MotionWrapper delay={200}>
        <p className="mt-4 text-muted-foreground">
          Powerful features designed for modern recruiting teams.
        </p>
      </MotionWrapper>
    </div>

    <motion.div
      className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3"
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-100px" }}
    >
      {features.map((feature) => (
        <motion.div key={feature.id} variants={itemVariants}>
          <FeatureCard {...feature} />
        </motion.div>
      ))}
    </motion.div>
  </div>
</section>
```

### Split Content Section

```tsx
<section className="py-24">
  <div className="container mx-auto px-4">
    <div className="grid items-center gap-12 lg:grid-cols-2">
      {/* Text */}
      <div>
        <TextReveal as="h2" className="text-3xl font-bold md:text-4xl">
          Streamline your hiring workflow
        </TextReveal>
        <MotionWrapper delay={200}>
          <p className="mt-6 text-lg text-muted-foreground">
            From job posting to offer letter, manage everything in one place.
          </p>
        </MotionWrapper>
        <MotionWrapper delay={400}>
          <ul className="mt-8 space-y-4">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </MotionWrapper>
      </div>

      {/* Visual */}
      <MotionWrapper delay={300} direction="right">
        <UIFrame tilt={true} className="p-4">
          <img
            src="/dashboard-preview.png"
            alt="Dashboard preview"
            className="rounded-lg"
          />
        </UIFrame>
      </MotionWrapper>
    </div>
  </div>
</section>
```

### CTA Section

```tsx
<section className="py-24">
  <div className="container mx-auto px-4">
    <motion.div
      className="relative overflow-hidden rounded-3xl bg-primary p-12 text-center text-primary-foreground md:p-20"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />

      <div className="relative z-10">
        <h2 className="text-3xl font-bold md:text-5xl">
          Ready to transform your hiring?
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-primary-foreground/80">
          Join thousands of companies already using Orion to build exceptional teams.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Button size="lg" variant="secondary">
            Start Free Trial
          </Button>
          <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
            Talk to Sales
          </Button>
        </div>
      </div>
    </motion.div>
  </div>
</section>
```

## Header Patterns

### Scroll-Responsive Header

```tsx
'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function Header() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 z-50 w-full transition-all duration-300',
        scrolled
          ? 'bg-background/80 backdrop-blur-xl shadow-sm'
          : 'bg-transparent'
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Logo />
        <Navigation />
        <div className="flex items-center gap-4">
          <Button variant="ghost">Sign In</Button>
          <Button>Get Started</Button>
        </div>
      </div>
    </header>
  )
}
```

### Glassmorphism Header

```tsx
<header className="fixed top-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2">
  <div className="flex items-center justify-between rounded-2xl bg-card/70 backdrop-blur-2xl border border-white/20 px-6 py-3 shadow-lg">
    <Logo />
    <Navigation />
    <Button>Get Started</Button>
  </div>
</header>
```

## Form Patterns

### Input with Validation

```tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="you@company.com"
    className={cn(error && 'border-destructive focus-visible:ring-destructive')}
  />
  {error && (
    <p className="text-sm text-destructive">{error}</p>
  )}
</div>
```

### Animated Form Field

```tsx
<motion.div
  className="space-y-2"
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.1 }}
>
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="you@company.com" />
</motion.div>
```

### Search Input

```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
  <Input className="pl-10" placeholder="Search candidates..." />
</div>
```

## Loading States

### Skeleton

```tsx
import { Skeleton } from '@/components/ui/skeleton'

// Card skeleton
<Card>
  <CardContent className="pt-6">
    <Skeleton className="h-12 w-12 rounded-lg" />
    <Skeleton className="mt-4 h-6 w-3/4" />
    <Skeleton className="mt-2 h-4 w-full" />
    <Skeleton className="mt-2 h-4 w-2/3" />
  </CardContent>
</Card>

// Table row skeleton
<div className="flex items-center gap-4 py-4">
  <Skeleton className="h-10 w-10 rounded-full" />
  <div className="space-y-2">
    <Skeleton className="h-4 w-32" />
    <Skeleton className="h-3 w-24" />
  </div>
</div>
```

### Loading Spinner

```tsx
<div className="flex items-center justify-center">
  <motion.div
    className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent"
    animate={{ rotate: 360 }}
    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
  />
</div>
```

### Shimmer Effect

```tsx
<div className="relative overflow-hidden rounded-lg bg-muted">
  <div className="h-48 w-full" />
  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
</div>

// Add to globals.css
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
```

## Avatar Patterns

### Avatar with Status

```tsx
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

<div className="relative">
  <Avatar>
    <AvatarImage src={user.avatar} alt={user.name} />
    <AvatarFallback>{user.initials}</AvatarFallback>
  </Avatar>
  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
</div>
```

### Avatar Stack

```tsx
<div className="flex -space-x-2">
  {users.slice(0, 4).map((user) => (
    <Avatar key={user.id} className="border-2 border-background">
      <AvatarImage src={user.avatar} alt={user.name} />
      <AvatarFallback>{user.initials}</AvatarFallback>
    </Avatar>
  ))}
  {users.length > 4 && (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-muted text-sm font-medium">
      +{users.length - 4}
    </div>
  )}
</div>
```

## Badge Patterns

### Status Badge

```tsx
import { Badge } from '@/components/ui/badge'

// Status variants
<Badge variant="default">Active</Badge>
<Badge variant="secondary">Pending</Badge>
<Badge variant="destructive">Rejected</Badge>
<Badge variant="outline">Draft</Badge>

// Custom status
<Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
  Hired
</Badge>
```

### Animated Badge

```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.8 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
>
  <Badge>New Feature</Badge>
</motion.div>
```
