# PRD.md

## Product

Personal Invoice OCR and Excel Export Tool

## Problem

Professionals frequently receive invoices and receipts in image form, requiring manual entry of important details into spreadsheets for tracking and reporting. This process is repetitive, slow, and error-prone.

## Target User

Individual professionals and freelancers who need a simple way to digitize invoice metadata for personal bookkeeping, expense tracking, or reporting.

## Core Features (ranked)

### 1. Invoice Capture

Users can capture invoice or receipt images directly using the device camera.

### 2. Image Upload

Users can upload existing invoice or receipt images from local storage.

### 3. OCR Processing

The application extracts text from uploaded or captured images using OCR technology.

### 4. Intelligent Field Extraction

The application identifies and extracts the following fields even when they are not presented in a tabular layout:

* Invoice Date
* Vendor Name
* Invoice Number

### 5. Review and Correction

Users can review extracted values and manually edit them before saving.

### 6. Excel Export

Saved invoice records can be exported into an Excel file using a predefined table structure:

| Date | Vendor Name | Invoice Number |
| ---- | ----------- | -------------- |

Multiple invoices can be accumulated and exported together.

## Out of Scope

The following are intentionally excluded from v1:

* Line item extraction
* Tax calculation
* Total amount extraction
* Currency detection
* Purchase order matching
* User accounts and authentication
* Cloud synchronization
* Multi-user collaboration
* Custom Excel templates
* PDF invoice generation

## Success Criteria

### Functional Success

* Users can successfully process both camera-captured and uploaded images.
* The application correctly extracts at least one target field from the majority of standard invoices.
* Users can correct extraction mistakes before saving.
* Users can export all saved records into a valid Excel file.

### User Experience Success

* Processing an invoice takes less than 30 seconds from image capture to save.
* The workflow requires minimal manual data entry.
* Exported Excel files can be opened directly in common spreadsheet applications without modification.
