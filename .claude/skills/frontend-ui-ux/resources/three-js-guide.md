# Three.js Integration Guide

Guide for integrating Three.js and React Three Fiber into Orion.

## When to Use Three.js

**Appropriate Use Cases:**
- Hero section backgrounds with 3D elements
- Interactive data visualization
- Product showcases and demos
- Ambient decorative elements (particles, shapes)
- Immersive scroll experiences

**When to Avoid:**
- Simple 2D animations (use Framer Motion instead)
- Static decorative elements (use CSS/SVG)
- Content-heavy pages where 3D adds no value
- When targeting low-power devices

## Setup

### Installation

```bash
npm install three @react-three/fiber @react-three/drei
```

### Basic Scene Setup

```tsx
'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Suspense } from 'react'

function Scene() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 5]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <OrbitControls enableZoom={false} enablePan={false} />
      {/* Your 3D content */}
    </>
  )
}

export function ThreeScene() {
  return (
    <div className="h-screen w-full">
      <Canvas>
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  )
}
```

### Performance-Optimized Setup

```tsx
import { Canvas } from '@react-three/fiber'
import { Preload, PerformanceMonitor } from '@react-three/drei'
import { Suspense, useState } from 'react'

function CanvasFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

export function OptimizedCanvas({ children }) {
  const [dpr, setDpr] = useState(1.5)

  return (
    <Canvas
      dpr={dpr}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      }}
      performance={{ min: 0.5 }}
    >
      <Suspense fallback={null}>
        <PerformanceMonitor
          onIncline={() => setDpr(2)}
          onDecline={() => setDpr(1)}
        >
          {children}
        </PerformanceMonitor>
        <Preload all />
      </Suspense>
    </Canvas>
  )
}
```

## Performance Guidelines

### Budget

| Metric | Target | Maximum |
|--------|--------|---------|
| Frame time | < 16ms | 33ms |
| Draw calls | < 50 | 100 |
| Triangles | < 100K | 500K |
| Texture memory | < 50MB | 100MB |

### Optimization Techniques

```tsx
// 1. Use instancing for repeated objects
import { Instances, Instance } from '@react-three/drei'

function Particles({ count = 100 }) {
  return (
    <Instances limit={count}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshBasicMaterial color="#3B5BDB" />
      {Array.from({ length: count }).map((_, i) => (
        <Instance
          key={i}
          position={[
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
          ]}
        />
      ))}
    </Instances>
  )
}

// 2. Use lower resolution for offscreen or background elements
<mesh>
  <sphereGeometry args={[1, 16, 16]} /> {/* Not 64, 64 */}
  <meshStandardMaterial />
</mesh>

// 3. Dispose of resources
useEffect(() => {
  return () => {
    geometry.dispose()
    material.dispose()
    texture.dispose()
  }
}, [])

// 4. Use frameloop="demand" for static scenes
<Canvas frameloop="demand">
  <StaticScene />
</Canvas>
```

## Common Patterns

### Cursor-Reactive 3D Element

```tsx
'use client'

import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import * as THREE from 'three'

function CursorFollower() {
  const mesh = useRef<THREE.Mesh>(null)
  const { mouse, viewport } = useThree()

  useFrame(() => {
    if (!mesh.current) return
    mesh.current.position.x = THREE.MathUtils.lerp(
      mesh.current.position.x,
      (mouse.x * viewport.width) / 2,
      0.05
    )
    mesh.current.position.y = THREE.MathUtils.lerp(
      mesh.current.position.y,
      (mouse.y * viewport.height) / 2,
      0.05
    )
  })

  return (
    <Float speed={2} rotationIntensity={0.5}>
      <mesh ref={mesh}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#3B5BDB" roughness={0.1} metalness={0.8} />
      </mesh>
    </Float>
  )
}
```

### Ambient Floating Shapes

