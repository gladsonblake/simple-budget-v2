'use client'
interface Props {
  onComplete: () => void
  onCancel: () => void
}
export default function ProfileWizard({ onCancel }: Props) {
  return <div><button onClick={onCancel}>Cancel</button></div>
}
