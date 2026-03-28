'use client'
import { useReducer, useRef } from 'react'
import { parseCsv } from '@/lib/csv'
import { applyMapping } from '@/lib/mapping'
import { saveProfile } from '@/lib/db'
import type { Profile, ColumnMap } from '@/lib/types'

type WizardState = {
  step: 1 | 2 | 3 | 4 | 5
  name: string
  headers: string[]
  previewRows: string[][]
  columnMap: Partial<ColumnMap>
  extraColumnMap: Record<string, string>
  dateFormat: Profile['date_format']
  signConvention: Profile['sign_convention']
}

type WizardAction =
  | { type: 'SET_NAME'; name: string }
  | { type: 'SET_CSV'; headers: string[]; previewRows: string[][] }
  | { type: 'SET_COLUMN'; field: keyof ColumnMap; csvColumn: string }
  | { type: 'SET_EXTRA_COLUMN'; csvColumn: string; key: string }
  | { type: 'REMOVE_EXTRA_COLUMN'; csvColumn: string }
  | { type: 'SET_DATE_FORMAT'; value: Profile['date_format'] }
  | { type: 'SET_SIGN_CONVENTION'; value: Profile['sign_convention'] }
  | { type: 'NEXT' }
  | { type: 'BACK' }

const initialState: WizardState = {
  step: 1,
  name: '',
  headers: [],
  previewRows: [],
  columnMap: {},
  extraColumnMap: {},
  dateFormat: 'MM/DD/YYYY',
  signConvention: 'negative_expense',
}

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_NAME': return { ...state, name: action.name }
    case 'SET_CSV': return { ...state, headers: action.headers, previewRows: action.previewRows }
    case 'SET_COLUMN': return {
      ...state,
      columnMap: { ...state.columnMap, [action.field]: action.csvColumn || undefined },
    }
    case 'SET_EXTRA_COLUMN': return {
      ...state,
      extraColumnMap: { ...state.extraColumnMap, [action.csvColumn]: action.key },
    }
    case 'REMOVE_EXTRA_COLUMN': {
      const next = { ...state.extraColumnMap }
      delete next[action.csvColumn]
      return { ...state, extraColumnMap: next }
    }
    case 'SET_DATE_FORMAT': return { ...state, dateFormat: action.value }
    case 'SET_SIGN_CONVENTION': return { ...state, signConvention: action.value }
    case 'NEXT': return { ...state, step: (state.step + 1) as WizardState['step'] }
    case 'BACK': return { ...state, step: (state.step - 1) as WizardState['step'] }
    default: return state
  }
}

const REQUIRED_FIELDS: (keyof ColumnMap)[] = ['date', 'description', 'amount']
const OPTIONAL_FIELDS: (keyof ColumnMap)[] = ['transaction_type', 'memo', 'category']
const FIELD_LABELS: Record<keyof ColumnMap, string> = {
  date: 'Date',
  description: 'Description',
  amount: 'Amount',
  transaction_type: 'Transaction Type',
  memo: 'Memo',
  category: 'Category',
}

interface Props {
  onComplete: () => void
  onCancel: () => void
}

