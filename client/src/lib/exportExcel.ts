import type { InvoiceRecord } from "@/hooks/useInvoices";
import { saveExport } from "./invoice.functions";

export async function exportInvoicesToExcel(records: InvoiceRecord[]) {
  const XLSX = await import("xlsx");

  // Predefined table structure for V1: | Date | Vendor Name | Invoice Number |
  const rows = records.map((r) => ({
    Date: r.date,
    "Vendor Name": r.vendorName,
    "Invoice Number": r.invoiceNumber,
  }));

  const header = ["Date", "Vendor Name", "Invoice Number"];
  const sheet = XLSX.utils.json_to_sheet(rows, { header });
  sheet["!cols"] = [
    { wch: 14 }, // Date
    { wch: 32 }, // Vendor Name
    { wch: 20 }, // Invoice Number
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Invoices");
  
  const fileName = `invoices-${new Date().toISOString().slice(0, 10)}.xlsx`;
  
  // Write the file to base64 for server-side logging and storage
  const fileBase64 = XLSX.write(workbook, { bookType: "xlsx", type: "base64" });
  
  try {
    // Save record of this export on the server
    await saveExport({
      data: {
        fileName,
        recordCount: records.length,
        fileBase64,
      },
    });
  } catch (err) {
    console.error("Failed to log export history to server SQLite database:", err);
  }

  // Trigger download in the browser
  XLSX.writeFile(workbook, fileName);
}
