# db_er.md

## Entities

### Invoice

Stores a single processed invoice record.

| Field             | Type      | Notes                                           |
| ----------------- | --------- | ----------------------------------------------- |
| id                | Integer   | Primary key                                     |
| invoice_date      | Date      | Extracted or manually corrected invoice date    |
| vendor_name       | String    | Extracted or manually corrected vendor name     |
| invoice_number    | String    | Extracted or manually corrected invoice number  |
| source_image_path | String    | Local path or URI of the original invoice image |
| extraction_status | Enum      | `processed`, `edited`, `manual_entry`           |
| created_at        | Timestamp | Record creation time                            |
| updated_at        | Timestamp | Last modification time                          |

---

### ExportHistory (Optional)

Tracks previous Excel exports for convenience.

| Field                 | Type      | Notes                       |
| --------------------- | --------- | --------------------------- |
| id                    | Integer   | Primary key                 |
| file_name             | String    | Generated Excel file name   |
| exported_record_count | Integer   | Number of invoices included |
| export_path           | String    | Local file location         |
| exported_at           | Timestamp | Export timestamp            |

## Relationships

```
Invoice
   |
   |-- included in --> ExportHistory (logical relationship only)
```

An invoice may appear in multiple exports over time.

No additional entity relationships are required for v1.

## Indexes

### Invoice

* Primary Key:

  * `id`

* Secondary Indexes:

  * `invoice_date`
  * `vendor_name`
  * `invoice_number`

These improve searching and sorting in the invoice history view.

### ExportHistory

* Primary Key:

  * `id`

* Secondary Index:

  * `exported_at`

## Uniqueness Constraints

### Invoice

No uniqueness constraints are enforced because:

* Different vendors may use the same invoice numbering scheme.
* Duplicate invoices may legitimately exist.
* Users may intentionally scan the same invoice more than once.

### ExportHistory

No uniqueness requirements.

## Storage Strategy

### Images

Original invoice images are stored locally on the device filesystem.

Database stores only:

* file path
* URI reference
* metadata

This keeps database size small and improves performance.

### OCR Results

Only the final reviewed values are persisted.

Raw OCR text output is not stored in v1 to reduce storage usage and simplify the data model.

## Data Lifecycle

1. User captures or uploads an image.
2. OCR extracts candidate values.
3. User reviews and edits fields if necessary.
4. Approved values are saved as an `Invoice` record.
5. User may export any number of saved records into an Excel file.
6. User can delete records at any time.

## Deferred Database Features

These are intentionally excluded from v1:

* User accounts
* Cloud synchronization
* Multi-device sync
* Audit logs
* OCR confidence storage
* Invoice categorization
* Tags and labels
* Attachments beyond the original image
* Version history
