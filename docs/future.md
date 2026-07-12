# future.md

## Features Deferred from V1

The goal of v1 is to remain fast, reliable, and easy to maintain. The following capabilities are intentionally excluded and can be added later if there is a clear need.

### Additional Invoice Fields

Beyond:

* Invoice Date
* Vendor Name
* Invoice Number

Potential future fields:

* Total Amount
* Tax Amount
* Currency
* Payment Terms
* Due Date
* Purchase Order Number
* GST/VAT Number

---

### Line Item Extraction

Extract structured line items such as:

| Description | Quantity | Unit Price | Amount |
| ----------- | -------- | ---------- | ------ |

This requires significantly more advanced document understanding than field extraction.

---

### Intelligent Vendor Recognition

* Vendor normalization
* Vendor aliases
* Auto-complete suggestions

Example:

* "Amazon"
* "Amazon India"
* "AMAZON SELLER SERVICES"

could all map to a single vendor profile.

---

### Invoice Categories

Allow users to classify invoices:

* Travel
* Office Supplies
* Software
* Utilities
* Marketing

This would improve reporting and filtering.

---

### PDF Support

Support:

* PDF invoices
* Multi-page documents
* Email attachments

This is one of the highest-value upgrades after image support stabilizes.

---

### Batch Processing

Allow users to:

* Select multiple invoice images.
* Process them in a single operation.
* Review extracted results together.

---

### Confidence Scores

Display OCR confidence values such as:

| Field          | Confidence |
| -------------- | ---------- |
| Vendor Name    | 96%        |
| Invoice Number | 91%        |

Low-confidence values can be highlighted for review.

---

### Advanced Search

Support filtering by:

* Date range
* Vendor name
* Invoice number
* Export status

---

### Duplicate Detection

Detect likely duplicates using:

* Invoice Number
* Vendor Name
* Invoice Date

Users can choose whether to keep or ignore duplicates.

---

### Cloud Backup

Optional synchronization to:

* Google Drive
* OneDrive
* Dropbox
* iCloud

This would protect against device loss.

---

### Mobile and Desktop Sync

Users could scan invoices on mobile and export reports from desktop.

---

### AI-Assisted Extraction

Move from OCR-only extraction to document understanding models capable of:

* Identifying invoice sections
* Understanding layouts
* Handling non-standard invoice formats
* Extracting contextual information

---

## Scaling Considerations for 10× Usage

If the application grows from a personal tool to a business product, the following changes become necessary:

### User Accounts

* Registration
* Login
* Password reset

### Multi-Tenant Data Isolation

Separate storage for each customer or organization.

### Cloud Storage

Store:

* Invoice images
* OCR results
* Export files

### Background Processing

Move OCR jobs into asynchronous workers or queues.

### Monitoring and Analytics

Track:

* OCR success rate
* Processing time
* Failure rates

### Security Enhancements

Introduce:

* Authentication
* Authorization
* Encryption
* Audit logs

### API Versioning

Support future mobile and web clients without breaking compatibility.

---

## Recommended Upgrade Path

### Version 1

* Image upload
* Camera capture
* OCR extraction
* Review and correction
* Excel export

### Version 2

* PDF support
* Batch processing
* Additional invoice fields

### Version 3

* AI document understanding
* Cloud synchronization
* Cross-device access

### Version 4

* Multi-user collaboration
* Accounting integrations
* Enterprise features

This progression keeps the project practical while allowing it to evolve naturally if usage increases.
