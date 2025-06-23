'use client'

import React from 'react'
import Image from 'next/image'

interface AvatarProps {
  src: string | null | undefined
  alt: string
  size?: number
}

const Avatar: React.FC<AvatarProps> = ({ src, alt, size = 40 }) => {
  const placeholder = '/images/default-logo.png' // A default placeholder image

  return (
    <div
      className="rounded-full overflow-hidden bg-gray-200 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Image
        src={src || placeholder}
        alt={alt}
        width={size}
        height={size}
        className="object-cover w-full h-full"
        priority={false}
        onError={(e) => {
          // In case of error (e.g., Gravatar link is broken), fallback to placeholder
          const target = e.target as HTMLImageElement;
          target.onerror = null; // prevent infinite loop
          target.src = placeholder;
        }}
      />
    </div>
  )
}

export default Avatar