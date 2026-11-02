"use client";

import { useEffect, useState } from "react";
import { button, input, send, table } from "../ui";

type Rating = { item_id: number; name: string; avg_rating: number; review_count: number };
type Complaint = { feedback_id: number; item: string; rating: number; comment: string; created_at: string };
type Similar = { comment: string; times: number; avg_rating: number; items: string; distance: number };

export default function FeedbackInsightsPage() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [query, setQuery] = useState("");
  const [similarTo, setSimilarTo] = useState("");
  const [similar, setSimilar] = useState<Similar[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    send("GET", "/api/admin/feedback").then(({ data }) => {
      setRatings(data.ratings);
      setComplaints(data.recent_complaints);
    });
  }, []);

  async function findSimilar(params: string, label: string) {
    const result = await send("GET", `/api/admin/feedback?${params}`);
    if (!result.ok) return setError(result.error);
    setError("");
    setSimilarTo(label);
    setSimilar(result.data.similar);
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Feedback insights</h1>

      <section>
        <h2 className="text-lg font-semibold">Find similar feedback</h2>
        <p className="text-sm text-stone-500">Searches comments by meaning, not exact words, so &ldquo;food was cold&rdquo; also finds &ldquo;not hot at pickup&rdquo;.</p>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            findSimilar(`q=${encodeURIComponent(query)}`, `“${query}”`);
          }}
        >
          <input required maxLength={200} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Describe a complaint, e.g. portions are too small" className={`${input} flex-1`} />
          <button className={button}>Search</button>
        </form>
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        {similarTo && (
          <div className="mt-4">
            <p className="text-sm">Comments closest to {similarTo}:</p>
            <table className={`${table} mt-2`}>
              <thead><tr><th>Comment</th><th>Times written</th><th>Avg rating</th><th>Items</th><th>Distance</th></tr></thead>
              <tbody>
                {similar.map((s) => (
                  <tr key={s.comment}><td>{s.comment}</td><td>{s.times}</td><td>★ {s.avg_rating}</td><td>{s.items}</td><td>{s.distance}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold">Recent complaints</h2>
          <table className={`${table} mt-2`}>
            <thead><tr><th>Item</th><th>Rating</th><th>Comment</th><th /></tr></thead>
            <tbody>
              {complaints.map((c) => (
                <tr key={c.feedback_id}>
                  <td>{c.item}</td>
                  <td>{"★".repeat(c.rating)}</td>
                  <td>{c.comment}</td>
                  <td><button onClick={() => findSimilar(`feedback_id=${c.feedback_id}`, `“${c.comment}”`)} className="whitespace-nowrap underline">Find similar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Ratings by item</h2>
          <table className={`${table} mt-2`}>
            <thead><tr><th>Item</th><th>Average</th><th>Reviews</th></tr></thead>
            <tbody>
              {ratings.map((r) => (
                <tr key={r.item_id}>
                  <td>{r.name}</td>
                  <td className={r.avg_rating < 3 ? "font-medium text-red-700" : ""}>★ {r.avg_rating.toFixed(2)}</td>
                  <td>{r.review_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
