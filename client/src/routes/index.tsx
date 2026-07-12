import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Fragment, useRef, useState } from "react";
import { extractInvoiceFields } from "@/lib/extract.functions";
import { fileToCompressedDataUrl } from "@/lib/image";
import { useInvoices } from "@/hooks/useInvoices";
import type { InvoiceItem } from "@/hooks/useInvoices";
import { exportInvoicesToExcel } from "@/lib/exportExcel";
import { CameraCapture } from "@/components/CameraCapture";

export const Route = createFileRoute("/")({
  component: Index,
});

interface Draft {
  imageDataUrl: string;
  date: string;
  vendorName: string;
  invoiceNumber: string;
  items: InvoiceItem[];
}

function Index() {
  const extract = useServerFn(extractInvoiceFields);
  const { records, loaded, addRecord, deleteRecord, clearAll } = useInvoices();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [exporting, setExporting] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const processImage = async (imageDataUrl: string) => {
    setError(null);
    setProcessing(true);
    setDraft(null);
    try {
      const fields = await extract({ data: { imageDataUrl } });
      setDraft({
        imageDataUrl,
        date: fields?.invoiceDate ?? "",
        vendorName: fields?.vendorName ?? "",
        invoiceNumber: fields?.invoiceNumber ?? "",
        items: fields?.items ?? [],
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("429")) {
        setError("Too many requests right now — please wait a moment and try again.");
      } else if (msg.includes("402")) {
        setError("AI usage limit reached. Please add credits to continue.");
      } else {
        setError("Could not read this image. Try a clearer photo or a different file.");
      }
    } finally {
      setProcessing(false);
    }
  };

  const onFileSelected = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG, WEBP…).");
      return;
    }
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      await processImage(dataUrl);
    } catch {
      setError("Could not read this file. Try converting it to JPG or PNG.");
    }
  };

  const saveDraft = () => {
    if (!draft) return;
    addRecord({
      date: draft.date.trim(),
      vendorName: draft.vendorName.trim(),
      invoiceNumber: draft.invoiceNumber.trim(),
      items: draft.items
        .map((it) => ({
          itemName: it.itemName.trim(),
          quantity: it.quantity.trim(),
          price: it.price.trim(),
        }))
        .filter((it) => it.itemName || it.quantity || it.price),
    });
    setDraft(null);
  };

  const updateItem = (idx: number, patch: Partial<InvoiceItem>) => {
    if (!draft) return;
    const items = draft.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    setDraft({ ...draft, items });
  };

  const addItem = () => {
    if (!draft) return;
    setDraft({
      ...draft,
      items: [...draft.items, { itemName: "", quantity: "", price: "" }],
    });
  };

  const removeItem = (idx: number) => {
    if (!draft) return;
    setDraft({ ...draft, items: draft.items.filter((_, i) => i !== idx) });
  };

  const onExport = async () => {
    setExporting(true);
    try {
      await exportInvoicesToExcel(records);
    } finally {
      setExporting(false);
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
          <span className="rounded-full bg-secondary px-3 py-1 font-mono text-xs text-secondary-foreground">
            {loaded ? `${records.length} saved` : "…"}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        {/* Capture zone */}
        <section aria-label="Capture invoice">
          <div className="rounded-xl border-2 border-dashed border-border bg-card p-8 text-center">
            {processing ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm font-medium text-foreground">Reading your invoice…</p>
                <p className="text-xs text-muted-foreground">
                  Extracting header details and line items
                </p>
              </div>
            ) : (
              <>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Add an invoice or receipt
                </h2>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Take a photo or upload an image. We'll pull out the key details and line items automatically.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => setCameraOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-110"
                  >
                    📷 Use camera
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg border border-input bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                  >
                    ⬆️ Upload image
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
            <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
              {error}
            </p>
          )}
        </section>

        {/* Review & correct */}
        {draft && (
          <section
            aria-label="Review extracted fields"
            className="rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Review &amp; correct
              </h2>
              <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                Check before saving
              </span>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <img
                src={draft.imageDataUrl}
                alt="Captured invoice"
                className="max-h-80 w-full rounded-lg border border-border object-contain"
              />
              <div className="space-y-4">
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

            {/* Line items sub-section */}
            <div className="mt-6 border-t border-border pt-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-foreground">
                  Line items
                </h3>
                <button
                  onClick={addItem}
                  className="rounded-md border border-input bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  + Add item
                </button>
              </div>
              {draft.items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-4 text-center text-xs text-muted-foreground">
                  No line items detected. Add one manually if needed.
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="hidden grid-cols-[1fr_100px_120px_32px] gap-2 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:grid">
                    <span>Item name</span>
                    <span>Quantity</span>
                    <span>Price</span>
                    <span />
                  </div>
                  {draft.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-background/50 p-2 sm:grid-cols-[1fr_100px_120px_32px] sm:bg-transparent sm:border-0 sm:p-0"
                    >
                      <input
                        type="text"
                        value={it.itemName}
                        placeholder="Item name"
                        onChange={(e) => updateItem(idx, { itemName: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                      />
                      <input
                        type="text"
                        value={it.quantity}
                        placeholder="Qty"
                        onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 font-mono text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                      />
                      <input
                        type="text"
                        value={it.price}
                        placeholder="Price"
                        onChange={(e) => updateItem(idx, { price: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 font-mono text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button
                        onClick={() => removeItem(idx)}
                        aria-label="Remove item"
                        className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={saveDraft}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-110"
              >
                Save record
              </button>
              <button
                onClick={() => setDraft(null)}
                className="rounded-lg border border-input px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                Discard
              </button>
            </div>
          </section>
        )}

        {/* Saved records */}
        <section aria-label="Saved invoices">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Saved invoices
            </h2>
            <div className="flex gap-2">
              {records.length > 0 && (
                <button
                  onClick={clearAll}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={onExport}
                disabled={records.length === 0 || exporting}
                className="rounded-lg bg-foreground px-4 py-1.5 text-xs font-semibold text-background transition-all hover:brightness-125 disabled:opacity-40"
              >
                {exporting ? "Exporting…" : "⬇ Export to Excel"}
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-left">
                  <th className="w-8 px-2 py-2.5" />
                  <th className="px-4 py-2.5 font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-2.5 font-medium text-muted-foreground">Vendor Name</th>
                  <th className="px-4 py-2.5 font-medium text-muted-foreground">Invoice Number</th>
                  <th className="w-12 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      {loaded
                        ? "No invoices saved yet. Scan or upload one above to get started."
                        : "Loading…"}
                    </td>
                  </tr>
                ) : (
                  records.map((r) => {
                    const isOpen = !!expanded[r.id];
                    const hasItems = (r.items?.length ?? 0) > 0;
                    return (
                      <Fragment key={r.id}>
                        <tr className="border-b border-border last:border-0">
                          <td className="px-2 py-2.5 text-center">
                            {hasItems ? (
                              <button
                                onClick={() =>
                                  setExpanded((p) => ({ ...p, [r.id]: !isOpen }))
                                }
                                aria-label={isOpen ? "Collapse items" : "Expand items"}
                                className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                              >
                                {isOpen ? "▾" : "▸"}
                              </button>
                            ) : null}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-foreground">
                            {r.date || <Missing />}
                          </td>
                          <td className="px-4 py-2.5 text-foreground">
                            {r.vendorName || <Missing />}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-foreground">
                            {r.invoiceNumber || <Missing />}
                          </td>
                          <td className="px-2 py-2.5 text-right">
                            <button
                              onClick={() => deleteRecord(r.id)}
                              aria-label="Delete record"
                              className="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                        {isOpen && hasItems && (
                          <tr
                            key={`${r.id}-items`}
                            className="border-b border-border bg-muted/30 last:border-0"
                          >
                            <td />
                            <td colSpan={4} className="px-4 py-3">
                              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Line items
                              </div>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-left text-muted-foreground">
                                    <th className="py-1 pr-3 font-medium">Item</th>
                                    <th className="py-1 pr-3 font-medium">Qty</th>
                                    <th className="py-1 font-medium">Price</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {r.items.map((it, i) => (
                                    <tr key={i} className="border-t border-border/60">
                                      <td className="py-1 pr-3 text-foreground">
                                        {it.itemName || <Missing />}
                                      </td>
                                      <td className="py-1 pr-3 font-mono text-foreground">
                                        {it.quantity || <Missing />}
                                      </td>
                                      <td className="py-1 font-mono text-foreground">
                                        {it.price || <Missing />}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Records are stored on this device only. Export regularly to keep a copy.
          </p>
        </section>
      </main>

      {cameraOpen && (
        <CameraCapture
          onClose={() => setCameraOpen(false)}
          onCapture={(dataUrl) => {
            setCameraOpen(false);
            processImage(dataUrl);
          }}
        />
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
        className={`w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring ${mono ? "font-mono" : ""}`}
      />
    </label>
  );
}

function Missing() {
  return <span className="italic text-muted-foreground/60">—</span>;
}
