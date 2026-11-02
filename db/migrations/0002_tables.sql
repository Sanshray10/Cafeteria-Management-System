CREATE TABLE users (
    user_id       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          TEXT NOT NULL CHECK (length(trim(name)) > 0),
    email         TEXT NOT NULL UNIQUE CHECK (email LIKE '%_@_%'),
    password_hash TEXT NOT NULL,
    role          user_role NOT NULL DEFAULT 'student',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
    session_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE wallets (
    user_id INT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    balance NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (balance >= 0)
);

CREATE TABLE categories (
    category_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE
);

-- array_to_string is only STABLE, so generated columns cannot call it directly
CREATE FUNCTION tags_to_text(tags TEXT[]) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$ SELECT array_to_string(tags, ' ') $$;

CREATE TABLE menu_items (
    item_id     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id INT NOT NULL REFERENCES categories(category_id),
    name        TEXT NOT NULL CHECK (length(trim(name)) > 0),
    description TEXT NOT NULL DEFAULT '',
    price       NUMERIC(8,2) NOT NULL CHECK (price > 0),
    is_veg      BOOLEAN NOT NULL,
    tags        TEXT[] NOT NULL DEFAULT '{}',
    is_active   BOOLEAN NOT NULL DEFAULT true,
    search_tsv  tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', name), 'A') ||
        setweight(to_tsvector('english', tags_to_text(tags)), 'B') ||
        setweight(to_tsvector('english', description), 'C')
    ) STORED,
    embedding   vector(384),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE price_history (
    id         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    item_id    INT NOT NULL REFERENCES menu_items(item_id) ON DELETE CASCADE,
    old_price  NUMERIC(8,2) NOT NULL,
    new_price  NUMERIC(8,2) NOT NULL,
    changed_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ingredients (
    ingredient_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          TEXT NOT NULL UNIQUE CHECK (length(trim(name)) > 0),
    unit          ingredient_unit NOT NULL,
    stock_qty     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
    reorder_level NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (reorder_level >= 0)
);

CREATE TABLE recipe_items (
    item_id         INT NOT NULL REFERENCES menu_items(item_id) ON DELETE CASCADE,
    ingredient_id   INT NOT NULL REFERENCES ingredients(ingredient_id),
    qty_per_serving NUMERIC(10,2) NOT NULL CHECK (qty_per_serving > 0),
    PRIMARY KEY (item_id, ingredient_id)
);

CREATE TABLE pickup_slots (
    slot_id    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slot_date  DATE NOT NULL,
    start_time TIME NOT NULL,
    capacity   INT NOT NULL CHECK (capacity > 0),
    UNIQUE (slot_date, start_time)
);

CREATE TABLE orders (
    order_id     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      INT NOT NULL REFERENCES users(user_id),
    slot_id      INT NOT NULL REFERENCES pickup_slots(slot_id),
    status       order_status NOT NULL DEFAULT 'placed',
    total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
    order_id   INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    item_id    INT NOT NULL REFERENCES menu_items(item_id),
    quantity   INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(8,2) NOT NULL CHECK (unit_price > 0),
    PRIMARY KEY (order_id, item_id)
);

CREATE TABLE wallet_transactions (
    txn_id       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      INT NOT NULL REFERENCES users(user_id),
    amount       NUMERIC(10,2) NOT NULL,
    type         wallet_txn_type NOT NULL,
    order_id     INT REFERENCES orders(order_id),
    performed_by INT REFERENCES users(user_id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK ((type = 'order' AND amount < 0) OR (type IN ('topup', 'refund') AND amount > 0)),
    CHECK (type = 'topup' OR order_id IS NOT NULL)
);

CREATE TABLE stock_movements (
    id            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ingredient_id INT NOT NULL REFERENCES ingredients(ingredient_id),
    change_qty    NUMERIC(12,2) NOT NULL CHECK (change_qty <> 0),
    reason        stock_reason NOT NULL,
    order_id      INT REFERENCES orders(order_id),
    staff_id      INT REFERENCES users(user_id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE stock_alerts (
    alert_id      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ingredient_id INT NOT NULL REFERENCES ingredients(ingredient_id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at   TIMESTAMPTZ,
    CHECK (resolved_at IS NULL OR resolved_at >= created_at)
);

CREATE TABLE feedback (
    feedback_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id    INT NOT NULL REFERENCES orders(order_id),
    item_id     INT NOT NULL REFERENCES menu_items(item_id),
    user_id     INT NOT NULL REFERENCES users(user_id),
    rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT NOT NULL DEFAULT '',
    embedding   vector(384),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (order_id, item_id)
);
