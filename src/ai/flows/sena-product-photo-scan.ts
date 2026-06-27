
'use server';
/**
 * @fileOverview This file implements the Awa Product Photo Scan AI feature.
 * It allows users to upload a product photo, and Awa will identify the product,
 * suggest a category, and recommend a selling price.
 *
 * - senaProductPhotoScan - The main function to trigger the product photo scan.
 * - SenaProductPhotoScanInput - The input type for the senaProductPhotoScan function.
 * - SenaProductPhotoScanOutput - The return type for the senaProductPhotoScan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SenaProductPhotoScanInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type SenaProductPhotoScanInput = z.infer<typeof SenaProductPhotoScanInputSchema>;

const SenaProductPhotoScanOutputSchema = z.object({
  productName: z.string().describe('The identified name of the product.'),
  suggestedCategory: z.string().describe('A suggested category for the product.'),
  recommendedSellingPrice: z
    .number()
    .describe(
      'A recommended selling price for the product, as a numeric value representing the local currency (e.g., XOF for West African CFA franc, without currency symbol).'
    ),
});
export type SenaProductPhotoScanOutput = z.infer<typeof SenaProductPhotoScanOutputSchema>;

export async function senaProductPhotoScan(
  input: SenaProductPhotoScanInput
): Promise<SenaProductPhotoScanOutput> {
  return senaProductPhotoScanFlow(input);
}

const senaProductPhotoScanPrompt = ai.definePrompt({
  name: 'senaProductPhotoScanPrompt',
  input: {schema: SenaProductPhotoScanInputSchema},
  output: {schema: SenaProductPhotoScanOutputSchema},
  prompt: `You are Awa, an expert retail product identification and pricing assistant for Senestock. Your task is to analyze the provided product photo and extract key information.

Based on the product image, identify the following:
1. The exact name of the product.
2. A suitable retail category for this product.
3. A reasonable selling price for this product in a typical African retail market. Provide only the numeric value for the price, without any currency symbols or text. The price should be a number (e.g., 1500, 25.50).

Ensure your response is a JSON object matching the provided schema.

Product Photo: {{media url=photoDataUri}}`,
});

const senaProductPhotoScanFlow = ai.defineFlow(
  {
    name: 'senaProductPhotoScanFlow',
    inputSchema: SenaProductPhotoScanInputSchema,
    outputSchema: SenaProductPhotoScanOutputSchema,
  },
  async input => {
    const {output} = await senaProductPhotoScanPrompt(input, {
      model: 'googleai/gemini-1.5-flash-latest', 
    });
    if (!output) {
      throw new Error('Failed to generate product details from photo.');
    }
    return output;
  }
);
