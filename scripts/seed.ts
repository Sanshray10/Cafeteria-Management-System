import { readFileSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import pg from "pg";

type Line = { itemId: number; quantity: number; price: number };

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

let state = 146;
function random() {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)];
const minutes = (date: Date, n: number) => new Date(date.getTime() + n * 60000);

const slotCategories: Record<string, string[]> = {
  "08:00": ["Breakfast", "Beverages"],
  "09:00": ["Breakfast", "Beverages"],
  "12:00": ["Meals", "Chinese", "Snacks", "Beverages", "Desserts"],
  "12:30": ["Meals", "Chinese", "Snacks", "Beverages", "Desserts"],
  "13:00": ["Meals", "Chinese", "Snacks", "Beverages", "Desserts"],
  "13:30": ["Meals", "Chinese", "Snacks", "Beverages", "Desserts"],
  "16:00": ["Snacks", "Beverages", "Desserts"],
};

const ratingBase: Record<string, number> = {
  "Veg Sandwich": 2.2,
  "Cold Coffee": 2.3,
  "Chicken Fried Rice": 2.4,
  Upma: 2.2,
};
const reviewCap: Record<string, number> = { Upma: 3 };

const itemComments: Record<string, string[]> = {
  "Veg Sandwich": ["Bread was soggy and stale", "Sandwich was cold and dry", "Too little filling, mostly bread"],
  "Cold Coffee": ["Too sweet and watery", "Not cold at all, the ice had melted", "Tasted like cheap instant coffee"],
  "Chicken Fried Rice": ["Rice was oily and the chicken was dry", "Very bland, needed more salt", "Hardly any chicken pieces"],
  Upma: ["Lumpy and tasteless", "Too salty today"],
};
const ratingComments: Record<number, string[]> = {
  1: ["Cold by the time I picked it up", "Way too oily", "Not worth the money at all"],
  2: ["Portion was small for the price", "Too spicy for me", "Took long to be ready"],
  3: ["Decent but nothing special", "Okay taste, could be hotter", "Average, a bit late at pickup"],
  4: ["Tasty and filling", "Good portion for the price", "Fresh and well made"],
  5: ["Loved it, will order again", "Perfectly spiced and hot", "Ready right at my slot, excellent"],
};

const students = [
  "Aarav Sharma", "Diya Patel", "Rohan Iyer", "Ananya Rao", "Kabir Mehta", "Ishita Nair",
  "Vihaan Gupta", "Meera Krishnan", "Arjun Reddy", "Sneha Kulkarni", "Aditya Joshi", "Riya Menon",
];

