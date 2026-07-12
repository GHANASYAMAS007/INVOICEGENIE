# design.md

## Design Goals

The application should prioritize:

* Speed of data capture
* Minimal user interaction
* Readability of extracted information
* A clean and professional appearance suitable for daily business use

The user should be able to process an invoice in only a few taps.

## Visual Style

### Tone

* Professional
* Minimal
* Functional
* Distraction-free

### Design Principles

* Large touch targets for camera and upload actions.
* Clear status indicators during OCR processing.
* Editable fields should be immediately visible after extraction.
* Avoid complex menus and nested navigation.

## Key Screens

### 1. Home Screen

Purpose: Entry point for invoice processing.

Components:

* "Capture Invoice" button
* "Upload Invoice" button
* Recent processed invoices list
* "Export to Excel" action button
* Total invoices processed counter

---

### 2. Camera Capture Screen

Purpose: Capture invoice images.

Components:

* Camera preview
* Capture button
* Flash toggle
* Retake option
* Image preview before submission

---

### 3. File Upload Screen

Purpose: Select existing invoice images.

Components:

* File picker
* Image preview
* Confirm upload button

Supported formats:

* JPG
* JPEG
* PNG

---

### 4. Processing Screen

Purpose: Inform the user that OCR extraction is running.

Components:

* Progress indicator
* Current processing status
* Cancel option

Example states:

* Uploading image
* Running OCR
* Extracting fields
* Preparing results

---

### 5. Review and Edit Screen

Purpose: Allow user verification before saving.

Components:

* Invoice image preview
* Editable Date field
* Editable Vendor Name field
* Editable Invoice Number field
* Confidence indicator for extracted values (optional)
* Save button
* Discard button

---

### 6. Invoice History Screen

Purpose: View previously saved records.

Components:

* Search bar
* Sort by date
* Invoice list with:

  * Date
  * Vendor Name
  * Invoice Number
* Delete action

---

### 7. Export Screen

Purpose: Generate Excel output.

Components:

* Record count summary
* Export button
* Save location selector
* Success confirmation message

Export format:

| Date | Vendor Name | Invoice Number |
| ---- | ----------- | -------------- |

## Primary User Flow

Home Screen
→ Capture Invoice or Upload Invoice
→ OCR Processing
→ Review Extracted Fields
→ Edit if Necessary
→ Save Record
→ Return to Home Screen
→ Export to Excel When Required

## Secondary User Flow

Home Screen
→ Open Invoice History
→ Review Existing Records
→ Delete Incorrect Records
→ Export Updated Dataset

## Error Handling

### Image Quality Issues

Display:

* "Image is too blurry."
* "Please retake the image."

### OCR Failure

Display:

* "Unable to identify invoice information."
* Allow manual entry of fields.

### Export Failure

Display:

* Error message explaining the issue.
* Retry export option.

## Accessibility Considerations

* Large buttons for mobile devices.
* High contrast text.
* Keyboard support for manual edits.
* Support for screen readers where possible.
