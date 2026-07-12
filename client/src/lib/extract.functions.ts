import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";

const InputSchema = z.object({
  imageDataUrl: z
    .string()
    .startsWith("data:image/")
    .max(8_000_000, "Image too large"),
});

export interface InvoiceLineItem {
  itemName: string;
  quantity: string;
  price: string;
}

export interface InvoiceFields {
  invoiceDate: string;
  vendorName: string;
  invoiceNumber: string;
  items: InvoiceLineItem[];
}

function parseFields(text: string): InvoiceFields {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in model response");
  const raw = JSON.parse(match[0]) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
  const items = Array.isArray(raw.items)
    ? (raw.items as unknown[]).map((it) => {
        const o = (it ?? {}) as Record<string, unknown>;
        return {
          itemName: str(o.itemName),
          quantity: str(o.quantity),
          price: str(o.price),
        };
      }).filter((it) => it.itemName || it.quantity || it.price)
    : [];
  return {
    invoiceDate: str(raw.invoiceDate),
    vendorName: str(raw.vendorName),
    invoiceNumber: str(raw.invoiceNumber),
    items,
  };
}

export const extractInvoiceFields = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { createLovableAiGatewayProvider } = await import(
      "./ai-gateway.server"
    );
    const gateway = createLovableAiGatewayProvider(key);

    try {
      const { text } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        instructions:
          'You are an invoice OCR assistant. Read the invoice or receipt image and extract the header fields plus every line item. Respond with ONLY a JSON object, no markdown fences, in this exact shape: {"invoiceDate": "YYYY-MM-DD", "vendorName": "...", "invoiceNumber": "...", "items": [{"itemName": "...", "quantity": "...", "price": "..."}]}. The vendor is the company issuing the invoice, not the customer. For items, include each purchased line as one entry: itemName is the product/service description, quantity is the count/units as shown (e.g. "2", "1.5 kg"), price is the line total as shown including currency symbol if present (e.g. "$12.50"). If there are no line items, return an empty array. Use empty strings for header fields you cannot find. Never invent values.',
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract the invoice date, vendor name, invoice number and all line items (item name, quantity, price) from this image.",
              },
              { type: "image", image: data.imageDataUrl },
            ],
          },
        ],
      });

      return parseFields(text);
    } catch (err) {
      console.error("[extractInvoiceFields] extraction failed:", err);
      throw err;
    }
  });
