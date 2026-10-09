import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seed() {
  console.log("🌱 Iniciando carga de datos iniciales...");

  // 1. Proveedores
  const [prov1, prov2] = await db
    .insert(schema.suppliers)
    .values([
      {
        name: "Distribuidora Mayorista Colchones Sur",
        phone: "1144332211",
        address: "Av. Hipólito Yrigoyen 3400, Lanús",
        category: "Colchones & Sommiers",
        notes: "Excelente atención, entrega rápida en flete propio.",
      },
      {
        name: "Importadora Tech Outlet",
        phone: "1199887766",
        address: "Galería Florida, CABA",
        category: "Celulares & Tecnología",
        notes: "Equipos nuevos y seminuevos con garantía de 3 meses.",
      },
    ])
    .returning();

  console.log("✓ Proveedores creados");

  // 2. Productos
  const [prod1, prod2, prod3] = await db
    .insert(schema.products)
    .values([
      {
        name: "Colchón Sommier King 2x2 Suavestar Espuma Alta Densidad",
        description: "Colchón de 2x2 metros con base sommier de madera reforzada y resortes independientes. Garantía de confort.",
        category: "Colchones",
        costPrice: "240000",
        cashPrice: "340000",
        installmentPrice: "420000",
        imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80",
        status: "disponible",
        isPublished: true,
        supplierId: prov1.id,
      },
      {
        name: "iPhone 13 128GB Midnight (Batería 94%)",
        description: "Equipo impecable sin detalles. Incluye cable lightning original y funda de regalo. Libre de fábrica.",
        category: "Celulares & Tecnología",
        costPrice: "520000",
        cashPrice: "680000",
        installmentPrice: "820000",
        imageUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80",
        status: "disponible",
        isPublished: true,
        supplierId: prov2.id,
      },
      {
        name: "Smart TV 43 Pulgadas Full HD Noblex Android TV",
        description: "Televisor inteligente con comando por voz, Netflix, YouTube, Disney+ y control remoto original.",
        category: "Electrodomésticos",
        costPrice: "210000",
        cashPrice: "290000",
        installmentPrice: "350000",
        imageUrl: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=800&q=80",
        status: "disponible",
        isPublished: true,
        supplierId: null,
      },
    ])
    .returning();

  console.log("✓ Productos creados");

  // 3. Clientes
  const [cust1, cust2, cust3] = await db
    .insert(schema.customers)
    .values([
      {
        name: "Marcos",
        lastName: "Benítez",
        phone: "1165432109",
        address: "Calle Mitre 450",
        notes: "Cliente de confianza, paga los viernes después de las 18hs.",
        status: "al_dia",
      },
      {
        name: "Valeria",
        lastName: "Rodríguez",
        phone: "1187654321",
        address: "Barrio San Jorge, Mz 12 Lote 4",
        notes: "Prefiere pagar por Mercado Pago con transferencia.",
        status: "al_dia",
      },
      {
        name: "Roberto",
        lastName: "Pérez",
        phone: "1133221100",
        address: "Av. Belgrano 1280",
        notes: "Paga semanal en efectivo en mano.",
        status: "al_dia",
      },
    ])
    .returning();

  console.log("✓ Clientes creados");

  // 4. Créditos de demostración (Uno activo semanal con cuota próxima, otro con atraso para probar alertas)
  function addDays(baseDate: Date, days: number): string {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const today = new Date();
  const todayStr = addDays(today, 0);
  const yesterdayStr = addDays(today, -1);
  const pastDateStr = addDays(today, -14);

  // Crédito 1: Marcos Benítez (Smart TV - 6 cuotas semanales de $58.000)
  const [cred1] = await db
    .insert(schema.credits)
    .values({
      customerId: cust1.id,
      productId: prod3.id,
      concept: "Smart TV 43 Noblex Android TV",
      costAmount: "210000",
      baseAmount: "290000",
      interestRate: "20.00",
      totalAmount: "348000",
      downPayment: "0",
      remainingAmount: "232000",
      installmentCount: 6,
      installmentAmount: "58000",
      frequency: "semanal",
      frequencyDays: 7,
      startDate: pastDateStr,
      status: "activo",
      notes: "Cobrar cuota los viernes en efectivo.",
    })
    .returning();

  // Cuotas de Crédito 1:
  // Cuota 1: ya pagada
  // Cuota 2: ya pagada
  // Cuota 3: vencida ayer
  // Cuota 4, 5, 6: próximas
  await db.insert(schema.installments).values([
    {
      creditId: cred1.id,
      installmentNumber: 1,
      amount: "58000",
      paidAmount: "58000",
      dueDate: addDays(today, -14),
      status: "pagada",
      paidAt: new Date(new Date().setDate(today.getDate() - 14)),
    },
    {
      creditId: cred1.id,
      installmentNumber: 2,
      amount: "58000",
      paidAmount: "58000",
      dueDate: addDays(today, -7),
      status: "pagada",
      paidAt: new Date(new Date().setDate(today.getDate() - 7)),
    },
    {
      creditId: cred1.id,
      installmentNumber: 3,
      amount: "58000",
      paidAmount: "0",
      dueDate: yesterdayStr, // VENCIDA AYER (06/10/2026)!
      status: "pendiente",
    },
    {
      creditId: cred1.id,
      installmentNumber: 4,
      amount: "58000",
      paidAmount: "0",
      dueDate: addDays(today, 6),
      status: "pendiente",
    },
    {
      creditId: cred1.id,
      installmentNumber: 5,
      amount: "58000",
      paidAmount: "0",
      dueDate: addDays(today, 13),
      status: "pendiente",
    },
    {
      creditId: cred1.id,
      installmentNumber: 6,
      amount: "58000",
      paidAmount: "0",
      dueDate: addDays(today, 20),
      status: "pendiente",
    },
  ]);

  // Crédito 2: Roberto Pérez (Atrasado - 4 cuotas de $35.000)
  const [cred2] = await db
    .insert(schema.credits)
    .values({
      customerId: cust3.id,
      productId: null,
      concept: "Juego de Sábanas y Acolchado King",
      costAmount: "80000",
      baseAmount: "115000",
      interestRate: "20.00",
      totalAmount: "140000",
      downPayment: "0",
      remainingAmount: "140000",
      installmentCount: 4,
      installmentAmount: "35000",
      frequency: "semanal",
      frequencyDays: 7,
      startDate: pastDateStr,
      status: "activo",
      notes: "Llamar antes de ir al domicilio.",
    })
    .returning();

  // Cuota 1 vencida hace 3 días
  const odStr = addDays(today, -3);

  await db.insert(schema.installments).values([
    {
      creditId: cred2.id,
      installmentNumber: 1,
      amount: "35000",
      paidAmount: "0",
      dueDate: odStr, // VENCIDA HACE 3 DIAS!
      status: "pendiente",
    },
    {
      creditId: cred2.id,
      installmentNumber: 2,
      amount: "35000",
      paidAmount: "0",
      dueDate: addDays(today, 4),
      status: "pendiente",
    },
    {
      creditId: cred2.id,
      installmentNumber: 3,
      amount: "35000",
      paidAmount: "0",
      dueDate: addDays(today, 11),
      status: "pendiente",
    },
    {
      creditId: cred2.id,
      installmentNumber: 4,
      amount: "35000",
      paidAmount: "0",
      dueDate: addDays(today, 18),
      status: "pendiente",
    },
  ]);

  // 5. Movimientos de caja iniciales (Efectivo y Mercado Pago)
  await db.insert(schema.cashMovements).values([
    {
      type: "ingreso",
      category: "cobro_cuota",
      amount: "58000",
      paymentMethod: "efectivo",
      description: "Cobro cuota #1 a Marcos Benítez (Smart TV)",
    },
    {
      type: "ingreso",
      category: "cobro_cuota",
      amount: "58000",
      paymentMethod: "mercado_pago",
      description: "Cobro cuota #2 a Marcos Benítez (Smart TV)",
    },
    {
      type: "egreso",
      category: "flete",
      amount: "15000",
      paymentMethod: "efectivo",
      description: "Flete furgoneta para retirar mercadería de Lanús",
    },
    {
      type: "egreso",
      category: "combustible",
      amount: "12000",
      paymentMethod: "efectivo",
      description: "Carga de combustible para cobranzas semanales",
    },
  ]);

  console.log("🎉 ¡Datos de prueba cargados con éxito!");
}

seed().catch(console.error);
