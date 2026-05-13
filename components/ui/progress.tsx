import React from 'react'

interface ProgressProps {
  value: number
  max?: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Progress({ value, max = 100, className = '', size = 'md' }: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  }

  return (
    <div className={`w-full bg-gray-700 rounded-full ${sizeClasses[size]} ${className}`}>
      <div
        className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-300 ease-in-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}