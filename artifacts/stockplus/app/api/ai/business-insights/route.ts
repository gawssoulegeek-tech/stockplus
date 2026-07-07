import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/api-auth'

const GEMINI_MODEL = 'gemini-2.5-flash'

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY environment variable is required')
  return key
}

async function generateJson(parts: unknown[], responseSchema: unknown) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${getApiKey()}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseMimeType: 'application/json', responseSchema },
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini API error (${res.status}): ${errText}`)
  }
  const json = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini API returned no content')
  return JSON.parse(text)
}

export async function POST(req: NextRequest) {
  try {
    // 🔐 Authentification obligatoire
    const auth = await requireUser(req)
    if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

    const body = await req.json().catch(() => ({}))
    const { products, salesRecords, lowStockThreshold, analysisPeriod } = body ?? {}
    if (!Array.isArray(products) || !Array.isArray(salesRecords) || typeof lowStockThreshold !== 'number') {
      return Response.json({ error: 'products, salesRecords et lowStockThreshold sont requis' }, { status: 400 })
    }

    const prompt = `You are Awa, an expert business analyst for StockPlus. Analyze the provided product and sales data for a retail store and generate actionable business insights.

Products:
${JSON.stringify(products)}

Sales Records:
${JSON.stringify(salesRecords)}

Low Stock Threshold: ${lowStockThreshold}
${analysisPeriod ? `Analysis Period: ${analysisPeriod}` : ''}

Provide insights in JSON:
1. salesSummary: Analyze sales trends, popular categories, and overall performance.
2. lowStockAlerts: Products where currentStock <= lowStockThreshold.
3. bestSellingProducts: Top 3-5 products by total quantity sold.
4. inventoryOptimizationSuggestions: Actionable recommendations.
5. overallInsights: High-level summary.`

    const output = await generateJson([{ text: prompt }], {
      type: 'object',
      properties: {
        salesSummary: { type: 'string' },
        lowStockAlerts: { type: 'array', items: { type: 'object', properties: { productId: { type: 'string' }, productName: { type: 'string' }, currentStock: { type: 'number' }, threshold: { type: 'number' } }, required: ['productId', 'productName', 'currentStock', 'threshold'] } },
        bestSellingProducts: { type: 'array', items: { type: 'object', properties: { productId: { type: 'string' }, productName: { type: 'string' }, totalQuantitySold: { type: 'number' } }, required: ['productId', 'productName', 'totalQuantitySold'] } },
        inventoryOptimizationSuggestions: { type: 'string' },
        overallInsights: { type: 'string' },
      },
      required: ['salesSummary', 'lowStockAlerts', 'bestSellingProducts', 'inventoryOptimizationSuggestions', 'overallInsights'],
    })

    return Response.json(output)
  } catch (error: unknown) {
    console.error('[AI] business-insights failed', error)
    return Response.json({ error: error instanceof Error ? error.message : 'Erreur interne' }, { status: 500 })
  }
}
