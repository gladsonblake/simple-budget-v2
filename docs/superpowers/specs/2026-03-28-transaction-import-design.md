# Transaction Import Feature — Design Spec

**Date:** 2026-03-28
**Status:** Approved

---

## Overview

Build the transaction import feature for Simple Budget v2 (Tauri 2 + Next.js 16 desktop app). Users can import transactions from CSV files exported by credit card providers. Different providers use different column structures, so the feature supports named **import profiles** that store configurable column mappings. Once a profile is saved, recurring imports are a fast 3-step flow.

---

## Architecture

**Approach:** Frontend-heavy. CSV parsing, column mapping, rule application, and duplicate detection all happen in TypeScript. Tauri commands stay thin — SQLite reads/writes only.

---

## Database Schema

### `profiles`

| Column | Type | Notes |
|---|---|---|
| `id` | integer PK autoincrement | |
| `name` | text | e.g. "Chase Freedom" |
| `column_map` | JSON text | Maps standard field names → CSV column names: `{ "date": "Date", "description": "Name", "amount": "Amount", "transaction_type": "Transaction", "memo": "Memo" }` |
| `extra_column_map` | JSON text | Maps remaining CSV columns → keys for `extra_data`, e.g. `{ "Card No.": "card_no" }`. Empty object if none. |
| `date_format` | text | `"MM/DD/YYYY"`, `"YYYY-MM-DD"`, or `"DD/MM/YYYY"` |
| `sign_convention` | text | `"negative_expense"` or `"positive_expense"` |
| `created_at` | text | ISO timestamp |

### `transactions`

| Column | Type | Notes |
|---|---|---|
| `id` | integer PK autoincrement | |
| `date` | text | ISO date, normalized on import |
| `description` | text | From mapped `description` column (e.g. CSV `Name`) |
| `amount` | real | Normalized: positive = expense, negative = credit. If sign_convention is `"negative_expense"`, the CSV value is negated on import. If `"positive_expense"`, stored as-is. |
| `transaction_type` | text nullable | From mapped `transaction_type` column (e.g. "debit"/"credit") |
| `memo` | text nullable | From mapped `memo` column |
| `category` | text nullable | From mapped `category` column — only populated if the CSV has one (e.g. Capital One) |
| `notes` | text nullable | User-editable after import |
| `extra_data` | JSON nullable | Stores CSV columns listed in `extra_column_map` |
| `imported_at` | text | ISO timestamp |
| `profile_id` | integer FK | → profiles.id |

### `category_rules`

| Column | Type | Notes |
|---|---|---|
| `id` | integer PK autoincrement | |
| `pattern` | text | Case-insensitive substring match against `description` |
| `category` | text | e.g. "Entertainment" |
| `priority` | integer | Lower = higher priority; rules applied in ascending order |

Rules are global (not per-profile). The effective display category is resolved at read time:
```
category ?? firstMatchingRule(description, rules) ?? null
```

---

## Frontend Modules (`src/lib/`)

| File | Responsibility |
|---|---|
| `csv.ts` | Parse CSV text → `string[][]`, extract headers |
| `mapping.ts` | Apply a profile's `column_map` to raw rows → typed transaction objects |
| `rules.ts` | `applyRules(description: string, rules: CategoryRule[]) → string \| null` |
| `duplicates.ts` | Detect duplicates against existing DB rows (date + description + amount match) |
| `db.ts` | Thin wrappers around `@tauri-apps/api` `invoke` calls for each SQL operation |

---

## Tauri Commands (Rust — thin wrappers only)

- `init_db` — create tables if not exist; called on app start
- `get_profiles` / `save_profile` / `delete_profile`
- `get_category_rules` / `save_category_rules`
- `get_transactions` / `insert_transactions`

---

## Import Flow UX

### Landing Page (`/import`)

- Grid of saved profile cards, each with name + "Import CSV" button
- "New Profile" card at the end
- Link to `/transactions`

### Profile Wizard (new profile) — 5 steps

1. **Name** — text input for profile name
2. **Upload sample** — file picker; app reads headers and first 3 rows as preview
3. **Map columns** — dropdown per field:
   - Required: `date`, `description`, `amount`
   - Optional: `transaction_type`, `memo`, `category`
   - Extra: any remaining CSV columns can be optionally mapped to a custom key → stored in `extra_data`
4. **Configure** — date format selector, sign convention selector
5. **Preview & save** — first 5 parsed rows shown; confirm saves profile to DB

### Import Flow (existing profile) — 3 steps

1. **Upload** — file picker (profile pre-selected from landing)
2. **Review** — full table of parsed rows with rule-matched category displayed; duplicate rows flagged with a warning badge and skipped by default (checkbox to include anyway)
3. **Confirm** — inserts non-skipped rows; shows summary: X imported, Y duplicates skipped, Z errors

---

## Transactions Page (`/transactions`)

- Table view: date, description, amount, transaction_type, effective category (CSV category or rule-matched), memo, notes
- Sorted by date descending by default
- Category rules management UI (add/edit/reorder rules); changes reflect immediately in the table

---

## Duplicate Detection

A transaction is considered a likely duplicate if an existing DB row matches on all three of: `date`, `description`, and `amount`. Duplicates are surfaced in the Review step — skipped by default, user can override per row.

---

## Error Handling

- Rows that fail parsing (bad date, missing required field, non-numeric amount) are collected and shown in the import summary as errors; they are not inserted.
- Profile save is atomic — partial saves are not possible.
- All DB inserts in an import batch run in a single transaction; if the batch fails, nothing is committed.

---

## Testing

- `csv.ts`, `mapping.ts`, `rules.ts`, `duplicates.ts` are pure functions — unit tested with Vitest
- Wizard and import flow components tested with Vitest + React Testing Library
- Playwright smoke test: navigate to `/import`, verify page loads
