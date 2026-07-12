# Phase 1 Implementation Plan

This document outlines the implementation plan for Phase 1 of Invoice Genie (Invoice Snap), aligning the existing client codebase with the official product, design, database, and security specifications.

## Objectives & Scope

### 1. Server-Side Persistence (SQLite)
* [x] Replace browser `localStorage` with a local SQLite database on the server using `bun:sqlite` (built into the Bun runtime).
* [x] Initialize tables for `Invoice` and `ExportHistory` with the fields defined in `db_er.md`.
* [x] Create server functions to perform CRUD operations on `Invoice` and logs in `ExportHistory`.

### 2. Local Disk Image Storage
* [x] Save uploaded and camera-captured images to a local directory (e.g., `data/images/`) on the server.
* [x] Store the local path/URI of the saved image in the SQLite `Invoice` record (`source_image_path`).
* [x] Delete the corresponding image file from the disk when an invoice record is deleted.

### 3. Server Functions (APIs)
* [x] **`saveInvoice`**: Receives metadata & base64 image data, saves the image to disk, inserts a record into SQLite, and returns the saved invoice.
* [x] **`getInvoices`**: Retrieves invoices from SQLite with support for searching (vendor name, invoice number) and sorting (by date or creation timestamp).
* [x] **`deleteInvoice`**: Deletes the record from SQLite and the associated image file from disk.
* [x] **`saveExportHistory`** (named `saveExport` in code): Logs exported Excel sheets into SQLite.
* [x] **`getExportHistory`**: Retrieves history of previous exports.

### 4. Excel Export Alignment
* [x] Align the exported Excel structure with the V1 PRD columns: `| Date | Vendor Name | Invoice Number |`.
* [x] Exclude line items from the Excel export as they are out of scope for V1.

### 5. UI/UX Refinement
* [x] **Search & Sort**: Add search input and sort selection in the History view (Home Screen).
* [x] **Image Viewer**: Allow users to click on a saved invoice in the history list to view its saved image in a modal.
* [x] **Export Screen/Stats**: Show a list of past exports (Export History) with download dates and record counts.

### 6. Security & Logging Compliance
* [x] Validate that uploaded files are supported formats (`JPG`, `JPEG`, `PNG`, `WEBP`) and within the size limit (< 8MB).
* [x] Ensure server logs only output processing status, error messages, and timing information (never vendor names, dates, invoice numbers, or image content).
