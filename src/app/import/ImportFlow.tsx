'use client'
import type { Profile } from '@/lib/types'
interface Props {
  profile: Profile
  onComplete: () => void
  onCancel: () => void
}
export default function ImportFlow({ onCancel }: Props) {
  return <div><button onClick={onCancel}>Cancel</button></div>
}
