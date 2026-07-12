// @ts-ignore
import { Database } from "bun:sqlite";
import * as fs from "fs";
import * as path from "path";

// In production/dev, process.cwd() is D:\INVOICE GENIE\client
// We want to store database and images under D:\INVOICE GENIE\data
const DATA_DIR = path.resolve(process.cwd(), "../data");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const DB_PATH = path.join(DATA_DIR, "db.sqlite");

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);

// Create tables with indexes for searching and sorting as specified in db_er.md
db.run(`
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_date TEXT,
    vendor_name TEXT,
    invoice_number TEXT,
    source_image_path TEXT,
    extraction_status TEXT CHECK(extraction_status IN ('processed', 'edited', 'manual_entry')),
    created_at INTEGER,
    updated_at INTEGER
  )
`);

// Secondary indexes
db.run(`CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON invoices(vendor_name)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number)`);

db.run(`
  CREATE TABLE IF NOT EXISTS export_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT,
    exported_record_count INTEGER,
    export_path TEXT,
    exported_at INTEGER
  )
`);

db.run(`CREATE INDEX IF NOT EXISTS idx_export_history_at ON export_history(exported_at)`);

export { IMAGES_DIR, DATA_DIR };
