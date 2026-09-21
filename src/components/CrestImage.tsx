import { useState } from 'react'

function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface CrestImageProps {
  data?: string
  name: string
  size?: 'sm' | 'lg' | 'xl'
}

export function CrestImage({ data, name, size = 'sm' }: CrestImageProps) {
  const [failed, setFailed] = useState(false)
  const showFallback = !data || failed
  const c1 = '#334155'
  const c2 = '#94a3b8'

  if (showFallback) {
    return (
      <span
        className={`crest fallback ${size === 'lg' ? 'lg' : size === 'xl' ? 'xl' : ''}`}
        role="img"
        aria-label={name}
        style={{
          background: `linear-gradient(135deg, ${c1}, ${c2})`,
          border: c1.toLowerCase() === '#ffffff' ? '1px solid #dde3ec' : undefined
        }}
      >
        {initials(name)}
      </span>
    )
  }

  return (
    <img
      className={`crest crest-image ${size === 'lg' ? 'lg' : size === 'xl' ? 'xl' : ''}`}
      src={data}
      alt={name}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  )
}