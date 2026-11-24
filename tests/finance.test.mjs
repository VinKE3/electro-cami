import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateCreditPlan,
  calculateDueDate,
  replayInstallmentPayments,
  calculateCashSummary,
  calculateMonthlyProfitSummary,
} from "../src/lib/finance.ts";
import { buildCsvContent, escapeCsvCell } from "../src/lib/csv.ts";

test("calculateCreditPlan divide en cuotas exactas y absorbe resto en la última", () => {
  const exact = calculateCreditPlan({
    baseAmount: 100000,
    interestRate: 20,
    downPayment: 20000,
    installmentCount: 5,
  });
  assert.equal(exact.totalFinanced, 120000);
  assert.equal(exact.remainingToFinance, 100000);
  assert.equal(exact.baseInstallmentAmount, 20000);
  assert.equal(exact.lastInstallmentAmount, 20000);
  assert.deepEqual(exact.installmentAmounts, [20000, 20000, 20000, 20000, 20000]);

  const remainder = calculateCreditPlan({
    baseAmount: 10000,
    interestRate: 0,
    downPayment: 0,
    installmentCount: 3,
  });
  assert.equal(remainder.baseInstallmentAmount, 3333);
  assert.equal(remainder.lastInstallmentAmount, 3334);
  assert.equal(
    remainder.installmentAmounts.reduce((a, b) => a + b, 0),
    remainder.remainingToFinance
  );

  const paidInFull = calculateCreditPlan({
    baseAmount: 50000,
    interestRate: 10,
    downPayment: 55000,
    installmentCount: 2,
  });
  assert.equal(paidInFull.remainingToFinance, 0);
  assert.deepEqual(paidInFull.installmentAmounts, [0, 0]);

  assert.throws(
    () =>
      calculateCreditPlan({
        baseAmount: 10000,
        interestRate: 0,
        downPayment: 0,
        installmentCount: 0,
      }),
    /al menos 1/
  );
});

test("calculateDueDate calcula vencimientos semanales, quincenales, mensuales y por días", () => {
  assert.equal(calculateDueDate("2026-01-10", 0, "semanal", 7), "2026-01-17");
  assert.equal(calculateDueDate("2026-01-10", 1, "quincenal", 14), "2026-02-07");
  assert.equal(calculateDueDate("2026-01-10", 2, "mensual", 30), "2026-04-10");
  assert.equal(calculateDueDate("2026-01-10", 0, "dias", 10), "2026-01-20");
});

test("replayInstallmentPayments aplica pagos específicos, parciales y en cascada", () => {
  const insts = [
    { id: 1, amount: "10000" },
    { id: 2, amount: "10000" },
    { id: 3, amount: "10000" },
  ];

  // Pago en cascada de 15000: paga cuota 1 completa y deja cuota 2 parcial
  const step1 = replayInstallmentPayments(insts, [{ amount: "15000" }]);
  assert.deepEqual(step1, [
    { id: 1, paidAmount: 10000, status: "pagada" },
    { id: 2, paidAmount: 5000, status: "parcial" },
    { id: 3, paidAmount: 0, status: "pendiente" },
  ]);

  // Más pago específico a la cuota 3
  const step2 = replayInstallmentPayments(insts, [
    { amount: "15000" },
    { installmentId: 3, amount: "10000" },
  ]);
  assert.deepEqual(step2, [
    { id: 1, paidAmount: 10000, status: "pagada" },
    { id: 2, paidAmount: 5000, status: "parcial" },
    { id: 3, paidAmount: 10000, status: "pagada" },
  ]);

  // Al anular el primer pago de 15000, solo queda el específico de la cuota 3
  const afterRevert = replayInstallmentPayments(insts, [
    { installmentId: 3, amount: "10000" },
  ]);
  assert.deepEqual(afterRevert, [
    { id: 1, paidAmount: 0, status: "pendiente" },
    { id: 2, paidAmount: 0, status: "pendiente" },
    { id: 3, paidAmount: 10000, status: "pagada" },
  ]);
});

test("calculateCashSummary separa efectivo ARS, digital ARS y USD", () => {
  const summary = calculateCashSummary([
    { type: "ingreso", amount: "50000", currency: "ARS", paymentMethod: "efectivo" },
    { type: "egreso", amount: "12000", currency: "ARS", paymentMethod: "efectivo" },
    { type: "ingreso", amount: "30000", currency: "ARS", paymentMethod: "mercado_pago" },
    { type: "egreso", amount: "5000", currency: "ARS", paymentMethod: "transferencia" },
    { type: "ingreso", amount: "200", currency: "USD", paymentMethod: "efectivo" },
    { type: "egreso", amount: "50", currency: "USD", paymentMethod: "efectivo" },
  ]);

  assert.equal(summary.efectivoTotal, 38000);
  assert.equal(summary.mercadoPagoTotal, 25000);
  assert.equal(summary.totalBalance, 63000);
  assert.equal(summary.totalIngresos, 80000);
  assert.equal(summary.totalEgresos, 17000);
  assert.equal(summary.dolaresEfectivoTotal, 150);
  assert.equal(summary.dolaresIngresos, 200);
  assert.equal(summary.dolaresEgresos, 50);
});

test("calculateMonthlyProfitSummary filtra por mes, excluye cancelados y separa ARS/USD", () => {
  const profit = calculateMonthlyProfitSummary(
    [
      { startDate: "2026-11-05", status: "activo", currency: "ARS", totalAmount: "150000", costAmount: "90000" },
      { startDate: "2026-11-18", status: "finalizado", currency: "ARS", totalAmount: "50000", costAmount: "30000" },
      { startDate: "2026-11-20", status: "cancelado", currency: "ARS", totalAmount: "80000", costAmount: "50000" },
      { startDate: "2026-11-21", status: "activo", currency: "USD", totalAmount: "500", costAmount: "320" },
      { startDate: "2026-10-28", status: "activo", currency: "ARS", totalAmount: "100000", costAmount: "60000" },
    ],
    "2026-11"
  );

  assert.equal(profit.monthPrefix, "2026-11");
  assert.equal(profit.salesCount, 3);
  assert.equal(profit.grossSalesArs, 200000);
  assert.equal(profit.costArs, 120000);
  assert.equal(profit.netProfitArs, 80000);
  assert.equal(profit.grossSalesUsd, 500);
  assert.equal(profit.costUsd, 320);
  assert.equal(profit.netProfitUsd, 180);
});

test("buildCsvContent genera BOM UTF-8, escapa comillas y neutraliza fórmulas", () => {
  assert.equal(escapeCsvCell("=SUM(A1)"), "'=SUM(A1)");
  assert.equal(escapeCsvCell(-1500), "-1500");

  const csv = buildCsvContent(
    ["Cliente", "Detalle", "Saldo"],
    [["Juan \"El Rápido\"", "=HYPERLINK(\"x\")", 15000]]
  );
  assert.ok(csv.startsWith("\uFEFF"));
  assert.equal(
    csv,
    "\uFEFFCliente;Detalle;Saldo\r\n\"Juan \"\"El Rápido\"\"\";\"'=HYPERLINK(\"\"x\"\")\";15000"
  );
});