export default function ProfileWizard({ onComplete, onCancel }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const fileRef = useRef<HTMLInputElement>(null)

  function canAdvance(): boolean {
    if (state.step === 1) return state.name.trim().length > 0
    if (state.step === 2) return state.headers.length > 0
    if (state.step === 3) return REQUIRED_FIELDS.every(f => state.columnMap[f])
    return true
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const { headers, rows } = parseCsv(text)
    dispatch({ type: 'SET_CSV', headers, previewRows: rows.slice(0, 3) })
  }

  async function handleSave() {
    const profile: Omit<Profile, 'id' | 'created_at'> = {
      name: state.name.trim(),
      column_map: state.columnMap as ColumnMap,
      extra_column_map: state.extraColumnMap,
      date_format: state.dateFormat,
      sign_convention: state.signConvention,
    }
    await saveProfile(profile)
    onComplete()
  }

  const mappedCsvColumns = new Set([
    ...Object.values(state.columnMap).filter(Boolean),
    ...Object.keys(state.extraColumnMap),
  ])

  const unmappedHeaders = state.headers.filter(h => !mappedCsvColumns.has(h))

  const previewProfile = {
    column_map: state.columnMap as ColumnMap,
    extra_column_map: state.extraColumnMap,
    date_format: state.dateFormat,
    sign_convention: state.signConvention,
  }
  const { rows: previewParsed } = state.previewRows.length > 0
    ? applyMapping(state.headers, state.previewRows, previewProfile)
    : { rows: [] }

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">New Profile</h1>
      <p className="text-sm text-gray-500 mb-6">Step {state.step} of 5</p>

      {state.step === 1 && (
        <div className="space-y-4">
          <label className="block" htmlFor="profile-name">
            <span className="text-sm font-medium text-gray-700">Profile name</span>
            <input
              type="text"
              id="profile-name"
              placeholder="e.g. Chase Freedom"
              value={state.name}
              onChange={e => dispatch({ type: 'SET_NAME', name: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </label>
        </div>
      )}

      {state.step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload a sample CSV from this provider. We&apos;ll detect the columns.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block text-sm text-gray-600"
          />
          {state.headers.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Detected columns</p>
              <div className="flex flex-wrap gap-1">
                {state.headers.map(h => (
                  <span key={h} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-700">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {state.step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-2">
            Match each field to the corresponding CSV column.
          </p>
          {REQUIRED_FIELDS.map(field => (
            <label key={field} className="block">
              <span className="text-sm font-medium text-gray-700">
                {FIELD_LABELS[field]} <span className="text-red-500">*</span>
              </span>
              <select
                value={state.columnMap[field] ?? ''}
                onChange={e => dispatch({ type: 'SET_COLUMN', field, csvColumn: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">— select column —</option>
                {state.headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </label>
          ))}
          {OPTIONAL_FIELDS.map(field => (
            <label key={field} className="block">
              <span className="text-sm font-medium text-gray-700">{FIELD_LABELS[field]}</span>
              <select
                value={state.columnMap[field] ?? ''}
                onChange={e => dispatch({ type: 'SET_COLUMN', field, csvColumn: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">— skip —</option>
                {state.headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </label>
          ))}
          {unmappedHeaders.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Extra columns (optional)</p>
              {unmappedHeaders.map(h => (
                <div key={h} className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-600 w-32 truncate">{h}</span>
                  <input
                    type="text"
                    placeholder="key name (or leave blank to skip)"
                    value={state.extraColumnMap[h] ?? ''}
                    onChange={e => {
                      if (e.target.value) {
                        dispatch({ type: 'SET_EXTRA_COLUMN', csvColumn: h, key: e.target.value })
                      } else {
                        dispatch({ type: 'REMOVE_EXTRA_COLUMN', csvColumn: h })
                      }
                    }}
                    className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {state.step === 4 && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Date format</span>
            <select
              value={state.dateFormat}
              onChange={e => dispatch({ type: 'SET_DATE_FORMAT', value: e.target.value as Profile['date_format'] })}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Amount sign convention</span>
            <select
              value={state.signConvention}
              onChange={e => dispatch({ type: 'SET_SIGN_CONVENTION', value: e.target.value as Profile['sign_convention'] })}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="negative_expense">Expenses are negative (e.g. -15.99)</option>
              <option value="positive_expense">Expenses are positive (e.g. 15.99)</option>
            </select>
          </label>
        </div>
      )}

      {state.step === 5 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Preview of first {previewParsed.length} row(s):</p>
          {previewParsed.length === 0 ? (
            <p className="text-sm text-gray-400">No rows to preview.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Date</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Description</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previewParsed.map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-700">{row.date}</td>
                      <td className="px-3 py-2 text-gray-700">{row.description}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{row.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 mt-8">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        {state.step > 1 && (
          <button
            onClick={() => dispatch({ type: 'BACK' })}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
        )}
        {state.step < 5 ? (
          <button
            onClick={() => dispatch({ type: 'NEXT' })}
            disabled={!canAdvance()}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Save Profile
          </button>
        )}
      </div>
    </div>
  )
}
