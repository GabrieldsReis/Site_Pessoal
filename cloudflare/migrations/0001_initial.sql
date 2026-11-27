CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE CHECK(length(name) BETWEEN 1 AND 80),
  slug TEXT NOT NULL UNIQUE CHECK(length(slug) BETWEEN 1 AND 90),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS images (
  object_key TEXT PRIMARY KEY,
  size_bytes INTEGER NOT NULL CHECK(size_bytes BETWEEN 1 AND 5242880),
  content_type TEXT NOT NULL CHECK(content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 120),
  description TEXT NOT NULL DEFAULT '' CHECK(length(description) <= 2000),
  category TEXT NOT NULL CHECK(length(category) BETWEEN 1 AND 80),
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
  purchase_price_cents INTEGER NOT NULL DEFAULT 0 CHECK(purchase_price_cents >= 0),
  sale_price_cents INTEGER NOT NULL CHECK(sale_price_cents BETWEEN 1 AND 99999999),
  image_key TEXT REFERENCES images(object_key) ON DELETE SET NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
  is_featured INTEGER NOT NULL DEFAULT 0 CHECK(is_featured IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_products_public ON products(is_active, is_featured, name);
CREATE INDEX IF NOT EXISTS ix_products_category ON products(category, is_active);

CREATE TABLE IF NOT EXISTS store_settings (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  store_name TEXT NOT NULL DEFAULT 'Minha loja' CHECK(length(store_name) BETWEEN 1 AND 120),
  whatsapp TEXT NOT NULL DEFAULT '' CHECK(length(whatsapp) <= 20),
  instagram_url TEXT NOT NULL DEFAULT '' CHECK(length(instagram_url) <= 300),
  service_region TEXT NOT NULL DEFAULT '' CHECK(length(service_region) <= 200),
  presentation TEXT NOT NULL DEFAULT 'Conheça nossos produtos e fale com a loja para confirmar seu pedido.' CHECK(length(presentation) <= 1000),
  delivery_methods TEXT NOT NULL DEFAULT '' CHECK(length(delivery_methods) <= 300),
  payment_methods TEXT NOT NULL DEFAULT '' CHECK(length(payment_methods) <= 300),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO store_settings (id) VALUES (1);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  email TEXT NOT NULL UNIQUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS login_attempts (
  fingerprint TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  window_started INTEGER NOT NULL,
  locked_until INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS r2_monthly_operations (
  month TEXT PRIMARY KEY,
  operations INTEGER NOT NULL DEFAULT 0 CHECK(operations BETWEEN 0 AND 10000)
);
