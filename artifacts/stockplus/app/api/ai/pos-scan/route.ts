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
    const prompt = `Tu es Awa, l'assistante de caisse intelligente de Senestock.
Analyse cette photo de vente.

1. Identifie le produit principal.
2. Compte combien d'unités de ce produit sont visibles ou suggérées par l'image.

Réponds uniquement avec le nom du produit et la quantité détectée au format JSON.`

    const output = await generateJson(
      [{ text: prompt }, { inlineData: { mimeType, data } }],
      {
        type: 'object',
        properties: {
          productName: { type: 'string' },
          detectedQuantity: { type: 'number' },
        },
        required: ['productName', 'detectedQuantity'],
      }
    )

    return Response.json(output)
  } catch (error: unknown) {
    console.error('[AI] pos-scan failed', error)
    return Response.json({ error: error instanceof Error ? error.message : 'Erreur interne' }, { status: 500 })
  }
}
