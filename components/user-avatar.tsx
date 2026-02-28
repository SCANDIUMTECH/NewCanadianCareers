'use client'

import * as React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn, getUserInitials, hashToHue } from '@/lib/utils'

export interface UserAvatarProps {
  name: string
  avatar?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
}

const sizeClasses = {
  xs: 'h-8 w-8 text-xs',
  sm: 'h-9 w-9 text-sm',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-24 w-24 text-2xl',
  '2xl': 'h-32 w-32 text-3xl',
}

const sizePixels = {
  xs: 32,
  sm: 36,
  md: 40,
  lg: 64,
  xl: 96,
  '2xl': 128,
}

const fontSizes = {
  xs: 12,
  sm: 14,
  md: 14,
  lg: 20,
  xl: 24,
  '2xl': 30,
}

interface FallbackSvgProps {
  initials: string
  hue: number
  size: number
  fontSize: number
  className?: string
}

function FallbackSvg({ initials, hue, size, fontSize, className }: FallbackSvgProps) {
  const bgColor = `hsl(${hue} 65% 45%)`
  const textColor = `hsl(${hue} 30% 96%)`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={cn('shrink-0 rounded-full', className)}
      role="img"
      aria-label={`Avatar with initials ${initials}`}
    >
      <rect width="100" height="100" rx="50" fill={bgColor} />
      <text
        x="50"
        y="50"
        dominantBaseline="central"
        textAnchor="middle"
        fill={textColor}
        fontSize={fontSize * (100 / size)}
        fontWeight="bold"
        fontFamily="var(--font-face-primary), var(--font-primary-stack)"
      >
        {initials}
      </text>
    </svg>
  )
}

export function UserAvatar({
  name,
  avatar,
  size = 'sm',
  className,
}: UserAvatarProps) {
  const initials = getUserInitials(name)
  const hue = hashToHue(name)
  const pixelSize = sizePixels[size]
  const fontSize = fontSizes[size]

  if (avatar) {
    return (
      <Avatar className={cn(sizeClasses[size], 'shrink-0', className)}>
        <AvatarImage
          src={avatar}
          alt={`${name} avatar`}
          className="object-cover"
        />
        <AvatarFallback className="p-0 bg-transparent">
          <FallbackSvg
            initials={initials}
            hue={hue}
            size={pixelSize}
            fontSize={fontSize}
          />
        </AvatarFallback>
      </Avatar>
    )
  }

  return (
    <FallbackSvg
      initials={initials}
      hue={hue}
      size={pixelSize}
      fontSize={fontSize}
      className={className}
    />
  )
}
