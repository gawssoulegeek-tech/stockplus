
'use server';
/**
 * @fileOverview A Genkit flow for extracting product data from supplier invoices.
 *
 * - senaInvoiceDataExtractor - A function that extracts product details from an invoice image or PDF.
 * - SenaInvoiceDataExtractorInput - The input type for the senaInvoiceDataExtractor function.
 * - SenaInvoiceDataExtractorOutput - The return type for the senaInvoiceDataExtractor function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SenaInvoiceDataExtractorInputSchema = z.object({
  invoiceDataUri: z
    .string()
    .describe(
      "A supplier invoice, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. Can be an image or PDF."
    )
});
export type SenaInvoiceDataExtractorInput = z.infer<typeof SenaInvoiceDataExtractorInputSchema>;

const SenaInvoiceDataExtractorOutputSchema = z.object({
  products: z.array(
    z.object({
      name: z.string().describe('The name of the product.'),
      quantity: z.number().int().positive().describe('The quantity of the product.'),
      purchasePrice: z.number().positive().describe('The purchase price of a single unit of the product.')
    })
  ).describe('An array of products extracted from the invoice.'),
});
export type SenaInvoiceDataExtractorOutput = z.infer<typeof SenaInvoiceDataExtractorOutputSchema>;

export async function senaInvoiceDataExtractor(input: SenaInvoiceDataExtractorInput): Promise<SenaInvoiceDataExtractorOutput> {
  return senaInvoiceDataExtractorFlow(input);
}

const extractInvoiceDataPrompt = ai.definePrompt({
  name: 'extractInvoiceDataPrompt',
  input: {schema: SenaInvoiceDataExtractorInputSchema},
  output: {schema: SenaInvoiceDataExtractorOutputSchema},
  prompt: `You are Awa, an expert assistant for Senestock designed to extract product information from supplier invoices.

Carefully analyze the provided invoice and extract the product name, quantity, and purchase price for each line item.
Only extract information for physical products. Do not include taxes, shipping fees, or service charges.

If a quantity is not explicitly stated but a total price for an item is, assume the quantity is 1.

Invoice: {{media url=invoiceDataUri}}

Provide the extracted data in JSON format matching the defined output schema.`,
});

const senaInvoiceDataExtractorFlow = ai.defineFlow(
  {
    name: 'senaInvoiceDataExtractorFlow',
    inputSchema: SenaInvoiceDataExtractorInputSchema,
    outputSchema: SenaInvoiceDataExtractorOutputSchema,
  },
  async (input) => {
    const {output} = await extractInvoiceDataPrompt(input);
    return output!;
  }
);
