CREATE INDEX idx_menu_items_search_tsv ON menu_items USING GIN (search_tsv);
CREATE INDEX idx_menu_items_embedding ON menu_items USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_feedback_embedding ON feedback USING hnsw (embedding vector_cosine_ops);
