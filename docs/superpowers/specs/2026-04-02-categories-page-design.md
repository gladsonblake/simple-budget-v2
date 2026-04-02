# Categories Page & Rules Dropdown Design

**Date:** 2026-04-02

## Summary

Move category management (add, rename, delete) from the transactions page into a dedicated Categories page. The category rules panel in the transactions page becomes a pure rule editor with a read-only dropdown for category selection.

## Problem

Currently:
- The Categories page is a stub ("coming soon")
- Categories can be created inline inside the category rules dropdown (`CategorySelect`)
- Category rename/delete lives inside `CategoryRulesPanel` on the transactions page
- There is no single place to manage the category list

## Design

### Categories Page (`src/app/categories/page.tsx`)

Full client component. Responsibilities:
- Load all categories from DB on mount via `getCategories()`
- Display a list of categories with per-item **Rename** and **Delete** actions
  - Rename: click "Rename" → inline text input with Save/Cancel (same pattern as current panel)
  - Delete: calls `deleteCategory(id)`; shows error inline if rules reference the category
- **Add Category** input at the bottom: type a name, press Enter or click Add; calls `addCategory(name)`
- Uses existing DB functions: `getCategories`, `addCategory`, `renameCategory`, `deleteCategory` — no new DB layer needed

### `CategorySelect` (`src/app/transactions/CategorySelect.tsx`)

Simplified to a pure `<select>` dropdown:
- Renders `— select —` placeholder + one `<option>` per category
- Removes the `+ Add new category…` option
- Removes the `onAddCategory` prop and all inline-add state (`adding`, `newName`, `addError`)

### `CategoryRulesPanel` (`src/app/transactions/CategoryRulesPanel.tsx`)

- Removes the "Categories" management section (the rename/delete list below the rules)
- Removes the `onAddCategory` prop from its `Props` interface
- No longer passes `onAddCategory` to `CategorySelect`

### `TransactionsPage` (`src/app/transactions/page.tsx`)

- Removes `handleAddCategory` function
- Removes `onAddCategory` prop from `<CategoryRulesPanel>`

## Data Flow

```
Categories page
  → getCategories() / addCategory() / renameCategory() / deleteCategory()

Transactions page
  → getCategories() → passed to CategoryRulesPanel → passed to CategorySelect (read-only)
```

## What Does Not Change

- DB schema and all existing DB functions remain unchanged
- `CategoryRulesPanel` still manages rules (add, remove, save)
- The `categories` prop flow from `TransactionsPage` → `CategoryRulesPanel` → `CategorySelect` remains; only the write path is removed

## Error Handling

- Delete with referenced rules: surfaces existing `result.error` string inline on the Categories page (same logic as current panel)
- Add duplicate name: SQLite UNIQUE constraint will throw; surface as "Category already exists" inline error
- Rename to duplicate: same as above

## Testing

- Categories page: add, rename, delete happy paths; delete-with-rules error case
- `CategorySelect`: renders dropdown from prop list; no add-new option present
- `CategoryRulesPanel`: no `onAddCategory` prop; categories management section absent
