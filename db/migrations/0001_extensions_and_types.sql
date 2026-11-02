CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE user_role AS ENUM ('admin', 'staff', 'student');
CREATE TYPE wallet_txn_type AS ENUM ('topup', 'order', 'refund');
CREATE TYPE ingredient_unit AS ENUM ('g', 'ml', 'pcs');
CREATE TYPE stock_reason AS ENUM ('restock', 'order', 'cancel', 'wastage', 'adjust');
CREATE TYPE order_status AS ENUM ('placed', 'preparing', 'ready', 'picked_up', 'cancelled');
