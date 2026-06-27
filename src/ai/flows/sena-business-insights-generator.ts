
'use server';
/**
 * @fileOverview A Genkit flow for generating business insights based on sales and inventory data.
 *
 * - senaBusinessInsightsGenerator - A function that generates business insights.
 * - SenaBusinessInsightsInput - The input type for the senaBusinessInsightsGenerator function.
 * - SenaBusinessInsightsOutput - The return type for the senaBusinessInsightsGenerator function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input Schema Definition
const SenaBusinessInsightsInputSchema = z.object({
  products: z.array(z.object({
    id: z.string().describe('Unique identifier for the product.'),
    name: z.string().describe('Name of the product.'),
    category: z.string().describe('Category the product belongs to.'),
    currentStock: z.number().int().min(0).describe('Current available stock quantity for the product.'),
    purchasePrice: z.number().min(0).describe('Price at which the product was purchased.'),
    sellingPrice: z.number().min(0).describe('Price at which the product is sold.'),
  })).describe('A list of all products with their current stock, pricing, and categorical information.'),
  salesRecords: z.array(z.object({
    productId: z.string().describe('ID of the product sold.'),
    quantity: z.number().int().min(1).describe('Quantity of the product sold in this transaction.'),
    salePrice: z.number().min(0).describe('Total sale price for this product in the transaction (quantity * unit price).'),
    date: z.string().datetime().describe('ISO 8601 formatted date and time of the sale transaction.'),
  })).describe('A list of recent sales transactions, including product ID, quantity, total sale price for that product, and date.'),
  lowStockThreshold: z.number().int().min(0).describe('The quantity threshold below which a product is considered to be in low stock.'),
  analysisPeriod: z.string().optional().describe('Optional: A description of the period for which insights are requested (e.g., "last 30 days", "last week").'),
});

export type SenaBusinessInsightsInput = z.infer<typeof SenaBusinessInsightsInputSchema>;

// Output Schema Definition
const SenaBusinessInsightsOutputSchema = z.object({
  salesSummary: z.string().describe('A detailed summary of sales trends and overall performance for the specified period, highlighting key observations and patterns.'),
  lowStockAlerts: z.array(z.object({
    productId: z.string().describe('Unique identifier for the low-stock product.'),
    productName: z.string().describe('Name of the low-stock product.'),
    currentStock: z.number().describe('Current stock level of the product.'),
    threshold: z.number().describe('The defined low stock threshold.'),
  })).describe('A list of products that are currently below or at the low stock threshold, with their current stock and the threshold.'),
  bestSellingProducts: z.array(z.object({
    productId: z.string().describe('Unique identifier for the best-selling product.'),
    productName: z.string().describe('Name of the best-selling product.'),
    totalQuantitySold: z.number().describe('Total quantity of this product sold during the analysis period.'),
  })).describe('A ranked list of the top 3-5 best-selling products based on quantity sold, including their names and total quantities sold.'),
  inventoryOptimizationSuggestions: z.string().describe('Actionable recommendations for optimizing inventory levels, purchasing strategies, and stock management based on sales data and stock levels.'),
  overallInsights: z.string().describe('A concise overall summary of the business performance, including key strengths, areas for improvement, and strategic advice.'),
});

export type SenaBusinessInsightsOutput = z.infer<typeof SenaBusinessInsightsOutputSchema>;

// Wrapper function
export async function senaBusinessInsightsGenerator(input: SenaBusinessInsightsInput): Promise<SenaBusinessInsightsOutput> {
  return senaBusinessInsightsFlow(input);
}

// Genkit Prompt Definition
const senaBusinessInsightsPrompt = ai.definePrompt({
  name: 'senaBusinessInsightsPrompt',
  input: { schema: SenaBusinessInsightsInputSchema },
  output: { schema: SenaBusinessInsightsOutputSchema },
  prompt: `You are Awa, an expert business analyst for Senestock AI. Your task is to analyze the provided product and sales data for a retail store and generate actionable business insights.\n\nHere is the data you need to analyze:\n\nProducts:\n{{{JSON.stringify products}}}\n\nSales Records:\n{{{JSON.stringify salesRecords}}}\n\nLow Stock Threshold: {{lowStockThreshold}}\n{{#if analysisPeriod}}\nAnalysis Period: {{analysisPeriod}}\n{{/if}}\n\nBased on this data, provide the following insights in a JSON object. Ensure the JSON is well-formed and strictly adheres to the output schema provided in your instructions.\n\n1.  **salesSummary**: Analyze the 'salesRecords' to identify sales trends (e.g., increasing/decreasing sales, peak periods), popular categories based on sales volume, and overall sales performance. Consider the 'analysisPeriod' if provided, otherwise infer trends from the available sales dates. Highlight any significant observations regarding revenue generation.\n2.  **lowStockAlerts**: Identify all products from the 'products' list where the 'currentStock' is less than or equal to the 'lowStockThreshold'. For each identified product, extract its 'id', 'name', 'currentStock', and the 'lowStockThreshold' itself.\n3.  **bestSellingProducts**: Calculate the total quantity sold for each product based on the 'salesRecords'. Identify the top 3 to 5 products with the highest total quantity sold. For each best-selling product, include its 'id', 'name', and the 'totalQuantitySold'.\n4.  **inventoryOptimizationSuggestions**: Based on your analysis of sales trends, low stock alerts, and best-selling products, provide specific and actionable recommendations for optimizing inventory levels. This could include advice on reordering quantities, adjusting stock levels for frequently purchased or slow-moving items, and strategies to prevent overstocking or understocking.\n5.  **overallInsights**: Offer a concise, high-level summary of the business's overall performance. Include key strengths derived from the data, potential areas for improvement, and any strategic advice for the store owner.\n`,
});

// Genkit Flow Definition
const senaBusinessInsightsFlow = ai.defineFlow(
  {
    name: 'senaBusinessInsightsFlow',
    inputSchema: SenaBusinessInsightsInputSchema,
    outputSchema: SenaBusinessInsightsOutputSchema,
  },
  async (input) => {
    const { output } = await senaBusinessInsightsPrompt(input);
    if (!output) {
      throw new Error('Failed to generate business insights.');
    }
    return output;
  }
);
