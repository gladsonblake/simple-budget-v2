'use client'
import type { Category } from '@/lib/types'

interface Props {
  value: string
  categories: Category[]
  onChange: (value: string) => void
}

export default function CategorySelect({ value, categories, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
    >
      <option value="">— select —</option>
      {categories.map(c => (
        <option key={c.id} value={c.name}>{c.name}</option>
      ))}
    </select>
  )
}
