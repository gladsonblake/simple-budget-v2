---
id: TASK-1
title: Implement Import Page with Configurable CSV Column Mapping
status: To Do
assignee: []
created_date: '2026-03-28 15:57'
labels:
  - feature
  - import
  - transactions
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build the import page that allows users to import transactions from CSV files exported by different credit card providers.

## Overview

Different credit card providers export CSVs with different column structures (e.g., Chase uses "Transaction Date", "Description", "Amount"; Capital One uses "Transaction Date", "Posted Date", "Card No.", "Description", "Category", "Debit", "Credit"). The import page needs to handle this variation via configurable column mapping profiles.

## Key Features

### 1. Import Provider Profiles
- Allow users to create/save named profiles per credit card provider (e.g., "Chase Sapphire", "Capital One Venture")
- Each profile stores a mapping of CSV columns → transaction fields
- Persist profiles so they can be reused across imports

### 2. CSV Column Mapping
Map CSV columns to the following transaction fields:
- `date` (required)
- `description` (required)
- `amount` (required — handle debit/credit split columns)
- `category` (optional)
- `notes` (optional)

Handle edge cases:
- Some providers use separate debit/credit columns instead of a single signed amount
- Date formats vary by provider (e.g., MM/DD/YYYY vs YYYY-MM-DD)
- Amount sign conventions vary (positive = expense vs negative = expense)

### 3. Import Flow
1. User selects or creates a provider profile
2. User uploads a CSV file
3. App previews parsed rows with the current column mapping applied
4. User can adjust the mapping if the preview looks wrong
5. User confirms and transactions are written to the database
6. Show import summary (# imported, # skipped duplicates, any errors)

### 4. Duplicate Detection
- Detect likely duplicates based on date + description + amount before committing
- Show duplicates to the user and let them decide (skip or import anyway)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Users can create, save, and select named import profiles per credit card provider
- [ ] #2 Each profile stores column-to-field mappings including date format and amount sign convention
- [ ] #3 CSV upload shows a live preview of parsed transactions using the selected profile
- [ ] #4 Supports providers with a single amount column and those with split debit/credit columns
- [ ] #5 Date parsing handles at least MM/DD/YYYY and YYYY-MM-DD formats
- [ ] #6 Duplicate transactions are detected and surfaced before import is committed
- [ ] #7 Import summary shows count of imported rows, skipped duplicates, and any errors
- [ ] #8 Profiles persist across sessions (stored in database or local config)
<!-- AC:END -->
