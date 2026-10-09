import { getCashMovements } from "@/actions/cash";
import { getProducts } from "@/actions/products";
import { CashView } from "@/components/cash-view";

export const dynamic = "force-dynamic";

export default async function AdminCajaPage() {
  const [cashRes, prodRes] = await Promise.all([
    getCashMovements(),
    getProducts(),
  ]);

  const initialData = cashRes.success && cashRes.data ? cashRes.data : {
    movements: [],
    efectivoTotal: 0,
    mercadoPagoTotal: 0,
    totalBalance: 0,
    totalIngresos: 0,
    totalEgresos: 0,
    dolaresEfectivoTotal: 0,
    dolaresIngresos: 0,
    dolaresEgresos: 0,
  };

  const productsList = prodRes.success && prodRes.data ? prodRes.data : [];

  return <CashView initialData={initialData} products={productsList} />;
}
