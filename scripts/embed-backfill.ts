import pg from "pg";
import { embed, menuItemText } from "../src/lib/embeddings.ts";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const items = await client.query("SELECT item_id, name, description, tags FROM menu_items WHERE embedding IS NULL");
for (const item of items.rows) {
  await client.query("UPDATE menu_items SET embedding = $1 WHERE item_id = $2", [await embed(menuItemText(item)), item.item_id]);
}

const feedback = await client.query("SELECT feedback_id, comment FROM feedback WHERE embedding IS NULL AND comment <> ''");
for (const row of feedback.rows) {
  await client.query("UPDATE feedback SET embedding = $1 WHERE feedback_id = $2", [await embed(row.comment), row.feedback_id]);
}

console.log(`embedded ${items.rowCount} menu items and ${feedback.rowCount} feedback comments`);
await client.end();
