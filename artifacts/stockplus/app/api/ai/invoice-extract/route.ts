import { NextRequest } from 'next/server'

const GEMINI_MODEL = 'gemini-2.5-flash'

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY environment variable is required')
  return key
}

function parseDataUri(dataUri: string): { mimeType: string; data: string } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUri)
  if (!match) throw new Error('Invalid data URI format')
  return { mimeType: match[1], data: match[2] }
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
    const body = await req.json().catch(() => ({}))
    const { invoiceDataUri } = body ?? {}
    if (!invoiceDataUri) return Response.json({ error: 'invoiceDataUri requis' }, { status: 400 })

    const { mimeType, data } = parseDataUri(invoiceDataUri)
    const prompt = `You are Awa, an expert assistant for Senestock designed to extract product information from supplier invoices.

Carefully analyze the provided invoice and extract the product name, quantity, and purchase price for each line item.
Only extract information for physical products. Do not include taxes, shipping fees, or service charges.
If a quantity is not explicitly stated but a total price for an item is, assume the quantity is 1.`

    const output = await generateJson(
      [{ text: prompt }, { inlineData: { mimeType, data } }],
      {
        type: 'object',
        properties: {
          products: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                quantity: { type: 'number' },
                purchasePrice: { type: 'number' },
              },
              required: ['name', 'quantity', 'purchasePrice'],
            },
          },
        },
        required: ['products'],
      }
    )

    return Response.json(output)
  } catch (error: unknown) {
    console.error('[AI] invoice-extract failed', error)
    return Response.json({ error: error instanceof Error ? error.message : 'Erreur interne' }, { status: 500 })
  }
}
