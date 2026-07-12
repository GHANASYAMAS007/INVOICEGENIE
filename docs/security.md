# security.md

## Security Philosophy

This is a personal productivity application running for a single user rather than a multi-tenant SaaS platform. Security measures should protect local data without introducing unnecessary complexity.

## Authentication Approach

### V1 Approach

No user authentication is required in v1 because:

* The application is intended for personal use.
* Data is stored locally on the user's device.
* There are no shared accounts or remote access requirements.

If cloud synchronization is introduced later, authentication can be added at that stage.

---

## Data Requiring Protection

The following information may be sensitive:

* Invoice images
* Vendor names
* Invoice numbers
* Exported Excel files

Although these fields are not highly confidential in most cases, they may contain business-related information and should be protected from accidental exposure.

---

## Local Storage Protection

### Invoice Images

* Store images only in application-managed directories.
* Avoid exposing image paths publicly.
* Remove image files when the associated invoice is deleted if the user chooses.

### Database Storage

* Store only the extracted invoice metadata required by the application.
* Avoid storing unnecessary OCR output or temporary processing artifacts.

### Exported Excel Files

* Allow users to choose the export location.
* Warn users that exported files are not encrypted.

---

## File Upload Validation

Before OCR processing:

* Verify that uploaded files are valid image files.
* Reject unsupported formats.
* Enforce reasonable file size limits.
* Prevent processing of corrupted files.

Supported formats:

* JPG
* JPEG
* PNG

---

## OCR Processing Security

* Process images locally whenever possible.
* Do not transmit invoice images to external services unless explicitly configured by the user.
* Remove temporary OCR files immediately after processing completes.

---

## Logging Policy

Application logs should never contain:

* Invoice images
* Vendor names
* Invoice numbers
* Full OCR output

Logs should contain only:

* Processing status
* Error messages
* Timing information

Example:

```text
OCR completed successfully in 2.3 seconds
```

Avoid:

```text
Vendor: ABC Supplies Ltd
Invoice Number: INV-10234
```

---

## Error Handling

Error messages shown to users should be informative without exposing internal implementation details.

Good:

```text
Unable to process image. Please try a clearer image.
```

Avoid:

```text
OCR engine failed while parsing token sequence.
```

---

## Backup Considerations

Since data is stored locally:

* Users are responsible for backing up exported Excel files.
* Future versions may support automatic backups or cloud synchronization.

---

## Deferred for V1

The following security features are intentionally deferred:

* User authentication
* Role-based permissions
* Encrypted cloud storage
* Multi-user isolation
* Audit logs
* End-to-end encryption
* Secure sharing links
* API rate limiting
* Session management
* Single Sign-On (SSO)

These features become relevant only if the application evolves into a multi-user or cloud-hosted product.

---

## Future Security Trigger Points

The security architecture should be revisited if any of the following are introduced:

* Multiple users
* Cloud synchronization
* Shared workspaces
* Remote APIs
* Third-party integrations
* Financial system integrations

At that point, authentication, authorization, encryption, and auditing become mandatory rather than optional.
