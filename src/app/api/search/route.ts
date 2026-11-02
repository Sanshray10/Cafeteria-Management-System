import { z } from "zod";
import { filterFields, parseQuery } from "@/lib/llm";
import { categoryNames, keywordSearch, semanticSearch } from "@/lib/search";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const categories = await categoryNames();
  const body = z
    .object({
      q: z.string().trim().min(1).max(200),
      filters: z.object(filterFields(categories)).partial().required({ semantic_query: true }).optional(),
    })
    .safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Enter a search between 1 and 200 characters" }, { status: 400 });

  const filters = body.data.filters ?? (await parseQuery(body.data.q, categories));
  const [results, keywordResults] = await Promise.all([semanticSearch(filters), keywordSearch(body.data.q)]);
  return Response.json({ filters, results, keyword_results: keywordResults });
}
