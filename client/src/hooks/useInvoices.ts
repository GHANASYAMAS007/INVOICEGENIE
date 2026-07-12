import { useCallback, useEffect, useState } from "react";

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
  items: InvoiceItem[];
  createdAt: number;
}

const STORAGE_KEY = "invoice-ocr-records";

export function useInvoices() {
  const [records, setRecords] = useState<InvoiceRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as InvoiceRecord[];
        setRecords(
          parsed.map((r) => ({ ...r, items: Array.isArray(r.items) ? r.items : [] })),
        );
      }
    } catch {
      // ignore corrupt storage
    }
    setLoaded(true);
  }, []);

  const persist = useCallback((next: InvoiceRecord[]) => {
    setRecords(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addRecord = useCallback(
    (rec: Omit<InvoiceRecord, "id" | "createdAt">) => {
      const record: InvoiceRecord = {
        ...rec,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      setRecords((prev) => {
        const next = [record, ...prev];
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const deleteRecord = useCallback(
    (id: string) => {
      setRecords((prev) => {
        const next = prev.filter((r) => r.id !== id);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const clearAll = useCallback(() => persist([]), [persist]);

  return { records, loaded, addRecord, deleteRecord, clearAll };
}
