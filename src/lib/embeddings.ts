import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

let extractor: Promise<FeatureExtractionPipeline> | undefined;

export async function embed(text: string): Promise<string> {
  extractor ??= pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2") as Promise<FeatureExtractionPipeline>;
  const output = await (await extractor)(text, { pooling: "mean", normalize: true });
  return `[${Array.from(output.data as Float32Array).join(",")}]`;
}

export function menuItemText(item: { name: string; description: string; tags: string[] }) {
  return `${item.name}. ${item.description}. ${item.tags.join(", ")}`;
}
