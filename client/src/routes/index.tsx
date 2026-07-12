import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Fragment, useRef, useState, useEffect, useCallback } from "react";
import { extractInvoiceFields } from "@/lib/extract.functions";
import { fileToCompressedDataUrl } from "@/lib/image";
import { useInvoices } from "@/hooks/useInvoices";
import { exportInvoicesToExcel } from "@/lib/exportExcel";
import { CameraCapture } from "@/components/CameraCapture";
import { getInvoiceImage, getExportHistory } from "@/lib/invoice.functions";

export const Route = createFileRoute("/")({
  component: Index,
});

interface Draft {
  imageDataUrl: string;
  date: string;
  vendorName: string;
  invoiceNumber: string;
}

function Index() {
  const extract = useServerFn(extractInvoiceFields);
  const getInvoiceImageFn = useServerFn(getInvoiceImage);
  const getExportHistoryFn = useServerFn(getExportHistory);

  const {
    records,
    loaded,
    search,
    setSearch,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    addRecord,
    deleteRecord,
    clearAll,
  } = useInvoices();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [exporting, setExporting] = useState(false);

  // Manual entry tracker
  const [manualEntryMode, setManualEntryMode] = useState(false);
  const [originalExtracted, setOriginalExtracted] = useState<{
    date: string;
    vendorName: string;
    invoiceNumber: string;
  } | null>(null);

  // Export history state
  const [exportsList, setExportsList] = useState<any[]>([]);
  const [loadingExports, setLoadingExports] = useState(false);

  // Image preview state
  const [previewingInvoiceId, setPreviewingInvoiceId] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Load export logs from server SQLite
  const fetchExports = useCallback(async () => {
    setLoadingExports(true);
    try {
      const data = await getExportHistoryFn();
      setExportsList(data);
    } catch (e) {
      console.error("Failed to load export history:", e);
    } finally {
      setLoadingExports(false);
    }
  }, [getExportHistoryFn]);

  useEffect(() => {
    fetchExports();
  }, [fetchExports]);

  // Handle OCR extraction
  const processImage = async (imageDataUrl: string) => {
    setError(null);
    setProcessing(true);
    setDraft(null);
    setOriginalExtracted(null);
    setManualEntryMode(false);
    try {
      const fields = await extract({ data: { imageDataUrl } });
      const dateVal = fields?.invoiceDate ?? "";
      const vendorVal = fields?.vendorName ?? "";
      const numVal = fields?.invoiceNumber ?? "";

      setDraft({
        imageDataUrl,
        date: dateVal,
        vendorName: vendorVal,
        invoiceNumber: numVal,
      });

      setOriginalExtracted({
        date: dateVal,
        vendorName: vendorVal,
        invoiceNumber: numVal,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("429")) {
        setError("Too many requests right now — please wait a moment and try again.");
      } else if (msg.includes("402")) {
        setError("AI usage limit reached. Please add credits to continue.");
      } else {
        setError("Could not read this image. Try a clearer photo, enter manually, or upload a different file.");
      }
    } finally {
      setProcessing(false);
    }
  };

  const onFileSelected = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose a valid image file (JPG, PNG, WEBP).");
      return;
    }
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      await processImage(dataUrl);
    } catch {
      setError("Could not read this file. Try converting it to JPG or PNG.");
    }
  };

  const startManualEntry = () => {
    setError(null);
    setDraft({
      imageDataUrl: "",
      date: "",
      vendorName: "",
      invoiceNumber: "",
    });
    setOriginalExtracted(null);
    setManualEntryMode(true);
  };

  const saveDraft = async () => {
    if (!draft) return;
    
    let status: "processed" | "edited" | "manual_entry" = "processed";
    if (manualEntryMode) {
      status = "manual_entry";
    } else if (originalExtracted) {
      const isEdited =
        draft.date.trim() !== originalExtracted.date.trim() ||
        draft.vendorName.trim() !== originalExtracted.vendorName.trim() ||
        draft.invoiceNumber.trim() !== originalExtracted.invoiceNumber.trim();
      if (isEdited) {
        status = "edited";
      }
    }

    try {
      await addRecord({
        date: draft.date.trim(),
        vendorName: draft.vendorName.trim(),
        invoiceNumber: draft.invoiceNumber.trim(),
        imageDataUrl: draft.imageDataUrl,
        extractionStatus: status,
      });
      setDraft(null);
      setOriginalExtracted(null);
      setManualEntryMode(false);
    } catch (e) {
      setError("Failed to save the invoice to the server database. Please try again.");
    }
  };

  const onExport = async () => {
    setExporting(true);
    try {
      await exportInvoicesToExcel(records);
      await fetchExports(); // Reload exports list from server SQLite
    } catch (e) {
      setError("Export failed. Check the server logs for more details.");
    } finally {
      setExporting(false);
    }
  };

  const openImagePreview = async (invoiceId: string) => {
    setPreviewingInvoiceId(invoiceId);
    setPreviewImageUrl(null);
    setLoadingPreview(true);
    try {
      const res = await getInvoiceImageFn({ data: { id: invoiceId } });
      setPreviewImageUrl(res.dataUrl);
    } catch (e) {
      console.error("Failed to load invoice image:", e);
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-5">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Invoice Snap
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Scan → extract → export to Excel
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-secondary px-3 py-1 font-mono text-xs text-secondary-foreground shadow-sm">
              {loaded ? `${records.length} saved` : "…"}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        {/* Capture zone */}
        <section aria-label="Capture invoice">
          <div className="rounded-xl border-2 border-dashed border-border bg-card p-8 text-center shadow-sm">
            {processing ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm font-medium text-foreground">Reading your invoice with AI…</p>
                <p className="text-xs text-muted-foreground">
                  Extracting key metadata values (Date, Vendor, Invoice Number)
                </p>
              </div>
            ) : (
              <>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Add an invoice or receipt
                </h2>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Capture a photo, upload an image, or enter fields manually. Details are saved securely to your local SQLite database.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => setCameraOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:brightness-110 active:scale-95"
                  >
                    📷 Use camera
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg border border-input bg-card px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted active:scale-95"
                  >
                    ⬆️ Upload image
                  </button>
                  <button
                    onClick={startManualEntry}
                    className="inline-flex items-center gap-2 rounded-lg border border-input bg-card px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted active:scale-95"
                  >
                    ⌨️ Enter manually
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      onFileSelected(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </div>
              </>
            )}
          </div>
          {error && (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-xs underline hover:text-destructive/80 ml-2">Dismiss</button>
            </div>
          )}
        </section>

        {/* Review & correct */}
        {draft && (
          <section
            aria-label="Review extracted fields"
            className="rounded-xl border border-border bg-card p-6 shadow-md transition-all animate-in fade-in-50 slide-in-from-bottom-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Review &amp; correct
              </h2>
              <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                {manualEntryMode ? "Manual Entry Mode" : "Check AI extraction before saving"}
              </span>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="relative overflow-hidden rounded-lg border border-border bg-muted/20">
                {draft.imageDataUrl ? (
                  <img
                    src={draft.imageDataUrl}
                    alt="Captured invoice"
                    className="max-h-80 w-full object-contain p-2"
                  />
                ) : (
                  <div className="flex h-full min-h-60 flex-col items-center justify-center p-6 text-center">
                    <span className="text-4xl text-muted-foreground mb-2">⌨️</span>
                    <p className="text-sm font-semibold text-foreground">No Invoice Image</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Creating manual record directly in database</p>
                  </div>
                )}
              </div>
              <div className="space-y-4 flex flex-col justify-center">
                <Field
                  label="Invoice date"
                  value={draft.date}
                  placeholder="YYYY-MM-DD"
                  mono
                  onChange={(v) => setDraft({ ...draft, date: v })}
                />
                <Field
                  label="Vendor name"
                  value={draft.vendorName}
                  placeholder="e.g. Acme Supplies Ltd"
                  onChange={(v) => setDraft({ ...draft, vendorName: v })}
                />
                <Field
                  label="Invoice number"
                  value={draft.invoiceNumber}
                  placeholder="e.g. INV-2024-0042"
                  mono
                  onChange={(v) => setDraft({ ...draft, invoiceNumber: v })}
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={saveDraft}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-110"
              >
                Save to Database
              </button>
              <button
                onClick={() => {
                  setDraft(null);
                  setOriginalExtracted(null);
                  setManualEntryMode(false);
                }}
                className="rounded-lg border border-input px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                Discard
              </button>
            </div>
          </section>
        )}

        {/* Saved records list */}
        <section aria-label="Saved invoices">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Saved invoices
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {records.length > 0 && (
                <button
                  onClick={clearAll}
                  className="rounded-lg border border-input bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted active:scale-95"
                >
                  Clear Database
                </button>
              )}
              <button
                onClick={onExport}
                disabled={records.length === 0 || exporting}
                className="rounded-lg bg-foreground px-4 py-1.5 text-xs font-semibold text-background transition-all hover:brightness-125 disabled:opacity-40 active:scale-95"
              >
                {exporting ? "Exporting…" : "⬇ Export to Excel"}
              </button>
            </div>
          </div>

          {/* Search and Sort controls */}
          <div className="mb-4 grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-3">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground text-xs pointer-events-none">🔍</span>
              <input
                type="text"
                placeholder="Search vendor or invoice #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-xs text-foreground outline-none transition-shadow focus:ring-1 focus:ring-ring"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-[10px] uppercase font-semibold text-muted-foreground whitespace-nowrap">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="createdAt">Date Added</option>
                <option value="date">Invoice Date</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[10px] uppercase font-semibold text-muted-foreground whitespace-nowrap">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Records Table */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground text-xs">Date</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-xs">Vendor Name</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-xs">Invoice Number</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-xs">Source</th>
                  <th className="w-24 px-4 py-3 text-right text-muted-foreground text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      {loaded
                        ? "No invoices match the current search filters."
                        : "Loading records from database…"}
                    </td>
                  </tr>
                ) : (
                  records.map((r) => {
                    const hasImage = !!r.sourceImagePath;
                    return (
                      <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-foreground">
                          {r.date || <Missing />}
                        </td>
                        <td className="px-4 py-3 text-foreground font-medium">
                          <div className="flex items-center gap-2">
                            {r.vendorName || <Missing />}
                            {hasImage && (
                              <button
                                onClick={() => openImagePreview(r.id)}
                                title="Click to view invoice image preview"
                                className="cursor-pointer text-xs grayscale hover:grayscale-0 hover:scale-115 transition-all"
                              >
                                🖼️
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-foreground">
                          {r.invoiceNumber || <Missing />}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {r.extractionStatus === "processed" && (
                            <span className="rounded bg-teal-100 text-teal-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider dark:bg-teal-900/30 dark:text-teal-400">
                              AI
                            </span>
                          )}
                          {r.extractionStatus === "edited" && (
                            <span className="rounded bg-indigo-100 text-indigo-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider dark:bg-indigo-900/30 dark:text-indigo-400">
                              AI + Edited
                            </span>
                          )}
                          {r.extractionStatus === "manual_entry" && (
                            <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider dark:bg-amber-900/30 dark:text-amber-400">
                              Manual
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end items-center gap-2">
                            {hasImage && (
                              <button
                                onClick={() => openImagePreview(r.id)}
                                className="rounded border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
                              >
                                View
                              </button>
                            )}
                            <button
                              onClick={() => deleteRecord(r.id)}
                              aria-label="Delete record"
                              className="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Records are persisted server-side in a local SQLite database file.
          </p>
        </section>

        {/* Export History section */}
        <section aria-label="Export history" className="border-t border-border pt-8">
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">
            Export History
          </h2>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-left">
                  <th className="px-4 py-2.5 font-medium text-muted-foreground text-xs">Date Exported</th>
                  <th className="px-4 py-2.5 font-medium text-muted-foreground text-xs">Excel File Name</th>
                  <th className="px-4 py-2.5 font-medium text-muted-foreground text-xs">Records Count</th>
                  <th className="px-4 py-2.5 font-medium text-muted-foreground text-xs">Server Storage Location</th>
                </tr>
              </thead>
              <tbody>
                {loadingExports ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-5 text-center text-xs text-muted-foreground">
                      Loading export logs…
                    </td>
                  </tr>
                ) : exportsList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-xs text-muted-foreground">
                      No export records logged yet. Use the Export button above to export saved invoices.
                    </td>
                  </tr>
                ) : (
                  exportsList.map((e) => (
                    <tr key={e.id} className="border-b border-border last:border-0 text-xs">
                      <td className="px-4 py-2.5 text-foreground font-mono">
                        {new Date(e.exportedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-foreground font-medium">
                        {e.fileName}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-foreground font-semibold">
                        {e.exportedRecordCount}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground font-mono truncate max-w-xs" title={e.exportPath}>
                        {e.exportPath}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Camera Capture Modal */}
      {cameraOpen && (
        <CameraCapture
          onClose={() => setCameraOpen(false)}
          onCapture={(dataUrl) => {
            setCameraOpen(false);
            processImage(dataUrl);
          }}
        />
      )}

      {/* Image Preview Modal */}
      {previewingInvoiceId && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-4 animate-in fade-in-30">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Invoice File Viewer
              </h2>
              <button
                onClick={() => setPreviewingInvoiceId(null)}
                className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-zinc-950 flex items-center justify-center p-4 min-h-[300px]">
              {loadingPreview ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-xs text-muted-foreground">Loading image from server disk...</p>
                </div>
              ) : previewImageUrl ? (
                <img
                  src={previewImageUrl}
                  alt="Saved invoice detail"
                  className="max-h-[60vh] max-w-full object-contain"
                />
              ) : (
                <p className="text-sm text-muted-foreground">No image file found for this record</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  mono,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  mono?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-ring ${mono ? "font-mono" : ""}`}
      />
    </label>
  );
}

function Missing() {
  return <span className="italic text-muted-foreground/60">—</span>;
}
