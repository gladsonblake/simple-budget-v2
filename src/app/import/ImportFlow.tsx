'use client'
import { useReducer, useRef, useEffect, useState, useCallback } from 'react'
import { parseCsv } from '@/lib/csv'
import { applyMapping } from '@/lib/mapping'
import { detectDuplicates } from '@/lib/duplicates'
import { getTransactions, insertTransactions } from '@/lib/db'
import type { Profile, ParsedRow, MappingError, ImportResult, Transaction } from '@/lib/types'

type ImportState = {
  step: 1 | 2 | 3
  parsedRows: ParsedRow[]
  parseErrors: MappingError[]
  duplicateFlags: boolean[]
  skipFlags: boolean[]
  result: ImportResult | null
  existing: Transaction[]
}

type ImportAction =
  | { type: 'SET_EXISTING'; rows: Transaction[] }
  | { type: 'PARSED'; rows: ParsedRow[]; errors: MappingError[]; duplicates: boolean[] }
  | { type: 'TOGGLE_SKIP'; index: number }
  | { type: 'SET_RESULT'; result: ImportResult }
  | { type: 'RESET' }

function reducer(state: ImportState, action: ImportAction): ImportState {
  switch (action.type) {
    case 'SET_EXISTING': return { ...state, existing: action.rows }
    case 'PARSED': return {
      ...state,
      step: 2,
      parsedRows: action.rows,
      parseErrors: action.errors,
      duplicateFlags: action.duplicates,
      skipFlags: action.duplicates.map(d => d),
    }
    case 'TOGGLE_SKIP': {
      const next = [...state.skipFlags]
      next[action.index] = !next[action.index]
      return { ...state, skipFlags: next }
    }
    case 'SET_RESULT': return { ...state, step: 3, result: action.result }
    case 'RESET': return { ...initialState, existing: state.existing }
    default: return state
  }
}

const initialState: ImportState = {
  step: 1,
  parsedRows: [],
  parseErrors: [],
  duplicateFlags: [],
  skipFlags: [],
  result: null,
  existing: [],
}

interface Props {
  profile: Profile
  onComplete: () => void
  onCancel: () => void
}

export default function ImportFlow({ profile, onComplete, onCancel }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    getTransactions().then(rows => dispatch({ type: 'SET_EXISTING', rows }))
  }, [])

  const processFile = useCallback(async (file: File) => {
    const text = await file.text()
    const { headers, rows } = parseCsv(text)
    const { rows: parsed, errors } = applyMapping(headers, rows, profile)
    const duplicates = detectDuplicates(parsed, state.existing)
    dispatch({ type: 'PARSED', rows: parsed, errors, duplicates })
  }, [profile, state.existing])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await processFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
  }

  async function handleConfirm() {
    const toInsert = state.parsedRows
      .filter((_, i) => !state.skipFlags[i])
      .map(r => ({ ...r, notes: null, profile_id: profile.id }))

    await insertTransactions(toInsert)

    const result: ImportResult = {
      imported: toInsert.length,
      skipped_duplicates: state.skipFlags.filter(Boolean).length,
      errors: state.parseErrors,
    }
    dispatch({ type: 'SET_RESULT', result })
  }

  if (state.step === 3 && state.result) {
    return (
      <div className="p-8 max-w-xl">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Import Complete</h1>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Imported</span>
            <span className="text-sm font-medium text-gray-900">{state.result.imported}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Skipped duplicates</span>
            <span className="text-sm font-medium text-gray-900">{state.result.skipped_duplicates}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Errors</span>
            <span className="text-sm font-medium text-gray-900">{state.result.errors.length}</span>
          </div>
        </div>
        {state.result.errors.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Error details</p>
            <ul className="space-y-1">
              {state.result.errors.map((e, i) => (
                <li key={i} className="text-xs text-red-600">Row {e.row}: {e.message}</li>
              ))}
            </ul>
          </div>
        )}
        <button
          onClick={onComplete}
          className="mt-6 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Done
        </button>
      </div>
    )
  }

  if (state.step === 2) {
    const toImportCount = state.skipFlags.filter(f => !f).length
    return (
      <div className="p-8 max-w-3xl">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Review Import</h1>
        <p className="text-sm text-gray-500 mb-4">
          {state.parsedRows.length} rows parsed · {state.duplicateFlags.filter(Boolean).length} likely duplicates
        </p>
        <div className="overflow-x-auto rounded-lg border border-gray-200 mb-6">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Import</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Date</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Description</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">Amount</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.parsedRows.map((row, i) => (
                <tr key={i} className={state.skipFlags[i] ? 'opacity-40' : ''}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={!state.skipFlags[i]}
                      onChange={() => dispatch({ type: 'TOGGLE_SKIP', index: i })}
                    />
                  </td>
                  <td className="px-3 py-2 text-gray-700">{row.date}</td>
                  <td className="px-3 py-2 text-gray-700 max-w-xs truncate">{row.description}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{row.amount.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    {state.duplicateFlags[i] && (
                      <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                        duplicate
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={toImportCount === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Import {toImportCount} transaction{toImportCount !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Upload</h1>
      <p className="text-sm text-gray-500 mb-6">Profile: {profile.name}</p>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileRef.current?.click()}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 cursor-pointer transition-colors ${
          dragging
            ? 'border-gray-900 bg-gray-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        <svg className="mx-auto h-10 w-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
        </svg>
        <p className="text-sm font-medium text-gray-700">
          Drop your CSV file here, or <span className="text-blue-600">browse</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">CSV files only</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      <div className="flex gap-3 mt-6">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
