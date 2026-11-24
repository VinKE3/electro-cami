export interface CreditPlanInput {
  baseAmount: number;
  interestRate?: number;
  downPayment?: number;
  installmentCount: number;
}

export interface CreditPlanResult {
  totalFinanced: number;
  remainingToFinance: number;
  baseInstallmentAmount: number;
  lastInstallmentAmount: number;
  installmentAmounts: number[];
}

export function calculateCreditPlan(input: CreditPlanInput): CreditPlanResult {
  const base = Number(input.baseAmount) || 0;
  const interest = Number(input.interestRate || 0);
  const downPayment = Number(input.downPayment || 0);
  const count = Number(input.installmentCount);

  if (!Number.isFinite(count) || count <= 0) {
    throw new Error("La cantidad de cuotas debe ser al menos 1.");
  }

  const totalFinanced = Math.round(base * (1 + interest / 100));
  const remainingToFinance = Math.max(0, totalFinanced - downPayment);
  const baseInstallmentAmount = Math.floor(remainingToFinance / count);
  const lastInstallmentAmount =
    remainingToFinance - baseInstallmentAmount * (count - 1);

  const installmentAmounts: number[] = [];
  for (let i = 0; i < count; i++) {
    installmentAmounts.push(
      i === count - 1 ? lastInstallmentAmount : baseInstallmentAmount
    );
  }

  return {
    totalFinanced,
    remainingToFinance,
    baseInstallmentAmount,
    lastInstallmentAmount,
    installmentAmounts,
  };
}

