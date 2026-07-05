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
    const { photoDataUri } = body ?? {}
    if (!photoDataUri) return Response.json({ error: 'photoDataUri requis' }, { status: 400 })

    const { mimeType, data } = parseDataUri(photoDataUri)
    const prompt = `You are Awa, an expert retail product identification and pricing assistant for Senestock. Analyze the provided product photo and extract key information.

Based on the product image, identify:
1. The exact name of the product.
2. A suitable retail category for this product.
3. A reasonable selling price for this product in a typical African retail market, as a numeric value only (e.g. XOF, no currency symbol).`

    const output = await generateJson(
      [{ text: prompt }, { inlineData: { mimeType, data } }],
      {
        type: 'object',
        properties: {
          productName: { type: 'string' },
          suggestedCategory: { type: 'string' },
          recommendedSellingPrice: { type: 'number' },
        },
        required: ['productName', 'suggestedCategory', 'recommendedSellingPrice'],
      }
    )

    return Response.json(output)
  } catch (error: unknown) {
    console.error('[AI] product-photo-scan failed', error)
    return Response.json({ error: error instanceof Error ? error.message : 'Erreur interne' }, { status: 500 })
  }
}
