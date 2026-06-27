'use server';
/**
 * @fileOverview Flux Genkit pour scanner des produits en caisse (POS).
 * Identifie le produit et la quantité à partir d'une photo pour une vente rapide.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SenaPosScannerInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "Une photo des produits à vendre, en format data URI base64."
    ),
});
export type SenaPosScannerInput = z.infer<typeof SenaPosScannerInputSchema>;

const SenaPosScannerOutputSchema = z.object({
  productName: z.string().describe('Le nom du produit identifié.'),
  detectedQuantity: z.number().int().positive().describe('La quantité de ce produit détectée sur la photo.'),
});
export type SenaPosScannerOutput = z.infer<typeof SenaPosScannerOutputSchema>;

export async function senaPosScanner(input: SenaPosScannerInput): Promise<SenaPosScannerOutput> {
  return senaPosScannerFlow(input);
}

const senaPosScannerPrompt = ai.definePrompt({
  name: 'senaPosScannerPrompt',
  input: {schema: SenaPosScannerInputSchema},
  output: {schema: SenaPosScannerOutputSchema},
  prompt: `Tu es Awa, l'assistante de caisse intelligente de Senestock.
Analyse cette photo de vente. 

1. Identifie le produit principal.
2. Compte combien d'unités de ce produit sont visibles ou suggérées par l'image.

Réponds uniquement avec le nom du produit et la quantité détectée au format JSON.

Photo: {{media url=photoDataUri}}`,
});

const senaPosScannerFlow = ai.defineFlow(
  {
    name: 'senaPosScannerFlow',
    inputSchema: SenaPosScannerInputSchema,
    outputSchema: SenaPosScannerOutputSchema,
  },
  async (input) => {
    const {output} = await senaPosScannerPrompt(input);
    if (!output) throw new Error('Awa n\'a pas pu identifier les produits.');
    return output;
  }
);
