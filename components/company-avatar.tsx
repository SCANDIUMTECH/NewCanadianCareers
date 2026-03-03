'use client'

import * as React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn, getCompanyInitials, hashToHue } from '@/lib/utils'

export interface CompanyAvatarProps {
  name: string
  logo?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
}

const sizeClasses = {
  xs: 'h-9 w-9 rounded-lg text-xs',
  sm: 'h-12 w-12 rounded-xl text-lg',
  md: 'h-14 w-14 rounded-xl text-xl',
  lg: 'h-16 w-16 rounded-xl text-xl',
  xl: 'h-24 w-24 rounded-2xl text-3xl',
  '2xl': 'h-32 w-32 rounded-2xl text-4xl',
}

const sizePixels = {
  xs: 36,
  sm: 48,
  md: 56,
  lg: 64,
  xl: 96,
  '2xl': 128,
}

const fontSizes = {
  xs: 12,
  sm: 18,
  md: 20,
  lg: 20,
  xl: 30,
  '2xl': 40,
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
      className={cn('shrink-0', className)}
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

export function CompanyAvatar({
  name,
  logo,
  size = 'sm',
  className,
}: CompanyAvatarProps) {
  const initials = getCompanyInitials(name)
  const hue = hashToHue(name)
  const pixelSize = sizePixels[size]
  const fontSize = fontSizes[size]

  if (logo) {
    return (
      <Avatar className={cn(sizeClasses[size], 'shrink-0', className)}>
        <AvatarImage
          src={logo}
          alt={`${name} logo`}
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
