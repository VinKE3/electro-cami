import { pgTable, serial, varchar, text, numeric, integer, timestamp, date, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 0. USUARIOS Y ADMINISTRADORES
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  username: varchar("username", { length: 100 }).notNull().unique(), // login de acceso
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("admin"), // 'admin', 'colaborador'
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 1. COMPRADORES / CLIENTES
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }),
  phone: varchar("phone", { length: 50 }), // WhatsApp
  address: text("address"),
  notes: text("notes"),
  status: varchar("status", { length: 50 }).notNull().default("al_dia"), // 'al_dia', 'atrasado', 'excelente'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 2. PROVEEDORES
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  category: varchar("category", { length: 100 }), // ej. 'Colchones', 'Celulares', 'Electro'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 3. PRODUCTOS (Inventario y Catálogo)
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull().default("Varios"),
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }).notNull().default("0"), // Costo de compra
  cashPrice: numeric("cash_price", { precision: 12, scale: 2 }).notNull().default("0"), // Precio de contado
  installmentPrice: numeric("installment_price", { precision: 12, scale: 2 }), // Precio sugerido en cuotas
  stock: integer("stock").notNull().default(1), // Unidades disponibles
  currency: varchar("currency", { length: 10 }).notNull().default("ARS"), // 'ARS' | 'USD'
  imageUrl: text("image_url"),
  status: varchar("status", { length: 50 }).notNull().default("disponible"), // 'disponible', 'agotado', 'reservado'
  isPublished: boolean("is_published").notNull().default(true), // Visible en la tienda pública
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 4. CRÉDITOS / VENTAS EN CUOTAS / PRÉSTAMOS
export const credits = pgTable("credits", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "restrict" }).notNull(),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  concept: varchar("concept", { length: 255 }).notNull(), // Descripción del producto o préstamo
  currency: varchar("currency", { length: 10 }).notNull().default("ARS"), // 'ARS' | 'USD'
  exchangeRate: numeric("exchange_rate", { precision: 12, scale: 2 }), // Cotización de referencia si aplica
  costAmount: numeric("cost_amount", { precision: 12, scale: 2 }).default("0"), // Costo original para calcular ganancia neta
  baseAmount: numeric("base_amount", { precision: 12, scale: 2 }).notNull(), // Precio contado original
  interestRate: numeric("interest_rate", { precision: 6, scale: 2 }).notNull().default("0"), // % interés (ej: 25.00)
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(), // Total a pagar con interés
  downPayment: numeric("down_payment", { precision: 12, scale: 2 }).notNull().default("0"), // Entrega inicial / Seña
  remainingAmount: numeric("remaining_amount", { precision: 12, scale: 2 }).notNull(), // Saldo pendiente
  installmentCount: integer("installment_count").notNull(), // Cantidad de cuotas
  installmentAmount: numeric("installment_amount", { precision: 12, scale: 2 }).notNull(), // Monto por cuota
  frequency: varchar("frequency", { length: 50 }).notNull().default("semanal"), // 'semanal', 'quincenal', 'mensual', 'dias'
  frequencyDays: integer("frequency_days").notNull().default(7), // Días entre cuotas
  startDate: date("start_date").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("activo"), // 'activo', 'finalizado', 'cancelado'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 5. CUOTAS ESPECÍFICAS
export const installments = pgTable("installments", {
  id: serial("id").primaryKey(),
  creditId: integer("credit_id").references(() => credits.id, { onDelete: "cascade" }).notNull(),
  installmentNumber: integer("installment_number").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  dueDate: date("due_date").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pendiente"), // 'pendiente', 'pagada', 'parcial', 'vencida'
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 6. HISTORIAL DE PAGOS REGISTRADOS
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  creditId: integer("credit_id").references(() => credits.id, { onDelete: "cascade" }).notNull(),
  installmentId: integer("installment_id").references(() => installments.id, { onDelete: "set null" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("ARS"), // 'ARS' | 'USD'
  exchangeRate: numeric("exchange_rate", { precision: 12, scale: 2 }), // Cotización aplicada si pagó en ARS
  amountInArs: numeric("amount_in_ars", { precision: 12, scale: 2 }), // Monto equivalente en pesos
  paymentMethod: varchar("payment_method", { length: 50 }).notNull().default("efectivo"), // 'efectivo', 'mercado_pago', 'transferencia', 'otro'
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 7. MOVIMIENTOS DE CAJA (Ingresos y Egresos diarios)
export const cashMovements = pgTable("cash_movements", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 20 }).notNull(), // 'ingreso', 'egreso'
  category: varchar("category", { length: 100 }).notNull(), // 'cobro_cuota', 'entrega_inicial', 'compra_mercaderia', 'flete', 'combustible', 'otro'
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("ARS"), // 'ARS' | 'USD'
  exchangeRate: numeric("exchange_rate", { precision: 12, scale: 2 }),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull().default("efectivo"), // 'efectivo', 'mercado_pago', 'transferencia'
  description: text("description").notNull(),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  units: integer("units"), // Unidades compradas o vendidas
  creditId: integer("credit_id").references(() => credits.id, { onDelete: "set null" }),
  paymentId: integer("payment_id").references(() => payments.id, { onDelete: "set null" }),
  date: timestamp("date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// RELACIONES DRIZZLE
export const customersRelations = relations(customers, ({ many }) => ({
  credits: many(credits),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [products.supplierId],
    references: [suppliers.id],
  }),
  credits: many(credits),
  cashMovements: many(cashMovements),
}));

export const creditsRelations = relations(credits, ({ one, many }) => ({
  customer: one(customers, {
    fields: [credits.customerId],
    references: [customers.id],
  }),
  product: one(products, {
    fields: [credits.productId],
    references: [products.id],
  }),
  installments: many(installments),
  payments: many(payments),
  cashMovements: many(cashMovements),
}));

export const installmentsRelations = relations(installments, ({ one, many }) => ({
  credit: one(credits, {
    fields: [installments.creditId],
    references: [credits.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  credit: one(credits, {
    fields: [payments.creditId],
    references: [credits.id],
  }),
  installment: one(installments, {
    fields: [payments.installmentId],
    references: [installments.id],
  }),
}));

export const cashMovementsRelations = relations(cashMovements, ({ one }) => ({
  credit: one(credits, {
    fields: [cashMovements.creditId],
    references: [credits.id],
  }),
  payment: one(payments, {
    fields: [cashMovements.paymentId],
    references: [payments.id],
  }),
  product: one(products, {
    fields: [cashMovements.productId],
    references: [products.id],
  }),
}));
