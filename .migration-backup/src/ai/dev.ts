import { config } from 'dotenv';
config();

import '@/ai/flows/sena-invoice-data-extractor.ts';
import '@/ai/flows/sena-product-photo-scan.ts';
import '@/ai/flows/sena-business-insights-generator.ts';
import '@/ai/flows/sena-pos-scanner.ts';
