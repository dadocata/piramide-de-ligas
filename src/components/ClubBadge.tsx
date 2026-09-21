import type { Club } from '@/domain/types'
import { CrestImage } from './CrestImage'

interface ClubBadgeProps {
  club: Club
  onClick?: (club: Club) => void
}

export function ClubBadge({ club, onClick }: ClubBadgeProps) {
  return (
    <button type="button" className="club-badge" onClick={() => onClick?.(club)} title={club.name}>
      <CrestImage data={club.crestData} name={club.name} />
      <span>{club.name}</span>
    </button>
  )
}