try {
  await client.query("BEGIN");
  await client.query("SET LOCAL timezone = 'Asia/Kolkata'");
  await client.query("TRUNCATE users, categories, ingredients, pickup_slots RESTART IDENTITY CASCADE");
  await client.query(readFileSync(join(import.meta.dirname, "..", "db", "seed", "catalog.sql"), "utf8"));

  const hash = await bcrypt.hash("password123", 10);
  const addUser = async (name: string, email: string, role: string) =>
    (
      await client.query(
        "INSERT INTO users (name, email, password_hash, role, created_at) VALUES ($1, $2, $3, $4, now() - interval '40 days') RETURNING user_id",
        [name, email, hash, role],
      )
    ).rows[0].user_id as number;

  const adminId = await addUser("Cafeteria Admin", "admin@campus.edu", "admin");
  const staffIds = [
    await addUser("Ravi Kumar", "staff1@campus.edu", "staff"),
    await addUser("Lakshmi Devi", "staff2@campus.edu", "staff"),
  ];
  const studentIds: number[] = [];
  for (const name of students) {
    const email = name.toLowerCase().replace(" ", ".") + "@campus.edu";
    studentIds.push(await addUser(name, email, "student"));
  }

  await client.query(`
    INSERT INTO pickup_slots (slot_date, start_time, capacity)
    SELECT d::date, t::time, 40
    FROM generate_series(current_date - 35, current_date + 7, interval '1 day') d,
         unnest(ARRAY['08:00', '09:00', '12:00', '12:30', '13:00', '13:30', '16:00']) t
    WHERE extract(isodow FROM d) < 6`);
  const slots = (
    await client.query(`
      SELECT slot_id, to_char(start_time, 'HH24:MI') AS time, slot_date + start_time AS starts_at,
             extract(isodow FROM slot_date)::int AS weekday
      FROM pickup_slots
      WHERE slot_date <= current_date + 1
      ORDER BY starts_at`)
  ).rows;

  const items = (
    await client.query(`
      SELECT m.item_id, m.name, m.price::float AS price, c.name AS category
      FROM menu_items m JOIN categories c ON c.category_id = m.category_id
      WHERE m.is_active`)
  ).rows;
  const recipes = new Map<number, { ingredientId: number; qty: number }[]>();
  for (const r of (await client.query("SELECT item_id, ingredient_id, qty_per_serving::float AS qty FROM recipe_items")).rows) {
    if (!recipes.has(r.item_id)) recipes.set(r.item_id, []);
    recipes.get(r.item_id)!.push({ ingredientId: r.ingredient_id, qty: r.qty });
  }
  const ingredients = (await client.query("SELECT ingredient_id, name, reorder_level::float AS reorder FROM ingredients")).rows;
  const reorder = new Map<number, number>(ingredients.map((i) => [i.ingredient_id, i.reorder]));

  const stock = new Map<number, number>();
  const balance = new Map<number, number>(studentIds.map((id) => [id, 0]));
  const moves: { ingredientId: number; qty: number; reason: string; orderId: number | null; staffId: number | null; at: Date }[] = [];
  const txns: { userId: number; amount: number; type: string; orderId: number | null; by: number | null; at: Date }[] = [];
  const reviews = new Map<string, number>();

  const start = minutes(slots[0].starts_at, -60);
  for (const i of ingredients) {
    stock.set(i.ingredient_id, i.reorder * 4);
    moves.push({ ingredientId: i.ingredient_id, qty: i.reorder * 4, reason: "restock", orderId: null, staffId: staffIds[0], at: start });
  }

  const restockFor = (line: Line, at: Date) => {
    for (const r of recipes.get(line.itemId) ?? []) {
      const need = r.qty * line.quantity;
      while (stock.get(r.ingredientId)! - need < reorder.get(r.ingredientId)!) {
        const amount = reorder.get(r.ingredientId)! * 4;
        stock.set(r.ingredientId, stock.get(r.ingredientId)! + amount);
        moves.push({ ingredientId: r.ingredientId, qty: amount, reason: "restock", orderId: null, staffId: pick(staffIds), at: minutes(at, -5) });
      }
    }
  };

  const now = new Date();
  let orderCount = 0;
  for (const slot of slots) {
    const isPast = slot.starts_at < now;
    const eligible = items.filter((i) => slotCategories[slot.time].includes(i.category));
    const count = isPast ? between(1, 4) : between(1, 2);

    for (let n = 0; n < count; n++) {
      const createdAt = isPast ? minutes(slot.starts_at, -between(30, 720)) : minutes(now, -between(1, 30));
      const userId = pick(studentIds);
      const lines: Line[] = [];
      for (let k = between(1, 3); k > 0; k--) {
        const item = pick(eligible);
        if (lines.some((l) => l.itemId === item.item_id)) continue;
        const line = { itemId: item.item_id, quantity: random() < 0.8 ? 1 : 2, price: item.price };
        restockFor(line, createdAt);
        for (const r of recipes.get(line.itemId) ?? []) stock.set(r.ingredientId, stock.get(r.ingredientId)! - r.qty * line.quantity);
        lines.push(line);
      }

      const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
      while (balance.get(userId)! < total) {
        balance.set(userId, balance.get(userId)! + 500);
        txns.push({ userId, amount: 500, type: "topup", orderId: null, by: pick(staffIds), at: minutes(createdAt, -10) });
      }
      balance.set(userId, balance.get(userId)! - total);

      const status = !isPast ? "placed" : random() < 0.06 ? "cancelled" : "picked_up";
      const updatedAt = status === "placed" ? createdAt : status === "cancelled" ? minutes(createdAt, 15) : slot.starts_at;
      const orderId = (
        await client.query(
          "INSERT INTO orders (user_id, slot_id, status, total_amount, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING order_id",
          [userId, slot.slot_id, status, total, createdAt, updatedAt],
        )
      ).rows[0].order_id as number;
      orderCount++;

      for (const l of lines) {
        await client.query("INSERT INTO order_items (order_id, item_id, quantity, unit_price) VALUES ($1, $2, $3, $4)", [orderId, l.itemId, l.quantity, l.price]);
        for (const r of recipes.get(l.itemId) ?? []) {
          moves.push({ ingredientId: r.ingredientId, qty: -r.qty * l.quantity, reason: "order", orderId, staffId: null, at: createdAt });
        }
      }
      txns.push({ userId, amount: -total, type: "order", orderId, by: null, at: createdAt });

      if (status === "cancelled") {
        balance.set(userId, balance.get(userId)! + total);
        txns.push({ userId, amount: total, type: "refund", orderId, by: null, at: updatedAt });
        for (const l of lines) {
          for (const r of recipes.get(l.itemId) ?? []) {
            stock.set(r.ingredientId, stock.get(r.ingredientId)! + r.qty * l.quantity);
            moves.push({ ingredientId: r.ingredientId, qty: r.qty * l.quantity, reason: "cancel", orderId, staffId: null, at: updatedAt });
          }
        }
      }

      if (status === "picked_up") {
        for (const l of lines) {
          const name = items.find((i) => i.item_id === l.itemId)!.name;
          const done = reviews.get(name) ?? 0;
          if (random() > 0.5 || done >= (reviewCap[name] ?? Infinity)) continue;
          reviews.set(name, done + 1);
          const rating = !ratingBase[name] && random() < 0.08
            ? between(1, 2)
            : Math.min(5, Math.max(1, Math.round((ratingBase[name] ?? 4.1) + (random() - 0.5) * 2)));
          const pool = rating <= 3 && itemComments[name] ? itemComments[name] : ratingComments[rating];
          const comment = random() < 0.15 ? "" : pick(pool);
          const at = minutes(slot.starts_at, between(20, 240));
          await client.query(
            "INSERT INTO feedback (order_id, item_id, user_id, rating, comment, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
            [orderId, l.itemId, userId, rating, comment, at < now ? at : now],
          );
        }
      }
    }

    if (isPast && slot.time === "16:00" && slot.weekday === 5) {
      for (let w = 0; w < 4; w++) {
        const ingredientId = pick(ingredients).ingredient_id;
        const qty = Math.min(Math.round(reorder.get(ingredientId)! * (0.05 + random() * 0.2)), stock.get(ingredientId)!);
        if (qty <= 0) continue;
        stock.set(ingredientId, stock.get(ingredientId)! - qty);
        moves.push({ ingredientId, qty: -qty, reason: "wastage", orderId: null, staffId: pick(staffIds), at: minutes(slot.starts_at, 90) });
      }
    }
  }

  const endLevels: Record<string, number> = { Chocolate: 25, Paneer: 1200, Milk: 3000 };
  for (const i of ingredients) {
    const missing = stock.get(i.ingredient_id)! - (endLevels[i.name] ?? Infinity);
    if (missing <= 0) continue;
    stock.set(i.ingredient_id, endLevels[i.name]);
    moves.push({ ingredientId: i.ingredient_id, qty: -missing, reason: "adjust", orderId: null, staffId: staffIds[1], at: minutes(now, -120) });
  }

  await client.query(
    `INSERT INTO stock_movements (ingredient_id, change_qty, reason, order_id, staff_id, created_at)
     SELECT * FROM unnest($1::int[], $2::numeric[], $3::stock_reason[], $4::int[], $5::int[], $6::timestamptz[])`,
    [moves.map((m) => m.ingredientId), moves.map((m) => m.qty), moves.map((m) => m.reason), moves.map((m) => m.orderId), moves.map((m) => m.staffId), moves.map((m) => m.at)],
  );
  await client.query(
    `INSERT INTO wallet_transactions (user_id, amount, type, order_id, performed_by, created_at)
     SELECT * FROM unnest($1::int[], $2::numeric[], $3::wallet_txn_type[], $4::int[], $5::int[], $6::timestamptz[])`,
    [txns.map((t) => t.userId), txns.map((t) => t.amount), txns.map((t) => t.type), txns.map((t) => t.orderId), txns.map((t) => t.by), txns.map((t) => t.at)],
  );
  for (const [id, qty] of stock) await client.query("UPDATE ingredients SET stock_qty = $2 WHERE ingredient_id = $1", [id, qty]);
  for (const [id, amount] of balance) await client.query("UPDATE wallets SET balance = $2 WHERE user_id = $1", [id, amount]);

  await client.query("SELECT set_config('app.user_id', $1, true)", [String(adminId)]);
  await client.query("UPDATE menu_items SET price = 18 WHERE name = 'Samosa'");
  await client.query("UPDATE menu_items SET price = 22 WHERE name = 'Filter Coffee'");

  await client.query("COMMIT");
  console.log(`seeded ${studentIds.length + 3} users, ${orderCount} orders, ${moves.length} stock movements`);
} catch (err) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  await client.end();
}
