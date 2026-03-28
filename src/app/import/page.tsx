'use client'
import { useEffect, useState } from 'react'
import { getProfiles, deleteProfile } from '@/lib/db'
import type { Profile } from '@/lib/types'
import ProfileWizard from './ProfileWizard'
import ImportFlow from './ImportFlow'

type Mode =
  | { type: 'landing' }
  | { type: 'wizard' }
  | { type: 'import'; profile: Profile }

export default function ImportPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [mode, setMode] = useState<Mode>({ type: 'landing' })

  async function loadProfiles() {
    setProfiles(await getProfiles())
  }

  useEffect(() => { loadProfiles() }, [])

  if (mode.type === 'wizard') {
    return (
      <ProfileWizard
        onComplete={() => { loadProfiles(); setMode({ type: 'landing' }) }}
        onCancel={() => setMode({ type: 'landing' })}
      />
    )
  }

  if (mode.type === 'import') {
    return (
      <ImportFlow
        profile={mode.profile}
        onComplete={() => setMode({ type: 'landing' })}
        onCancel={() => setMode({ type: 'landing' })}
      />
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Import</h1>
        <button
          onClick={() => setMode({ type: 'wizard' })}
          className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors"
        >
          New Profile
        </button>
      </div>

      {profiles.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No import profiles yet. Create one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 max-w-xl">
          {profiles.map(profile => (
            <div
              key={profile.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
            >
              <span className="text-sm font-medium text-gray-900">{profile.name}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode({ type: 'import', profile })}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Import CSV
                </button>
                <button
                  onClick={async () => {
                    await deleteProfile(profile.id)
                    loadProfiles()
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