```tsx
import { Float, MeshDistortMaterial } from '@react-three/drei'

function FloatingShapes() {
  return (
    <group>
      {/* Large blob */}
      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
        <mesh position={[-3, 1, -2]} scale={1.5}>
          <sphereGeometry args={[1, 64, 64]} />
          <MeshDistortMaterial
            color="#3B5BDB"
            speed={2}
            distort={0.3}
            roughness={0.2}
          />
        </mesh>
      </Float>

      {/* Small accent shape */}
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.3}>
        <mesh position={[3, -1, -1]} scale={0.5}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#FFD84B" roughness={0.3} />
        </mesh>
      </Float>

      {/* Torus */}
      <Float speed={1} rotationIntensity={0.2} floatIntensity={0.4}>
        <mesh position={[0, 2, -3]} rotation={[Math.PI / 4, 0, 0]}>
          <torusGeometry args={[1, 0.3, 16, 32]} />
          <meshStandardMaterial color="#DC3545" roughness={0.4} />
        </mesh>
      </Float>
    </group>
  )
}
```

### Particle Field

```tsx
'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ParticleFieldProps {
  count?: number
  size?: number
  color?: string
}

function ParticleField({ count = 500, size = 0.02, color = '#3B5BDB' }: ParticleFieldProps) {
  const points = useRef<THREE.Points>(null)

  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const baseColor = new THREE.Color(color)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10

      const variation = 0.2
      colors[i * 3] = baseColor.r + (Math.random() - 0.5) * variation
      colors[i * 3 + 1] = baseColor.g + (Math.random() - 0.5) * variation
      colors[i * 3 + 2] = baseColor.b + (Math.random() - 0.5) * variation
    }

    return [positions, colors]
  }, [count, color])

  useFrame((state) => {
    if (!points.current) return
    points.current.rotation.y = state.clock.elapsedTime * 0.02
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  )
}
```

### Scroll-Linked 3D Animation

```tsx
'use client'

import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'

function ScrollScene() {
  const mesh = useRef<THREE.Mesh>(null)
  const scroll = useScroll()

  useFrame(() => {
    if (!mesh.current) return
    const scrollProgress = scroll.offset // 0 to 1

    // Rotate based on scroll
    mesh.current.rotation.y = scrollProgress * Math.PI * 2

    // Scale based on scroll
    const scale = 1 + scrollProgress * 0.5
    mesh.current.scale.setScalar(scale)

    // Move along path
    mesh.current.position.y = Math.sin(scrollProgress * Math.PI) * 2
  })

  return (
    <mesh ref={mesh}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#3B5BDB" />
    </mesh>
  )
}

// Usage with ScrollControls
import { ScrollControls, Scroll } from '@react-three/drei'

<Canvas>
  <ScrollControls pages={3}>
    <ScrollScene />
    <Scroll html>
      {/* HTML content that scrolls */}
    </Scroll>
  </ScrollControls>
</Canvas>
```

## Warm Organic 3D Patterns

### Morphing Blob Geometry

```tsx
import { MeshDistortMaterial, Sphere } from '@react-three/drei'

function OrganicBlob() {
  return (
    <Sphere args={[1, 64, 64]} scale={2}>
      <MeshDistortMaterial
        color="#FFD84B"
        speed={1.5}
        distort={0.4}
        roughness={0.2}
        metalness={0.1}
      />
    </Sphere>
  )
}
```

### Warm-Colored Particle System

```tsx
function WarmParticles({ count = 300 }) {
  const warmColors = ['#FFD84B', '#DC3545', '#C17F59', '#F7F6F5']

  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 15
      positions[i * 3 + 1] = (Math.random() - 0.5) * 15
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15

      const color = new THREE.Color(
        warmColors[Math.floor(Math.random() * warmColors.length)]
      )
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    return [positions, colors]
  }, [count])

  // ... rest of particle implementation
}
```

### Soft Lighting Setup

