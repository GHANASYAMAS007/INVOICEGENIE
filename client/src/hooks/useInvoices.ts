import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getInvoices,
  saveInvoice,
  deleteInvoice,
  clearAllInvoices,
} from "../lib/invoice.functions";

export interface InvoiceItem {
  itemName: string;
  quantity: string;
  price: string;
}

export interface InvoiceRecord {
  id: string;
  date: string;
  vendorName: string;
  invoiceNumber: string;
  items?: InvoiceItem[];
  sourceImagePath?: string;
  extractionStatus?: string;
  createdAt: number;
}

export function useInvoices() {
  const [records, setRecords] = useState<InvoiceRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "createdAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const getInvoicesFn = useServerFn(getInvoices);
  const saveInvoiceFn = useServerFn(saveInvoice);
  const deleteInvoiceFn = useServerFn(deleteInvoice);
  const clearAllInvoicesFn = useServerFn(clearAllInvoices);

  const fetchRecords = useCallback(async () => {
    try {
      const data = await getInvoicesFn({ data: { search, sortBy, sortOrder } });
      setRecords(
        data.map((r: any) => ({
          id: r.id,
          date: r.date,
          vendorName: r.vendorName,
          invoiceNumber: r.invoiceNumber,
          items: [], // V1 DB does not store line items
          sourceImagePath: r.sourceImagePath,
          extractionStatus: r.extractionStatus,
          createdAt: r.createdAt,
        }))
      );
    } catch (e) {
      console.error("Failed to load invoices from server database:", e);
    } finally {
      setLoaded(true);
    }
  }, [search, sortBy, sortOrder, getInvoicesFn]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const addRecord = useCallback(
    async (rec: {
      date: string;
      vendorName: string;
      invoiceNumber: string;
      imageDataUrl: string;
      extractionStatus: "processed" | "edited" | "manual_entry";
    }) => {
      setLoaded(false);
      try {
        await saveInvoiceFn({ data: rec });
        await fetchRecords();
      } catch (e) {
        console.error("Failed to save invoice record:", e);
        setLoaded(true);
        throw e;
      }
    },
    [saveInvoiceFn, fetchRecords]
  );

  const deleteRecord = useCallback(
    async (id: string) => {
      setLoaded(false);
      try {
        await deleteInvoiceFn({ data: { id } });
        await fetchRecords();
      } catch (e) {
        console.error("Failed to delete invoice record:", e);
        setLoaded(true);
        throw e;
      }
    },
    [deleteInvoiceFn, fetchRecords]
  );

  const clearAll = useCallback(async () => {
    setLoaded(false);
    try {
      await clearAllInvoicesFn();
      await fetchRecords();
    } catch (e) {
      console.error("Failed to clear all invoice records:", e);
      setLoaded(true);
      throw e;
    }
  }, [clearAllInvoicesFn, fetchRecords]);

  return {
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
    refetch: fetchRecords,
  };
}
