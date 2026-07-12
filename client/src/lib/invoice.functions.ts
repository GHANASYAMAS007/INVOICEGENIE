import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { db, IMAGES_DIR, DATA_DIR } from "./db.server";

// Ensure exports directory exists
const EXPORTS_DIR = path.join(DATA_DIR, "exports");
if (!fs.existsSync(EXPORTS_DIR)) {
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

// Helper to save base64 image to local disk
function saveBase64Image(dataUrl: string): string {
  const matches = dataUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid image format. Supported formats: JPG, JPEG, PNG, WEBP");
  }
  
  const rawExt = matches[1].toLowerCase();
  const ext = rawExt === "jpeg" ? "jpg" : rawExt;
  
  // Validate file type
  if (!["jpg", "png", "webp", "gif"].includes(ext)) {
    throw new Error("Unsupported image format: " + ext);
  }

  const buffer = Buffer.from(matches[2], "base64");
  
  // Validate file size (8MB max)
  if (buffer.length > 8_000_000) {
    throw new Error("Image file size exceeds the 8MB limit");
  }

  const filename = `invoice-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const filePath = path.join(IMAGES_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

// Server Function: Save a new invoice record
export const saveInvoice = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      date: z.string(),
      vendorName: z.string(),
      invoiceNumber: z.string(),
      imageDataUrl: z.string().optional().or(z.literal("")),
      extractionStatus: z.enum(["processed", "edited", "manual_entry"]),
    }).parse(input)
  )
  .handler(async ({ data }) => {
    const startTime = Date.now();
    try {
      const filePath = data.imageDataUrl ? saveBase64Image(data.imageDataUrl) : "";
      const now = Date.now();
      
      const insertQuery = db.prepare(`
        INSERT INTO invoices (invoice_date, vendor_name, invoice_number, source_image_path, extraction_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = insertQuery.run(
        data.date.trim(),
        data.vendorName.trim(),
        data.invoiceNumber.trim(),
        filePath,
        data.extractionStatus,
        now,
        now
      );
      
      const lastId = result.lastInsertRowid;
      const row = db.query("SELECT * FROM invoices WHERE id = ?").get(lastId) as any;
      
      if (!row) {
        throw new Error("Failed to retrieve the saved invoice record");
      }

      console.log(`[saveInvoice] Completed in ${Date.now() - startTime}ms`);
      
      return {
        id: String(row.id),
        date: row.invoice_date,
        vendorName: row.vendor_name,
        invoiceNumber: row.invoice_number,
        sourceImagePath: row.source_image_path,
        extractionStatus: row.extraction_status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[saveInvoice] Error: ${msg}`);
      throw err;
    }
  });

// Server Function: Get all invoices with search and sort options
export const getInvoices = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({
      search: z.string().optional(),
      sortBy: z.enum(["date", "createdAt"]).optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
    }).parse(input)
  )
  .handler(async ({ data }) => {
    const startTime = Date.now();
    try {
      let queryStr = "SELECT * FROM invoices";
      const params: any[] = [];
      
      if (data.search && data.search.trim().length > 0) {
        queryStr += " WHERE vendor_name LIKE ? OR invoice_number LIKE ?";
        const wild = `%${data.search.trim()}%`;
        params.push(wild, wild);
      }
      
      const sortField = data.sortBy === "date" ? "invoice_date" : "created_at";
      const order = data.sortOrder === "asc" ? "ASC" : "DESC";
      queryStr += ` ORDER BY ${sortField} ${order}`;
      
      const rows = db.query(queryStr).all(...params) as any[];
      
      console.log(`[getInvoices] Completed in ${Date.now() - startTime}ms`);
      
      return rows.map((r) => ({
        id: String(r.id),
        date: r.invoice_date,
        vendorName: r.vendor_name,
        invoiceNumber: r.invoice_number,
        sourceImagePath: r.source_image_path,
        extractionStatus: r.extraction_status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[getInvoices] Error: ${msg}`);
      throw err;
    }
  });