```tsx
function WarmLighting() {
  return (
    <>
      {/* Main warm light */}
      <directionalLight
        position={[5, 5, 5]}
        intensity={1}
        color="#FFF5E1"
        castShadow
      />

      {/* Fill light */}
      <directionalLight
        position={[-5, 3, -5]}
        intensity={0.5}
        color="#FFD84B"
      />

      {/* Ambient */}
      <ambientLight intensity={0.4} color="#F7F6F5" />

      {/* Subtle rim light */}
      <pointLight position={[0, -5, 0]} intensity={0.3} color="#DC3545" />
    </>
  )
}
```

### Noise-Based Background Shader

```tsx
import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'

const GrainMaterial = shaderMaterial(
  {
    time: 0,
    color1: new THREE.Color('#F7F6F5'),
    color2: new THREE.Color('#FFD84B'),
  },
  // Vertex shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform float time;
    uniform vec3 color1;
    uniform vec3 color2;
    varying vec2 vUv;

    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec3 color = mix(color1, color2, vUv.y + sin(time * 0.5) * 0.1);
      float grain = noise(vUv * 500.0 + time) * 0.05;
      gl_FragColor = vec4(color + grain, 1.0);
    }
  `
)

extend({ GrainMaterial })

function GrainBackground() {
  const ref = useRef()

  useFrame((state) => {
    if (ref.current) {
      ref.current.time = state.clock.elapsedTime
    }
  })

  return (
    <mesh scale={[20, 20, 1]} position={[0, 0, -5]}>
      <planeGeometry />
      <grainMaterial ref={ref} />
    </mesh>
  )
}
```

## Accessibility

### Reduced Motion Support

```tsx
'use client'

import { useReducedMotion } from 'framer-motion'

function AccessibleScene() {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return <StaticFallback />
  }

  return <AnimatedScene />
}
```

### Static Fallback

```tsx
function StaticFallback() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10">
      {/* Static SVG or image alternative */}
      <svg
        className="absolute inset-0 h-full w-full opacity-30"
        viewBox="0 0 100 100"
      >
        <circle cx="30" cy="30" r="15" fill="currentColor" className="text-primary/20" />
        <circle cx="70" cy="60" r="20" fill="currentColor" className="text-primary/10" />
      </svg>
    </div>
  )
}
```

### Loading State

```tsx
import { Suspense } from 'react'

function ThreeSection() {
  return (
    <div className="relative h-screen">
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center bg-background">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
              <p className="mt-4 text-muted-foreground">Loading 3D scene...</p>
            </div>
          </div>
        }
      >
        <Canvas>
          <Scene />
        </Canvas>
      </Suspense>
    </div>
  )
}
```

## Integration with Existing Components

### Canvas Behind Content

```tsx
<section className="relative min-h-screen">
  {/* 3D Background */}
  <div className="absolute inset-0 -z-10">
    <Canvas>
      <Suspense fallback={null}>
        <ParticleField />
      </Suspense>
    </Canvas>
    {/* Gradient overlay for readability */}
    <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/50 to-background" />
  </div>

  {/* Content */}
  <div className="relative z-10 container mx-auto px-4 py-32">
    <TextReveal as="h1">Hero Headline</TextReveal>
  </div>
</section>
```

### Inline 3D Element

```tsx
<Card className="overflow-hidden">
  <div className="h-48">
    <Canvas>
      <Suspense fallback={null}>
        <ambientLight />
        <Float speed={2}>
          <mesh>
            <boxGeometry />
            <meshStandardMaterial color="#3B5BDB" />
          </mesh>
        </Float>
      </Suspense>
    </Canvas>
  </div>
  <CardContent>
    <h3>Interactive 3D Card</h3>
  </CardContent>
</Card>
```

## Debugging

```tsx
import { Stats, GizmoHelper, GizmoViewport } from '@react-three/drei'

// Add to scene during development
<>
  <Stats />
  <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
    <GizmoViewport />
  </GizmoHelper>
</>
```
