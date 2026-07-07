import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const GEMINI_MODEL = "gemini-2.5-flash";

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY environment variable is required");
  return key;
}

function parseDataUri(dataUri: string): { mimeType: string; data: string } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUri);
  if (!match) throw new Error("Invalid data URI format");
  return { mimeType: match[1], data: match[2] };
}

async function generateJson(parts: unknown[], responseSchema: unknown, model = GEMINI_MODEL) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${getApiKey()}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini API returned no content");
  return JSON.parse(text);
}

// POST /api/ai/business-insights
router.post("/ai/business-insights", async (req, res) => {
  try {
    const { products, salesRecords, lowStockThreshold, analysisPeriod } = req.body ?? {};
    if (!Array.isArray(products) || !Array.isArray(salesRecords) || typeof lowStockThreshold !== "number") {
      return res.status(400).json({ error: "products, salesRecords et lowStockThreshold sont requis" });
    }

    const prompt = `You are Awa, an expert business analyst for Senestock AI. Your task is to analyze the provided product and sales data for a retail store and generate actionable business insights.

Products:
${JSON.stringify(products)}

Sales Records:
${JSON.stringify(salesRecords)}

Low Stock Threshold: ${lowStockThreshold}
${analysisPeriod ? `Analysis Period: ${analysisPeriod}` : ""}

Based on this data, provide the following insights in a JSON object:
1. salesSummary: Analyze sales trends, popular categories, and overall performance.
2. lowStockAlerts: Products where currentStock <= lowStockThreshold (id -> productId, name -> productName, currentStock, threshold).
3. bestSellingProducts: Top 3-5 products by total quantity sold (productId, productName, totalQuantitySold).
4. inventoryOptimizationSuggestions: Actionable recommendations for optimizing inventory.
5. overallInsights: Concise high-level summary of business performance.`;

    const output = await generateJson([{ text: prompt }], {
      type: "object",
      properties: {
        salesSummary: { type: "string" },
        lowStockAlerts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              productId: { type: "string" },
              productName: { type: "string" },
              currentStock: { type: "number" },
              threshold: { type: "number" },
            },
            required: ["productId", "productName", "currentStock", "threshold"],
          },
        },
        bestSellingProducts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              productId: { type: "string" },
              productName: { type: "string" },
              totalQuantitySold: { type: "number" },
            },
            required: ["productId", "productName", "totalQuantitySold"],
          },
        },
        inventoryOptimizationSuggestions: { type: "string" },
        overallInsights: { type: "string" },
      },
      required: [
        "salesSummary",
        "lowStockAlerts",
        "bestSellingProducts",
        "inventoryOptimizationSuggestions",
        "overallInsights",
      ],
    });

    return res.json(output);
  } catch (error: unknown) {
    logger.error({ error }, "[AI] business-insights failed");
    return res.status(500).json({ error: error instanceof Error ? error.message : "Erreur interne" });
  }
});

// POST /api/ai/invoice-extract
router.post("/ai/invoice-extract", async (req, res) => {
  try {
    const { invoiceDataUri } = req.body ?? {};
    if (!invoiceDataUri) return res.status(400).json({ error: "invoiceDataUri requis" });

    const { mimeType, data } = parseDataUri(invoiceDataUri);
    const prompt = `You are Awa, an expert assistant for Senestock designed to extract product information from supplier invoices.

Carefully analyze the provided invoice and extract the product name, quantity, and purchase price for each line item.
Only extract information for physical products. Do not include taxes, shipping fees, or service charges.
If a quantity is not explicitly stated but a total price for an item is, assume the quantity is 1.`;

    const output = await generateJson(
      [{ text: prompt }, { inlineData: { mimeType, data } }],
      {
        type: "object",
        properties: {
          products: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "number" },
                purchasePrice: { type: "number" },
              },
              required: ["name", "quantity", "purchasePrice"],
            },
          },
        },
        required: ["products"],
      },
    );

    return res.json(output);
  } catch (error: unknown) {
    logger.error({ error }, "[AI] invoice-extract failed");
    return res.status(500).json({ error: error instanceof Error ? error.message : "Erreur interne" });
  }
});

// POST /api/ai/pos-scan
router.post("/ai/pos-scan", async (req, res) => {
  try {
    const { photoDataUri } = req.body ?? {};
    if (!photoDataUri) return res.status(400).json({ error: "photoDataUri requis" });

    const { mimeType, data } = parseDataUri(photoDataUri);
    const prompt = `Tu es Awa, l'assistante de caisse intelligente de Senestock.
Analyse cette photo de vente.

1. Identifie le produit principal.
2. Compte combien d'unités de ce produit sont visibles ou suggérées par l'image.

Réponds uniquement avec le nom du produit et la quantité détectée au format JSON.`;

    const output = await generateJson(
      [{ text: prompt }, { inlineData: { mimeType, data } }],
      {
        type: "object",
        properties: {
          productName: { type: "string" },
          detectedQuantity: { type: "number" },
        },
        required: ["productName", "detectedQuantity"],
      },
    );

    return res.json(output);
  } catch (error: unknown) {
    logger.error({ error }, "[AI] pos-scan failed");
    return res.status(500).json({ error: error instanceof Error ? error.message : "Erreur interne" });
  }
});

// POST /api/ai/product-photo-scan
router.post("/ai/product-photo-scan", async (req, res) => {
  try {
    const { photoDataUri } = req.body ?? {};
    if (!photoDataUri) return res.status(400).json({ error: "photoDataUri requis" });

    const { mimeType, data } = parseDataUri(photoDataUri);
    const prompt = `You are Awa, an expert retail product identification and pricing assistant for Senestock. Your task is to analyze the provided product photo and extract key information.

Based on the product image, identify:
1. The exact name of the product.
2. A suitable retail category for this product.
3. A reasonable selling price for this product in a typical African retail market, as a numeric value only (e.g. XOF, no currency symbol).`;

    const output = await generateJson(
      [{ text: prompt }, { inlineData: { mimeType, data } }],
      {
        type: "object",
        properties: {
          productName: { type: "string" },
          suggestedCategory: { type: "string" },
          recommendedSellingPrice: { type: "number" },
        },
        required: ["productName", "suggestedCategory", "recommendedSellingPrice"],
      },
    );

    return res.json(output);
  } catch (error: unknown) {
    logger.error({ error }, "[AI] product-photo-scan failed");
    return res.status(500).json({ error: error instanceof Error ? error.message : "Erreur interne" });
  }
});

export default router;