export function calculateDueDate(
  startDateStr: string,
  index: number,
  frequency: string,
  frequencyDays: number
): string {
  const [year, month, day] = startDateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  if (frequency === "semanal") {
    date.setUTCDate(date.getUTCDate() + (index + 1) * 7);
  } else if (frequency === "quincenal") {
    date.setUTCDate(date.getUTCDate() + (index + 1) * 14);
  } else if (frequency === "mensual") {
    date.setUTCMonth(date.getUTCMonth() + (index + 1));
  } else {
    date.setUTCDate(date.getUTCDate() + (index + 1) * (frequencyDays || 7));
  }

  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export interface InstallmentRecord {
  id: number;
  amount: string | number;
  paidAt?: Date | null;
}

export interface NonDownPaymentRecord {
  installmentId?: number | null;
  amount: string | number;
}

export interface ReplayedInstallmentState {
  id: number;
  paidAmount: number;
  status: "pagada" | "parcial" | "pendiente";
}

export function replayInstallmentPayments(
  installmentsList: InstallmentRecord[],
  nonDownPayments: NonDownPaymentRecord[]
): ReplayedInstallmentState[] {
  const paidMap = new Map<number, number>();
  for (const inst of installmentsList) {
    paidMap.set(inst.id, 0);
  }

  for (const p of nonDownPayments) {
    const amt = typeof p.amount === "string" ? parseFloat(p.amount || "0") : Number(p.amount || 0);
    if (!Number.isFinite(amt) || amt <= 0) continue;

    if (p.installmentId != null && paidMap.has(p.installmentId)) {
      paidMap.set(p.installmentId, (paidMap.get(p.installmentId) ?? 0) + amt);
    } else {
      let remainingToApply = amt;
      for (const inst of installmentsList) {
        if (remainingToApply <= 0) break;
        const instAmount =
          typeof inst.amount === "string" ? parseFloat(inst.amount || "0") : Number(inst.amount || 0);
        const currentPaid = paidMap.get(inst.id) ?? 0;
        const instDue = instAmount - currentPaid;
        if (instDue > 0) {
          const applied = Math.min(remainingToApply, instDue);
          paidMap.set(inst.id, currentPaid + applied);
          remainingToApply -= applied;
        }
      }
    }
  }

  return installmentsList.map((inst) => {
    const paid = paidMap.get(inst.id) ?? 0;
    const instAmount =
      typeof inst.amount === "string" ? parseFloat(inst.amount || "0") : Number(inst.amount || 0);
    const status: "pagada" | "parcial" | "pendiente" =
      paid >= instAmount ? "pagada" : paid > 0 ? "parcial" : "pendiente";

    return {
      id: inst.id,
      paidAmount: paid,
      status,
    };
  });
}

export interface CashMovementRecord {
  type: string;
  amount: string | number;
  currency?: string | null;
  paymentMethod?: string | null;
}

export interface CashSummary {
  efectivoTotal: number;
  mercadoPagoTotal: number;
  totalBalance: number;
  totalIngresos: number;
  totalEgresos: number;
  dolaresEfectivoTotal: number;
  dolaresIngresos: number;
  dolaresEgresos: number;
}

export function calculateCashSummary(movements: CashMovementRecord[]): CashSummary {
  let efectivoTotal = 0;
  let mercadoPagoTotal = 0;
  let totalIngresos = 0;
  let totalEgresos = 0;

  let dolaresEfectivoTotal = 0;
  let dolaresIngresos = 0;
  let dolaresEgresos = 0;

  for (const item of movements) {
    const amount =
      typeof item.amount === "string" ? parseFloat(item.amount || "0") : Number(item.amount || 0);
    if (!Number.isFinite(amount)) continue;
    const isUSD = item.currency === "USD";

    if (isUSD) {
      if (item.type === "ingreso") {
        dolaresIngresos += amount;
        dolaresEfectivoTotal += amount;
      } else {
        dolaresEgresos += amount;
        dolaresEfectivoTotal -= amount;
      }
    } else {
      if (item.type === "ingreso") {
        totalIngresos += amount;
        if (item.paymentMethod === "efectivo") efectivoTotal += amount;
        else mercadoPagoTotal += amount;
      } else {
        totalEgresos += amount;
        if (item.paymentMethod === "efectivo") efectivoTotal -= amount;
        else mercadoPagoTotal -= amount;
      }
    }
  }

  return {
    efectivoTotal,
    mercadoPagoTotal,
    totalBalance: efectivoTotal + mercadoPagoTotal,
    totalIngresos,
    totalEgresos,
    dolaresEfectivoTotal,
    dolaresIngresos,
    dolaresEgresos,
  };
}

export interface MonthlyProfitCreditRecord {
  startDate: string;
  status: string;
  currency?: string | null;
  totalAmount: string | number;
  costAmount?: string | number | null;
}

export interface MonthlyProfitSummary {
  monthPrefix: string;
  salesCount: number;
  grossSalesArs: number;
  costArs: number;
  netProfitArs: number;
  grossSalesUsd: number;
  costUsd: number;
  netProfitUsd: number;
}

export function calculateMonthlyProfitSummary(
  creditsList: MonthlyProfitCreditRecord[],
  monthPrefix: string
): MonthlyProfitSummary {
  let salesCount = 0;
  let grossSalesArs = 0;
  let costArs = 0;
  let grossSalesUsd = 0;
  let costUsd = 0;

  for (const c of creditsList) {
    if (c.status === "cancelado") continue;
    if (!c.startDate || !c.startDate.startsWith(monthPrefix)) continue;

    salesCount++;
    const total =
      typeof c.totalAmount === "string" ? parseFloat(c.totalAmount || "0") : Number(c.totalAmount || 0);
    const cost =
      typeof c.costAmount === "string" ? parseFloat(c.costAmount || "0") : Number(c.costAmount || 0);

    if (c.currency === "USD") {
      grossSalesUsd += Number.isFinite(total) ? total : 0;
      costUsd += Number.isFinite(cost) ? cost : 0;
    } else {
      grossSalesArs += Number.isFinite(total) ? total : 0;
      costArs += Number.isFinite(cost) ? cost : 0;
    }
  }

  return {
    monthPrefix,
    salesCount,
    grossSalesArs,
    costArs,
    netProfitArs: grossSalesArs - costArs,
    grossSalesUsd,
    costUsd,
    netProfitUsd: grossSalesUsd - costUsd,
  };
}
