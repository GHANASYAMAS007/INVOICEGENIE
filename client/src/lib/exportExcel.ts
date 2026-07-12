import type { InvoiceRecord } from "@/hooks/useInvoices";

export async function exportInvoicesToExcel(records: InvoiceRecord[]) {
  const XLSX = await import("xlsx");

  const rows: Record<string, string>[] = [];
  for (const r of records) {
    rows.push({
      Date: r.date,
      "Vendor Name": r.vendorName,
      "Invoice Number": r.invoiceNumber,
      "Item Name": "",
      Quantity: "",
      Price: "",
    });
    for (const it of r.items ?? []) {
      rows.push({
        Date: "",
        "Vendor Name": "",
        "Invoice Number": "",
        "Item Name": it.itemName,
        Quantity: it.quantity,
        Price: it.price,
      });
    }
  }

  const header = ["Date", "Vendor Name", "Invoice Number", "Item Name", "Quantity", "Price"];
  const sheet = XLSX.utils.json_to_sheet(rows, { header });
  sheet["!cols"] = [
    { wch: 14 },
    { wch: 32 },
    { wch: 20 },
    { wch: 32 },
    { wch: 10 },
    { wch: 12 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Invoices");
  XLSX.writeFile(workbook, `invoices-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
