const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log("Checking and updating columns...");
  
  // 1. Products: stock, currency
  await sql.query(`
    ALTER TABLE products 
    ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'ARS';
  `);
  console.log("Updated products table (stock, currency)");

  // 2. Credits: currency, exchange_rate
  await sql.query(`
    ALTER TABLE credits 
    ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
    ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(12, 2);
  `);
  console.log("Updated credits table (currency, exchange_rate)");

  // 3. Payments: currency, exchange_rate, amount_in_ars
  await sql.query(`
    ALTER TABLE payments 
    ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
    ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS amount_in_ars NUMERIC(12, 2);
  `);
  console.log("Updated payments table (currency, exchange_rate, amount_in_ars)");

  // 4. Cash movements: product_id, units, currency, exchange_rate
  await sql.query(`
    ALTER TABLE cash_movements 
    ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS units INTEGER,
    ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
    ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(12, 2);
  `);
  console.log("Updated cash_movements table (product_id, units, currency, exchange_rate)");

  // Update existing products to have stock = 1 if status is disponible, or 0 if vendido
  await sql.query(`
    UPDATE products 
    SET stock = CASE 
      WHEN status = 'vendido' THEN 0 
      ELSE GREATEST(stock, 1) 
    END;
  `);
  console.log("Synced stock values for existing products");

  const cols = await sql.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name IN ('products', 'credits', 'cash_movements', 'payments')
    ORDER BY table_name, ordinal_position;
  `);
  console.log("Current schema columns verified. Total matching columns:", cols.length);
}

run().then(() => console.log("MIGRATION FINISHED SUCCESS")).catch(console.error);
