export interface ColumnMap {
  date: string
  description: string
  amount: string
  transaction_type?: string
  memo?: string
  category?: string
}

export interface Profile {
  id: number
  name: string
  column_map: ColumnMap
  extra_column_map: Record<string, string>
  date_format: 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'DD/MM/YYYY'
  sign_convention: 'negative_expense' | 'positive_expense'
  created_at: string
}

export interface Transaction {
  id: number
  date: string
  description: string
  amount: number
  transaction_type: string | null
  memo: string | null
  category: string | null
  notes: string | null
  extra_data: Record<string, string> | null
  imported_at: string
  profile_id: number
}

export interface CategoryRule {
  id: number
  pattern: string
  category: string
  priority: number
}

export interface ParsedRow {
  date: string
  description: string
  amount: number
  transaction_type: string | null
  memo: string | null
  category: string | null
  extra_data: Record<string, string> | null
}

export interface MappingError {
  row: number
  message: string
}

export interface ImportResult {
  imported: number
  skipped_duplicates: number
  errors: MappingError[]
}