// Server Function: Delete an invoice and its associated image
export const deleteInvoice = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const startTime = Date.now();
    try {
      const dbId = parseInt(data.id, 10);
      if (isNaN(dbId)) {
        throw new Error("Invalid invoice ID format");
      }

      const row = db.query("SELECT source_image_path FROM invoices WHERE id = ?").get(dbId) as { source_image_path: string } | null;
      if (row && row.source_image_path) {
        try {
          if (fs.existsSync(row.source_image_path)) {
            fs.unlinkSync(row.source_image_path);
          }
        } catch (e) {
          console.error(`[deleteInvoice] Failed to delete image file: ${row.source_image_path}`);
        }
      }
      
      db.query("DELETE FROM invoices WHERE id = ?").run(dbId);
      
      console.log(`[deleteInvoice] Completed in ${Date.now() - startTime}ms`);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[deleteInvoice] Error: ${msg}`);
      throw err;
    }
  });

// Server Function: Fetch a saved invoice image as a base64 data URL
export const getInvoiceImage = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const startTime = Date.now();
    try {
      const dbId = parseInt(data.id, 10);
      if (isNaN(dbId)) {
        throw new Error("Invalid invoice ID format");
      }

      const row = db.query("SELECT source_image_path FROM invoices WHERE id = ?").get(dbId) as { source_image_path: string } | null;
      if (!row) {
        throw new Error("Invoice record not found");
      }
      if (!row.source_image_path) {
        return { dataUrl: "" };
      }

      if (!fs.existsSync(row.source_image_path)) {
        throw new Error("Image file no longer exists on disk");
      }

      const buffer = fs.readFileSync(row.source_image_path);
      const ext = path.extname(row.source_image_path).replace(".", "").toLowerCase();
      const mime = ext === "jpg" ? "jpeg" : ext;
      const dataUrl = `data:image/${mime};base64,${buffer.toString("base64")}`;
      
      console.log(`[getInvoiceImage] Completed in ${Date.now() - startTime}ms`);
      return { dataUrl };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[getInvoiceImage] Error: ${msg}`);
      throw err;
    }
  });

// Server Function: Log an export operation and save a copy of the Excel sheet on the server
export const saveExport = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      fileName: z.string(),
      recordCount: z.number(),
      fileBase64: z.string(),
    }).parse(input)
  )
  .handler(async ({ data }) => {
    const startTime = Date.now();
    try {
      const buffer = Buffer.from(data.fileBase64, "base64");
      const exportPath = path.join(EXPORTS_DIR, data.fileName);
      fs.writeFileSync(exportPath, buffer);
      
      const now = Date.now();
      db.prepare(`
        INSERT INTO export_history (file_name, exported_record_count, export_path, exported_at)
        VALUES (?, ?, ?, ?)
      `).run(data.fileName, data.recordCount, exportPath, now);
      
      console.log(`[saveExport] Completed in ${Date.now() - startTime}ms`);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[saveExport] Error: ${msg}`);
      throw err;
    }
  });

// Server Function: Retrieve export history logs
export const getExportHistory = createServerFn({ method: "GET" })
  .handler(async () => {
    const startTime = Date.now();
    try {
      const rows = db.query("SELECT * FROM export_history ORDER BY exported_at DESC").all() as any[];
      
      console.log(`[getExportHistory] Completed in ${Date.now() - startTime}ms`);
      
      return rows.map((r) => ({
        id: String(r.id),
        fileName: r.file_name,
        exportedRecordCount: r.exported_record_count,
        exportPath: r.export_path,
        exportedAt: r.exported_at,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[getExportHistory] Error: ${msg}`);
      throw err;
    }
  });

// Server Function: Delete all invoices and their associated images on disk
export const clearAllInvoices = createServerFn({ method: "POST" })
  .handler(async () => {
    const startTime = Date.now();
    try {
      const rows = db.query("SELECT source_image_path FROM invoices").all() as { source_image_path: string }[];
      for (const row of rows) {
        if (row.source_image_path && fs.existsSync(row.source_image_path)) {
          try {
            fs.unlinkSync(row.source_image_path);
          } catch (e) {
            // Ignore
          }
        }
      }
      db.query("DELETE FROM invoices").run();
      console.log(`[clearAllInvoices] Completed in ${Date.now() - startTime}ms`);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[clearAllInvoices] Error: ${msg}`);
      throw err;
    }
  });

