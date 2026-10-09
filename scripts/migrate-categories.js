const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log("Creating categories table and updating products table...");
  
  // 1. Create categories table
  await sql.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log("✓ Categories table created or exists");

  // 2. Add subcategory column to products
  await sql.query(`
    ALTER TABLE products 
    ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);
  `);
  console.log("✓ Products subcategory column added");

  // 3. Seed initial standard categories if empty
  const existing = await sql.query(`SELECT COUNT(*) as count FROM categories`);
  const count = parseInt(existing[0]?.count || '0');
  
  if (count === 0) {
    console.log("Seeding initial categories and subcategories...");

    const initialData = [
      {
        name: "Colchones",
        subcategories: ["1 Plaza", "1 1/2 Plazas", "2 Plazas", "Queen / King", "Sommiers Completos", "Almohadas & Accesorios"]
      },
      {
        name: "Celulares & Tecnología",
        subcategories: ["iPhones", "Samsung & Android", "Tablets", "Cargadores & Cables", "Auriculares & Audio", "Smartwatches"]
      },
      {
        name: "Electrodomésticos",
        subcategories: ["Heladeras & Freezers", "Lavarropas", "Aires & Climatización", "Cocinas & Hornos", "Microondas", "Televisores & Smart TV", "Pequeños Electrodomésticos"]
      },
      {
        name: "Muebles & Hogar",
        subcategories: ["Placards & Roperos", "Mesas & Sillas", "Sillones & Sofás", "Cómodas & Cajoneras", "Muebles de Cocina"]
      },
      {
        name: "Herramientas",
        subcategories: ["Eléctricas", "Manuales", "Batería / Inalámbricas", "Seguridad"]
      },
      {
        name: "Varios",
        subcategories: ["Bazar & Accesorios", "Otros Artículos"]
      }
    ];

    for (let i = 0; i < initialData.length; i++) {
      const cat = initialData[i];
      const inserted = await sql.query(
        `INSERT INTO categories (name, "order") VALUES ($1, $2) RETURNING id`,
        [cat.name, i]
      );
      const parentId = inserted[0]?.id;

      for (let j = 0; j < cat.subcategories.length; j++) {
        const subName = cat.subcategories[j];
        await sql.query(
          `INSERT INTO categories (name, parent_id, "order") VALUES ($1, $2, $3)`,
          [subName, parentId, j]
        );
      }
    }
    console.log("✓ Initial categories and subcategories seeded successfully");
  } else {
    console.log(`Categories table already has ${count} records. Skipping seed.`);
  }

  console.log("Migration finished successfully!");
}

run().catch(console.error);
