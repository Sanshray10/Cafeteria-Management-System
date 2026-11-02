import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export type SearchFilters = {
  semantic_query: string;
  max_price?: number;
  min_price?: number;
  is_veg?: boolean;
  category?: string;
  sort?: "relevance" | "price_asc" | "price_desc";
};

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export function filterFields(categories: string[]) {
  return {
    semantic_query: z.string().trim().min(1).max(200),
    max_price: z.number().positive(),
    min_price: z.number().positive(),
    is_veg: z.boolean(),
    category: z.enum(categories as [string, ...string[]]),
    sort: z.enum(["relevance", "price_asc", "price_desc"]),
  };
}

export async function parseQuery(text: string, categories: string[]): Promise<SearchFilters> {
  const fields = filterFields(categories);
  const prompt = `You turn a student's search on a campus cafeteria menu into search filters.
Menu categories: ${categories.join(", ")}. Prices are in rupees.
Put what the food should be like (dish, taste, temperature, cuisine) in semantic_query, without the price, veg or category words.
Only set a filter when the student clearly asks for it. "veg" or "vegetarian" means is_veg true, "non-veg" means is_veg false.
Use sort price_asc for "cheapest" or "cheap", price_desc for "most expensive".

Search: ${JSON.stringify(text)}`;

  try {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL!,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(z.object(fields).partial().required({ semantic_query: true })),
        abortSignal: AbortSignal.timeout(3000),
      },
    });
    const output = JSON.parse(response.text ?? "{}");
    const valid: Record<string, unknown> = { semantic_query: text };
    for (const [key, schema] of Object.entries(fields)) {
      const result = schema.safeParse(output[key]);
      if (result.success) valid[key] = result.data;
    }
    const filters = valid as SearchFilters;
    if (filters.min_price && filters.max_price && filters.min_price > filters.max_price) delete filters.min_price;
    return filters;
  } catch (err) {
    console.warn("query parsing failed, using raw text:", (err as Error).message);
    return { semantic_query: text };
  }
}
