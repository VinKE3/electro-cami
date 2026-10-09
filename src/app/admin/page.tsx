import { getDashboardOverview } from "@/actions/credits";
import { getCustomers } from "@/actions/customers";
import { getProducts } from "@/actions/products";
import { DashboardView } from "@/components/dashboard-view";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [overviewRes, customersRes, productsRes] = await Promise.all([
    getDashboardOverview(),
    getCustomers(),
    getProducts(),
  ]);

  const overview = overviewRes.success && overviewRes.data ? overviewRes.data : {
    activeCreditsCount: 0,
    totalInTheStreet: 0,
    cashInHand: 0,
    mercadoPagoBalance: 0,
    overdue: [],
    dueToday: [],
    upcomingThisWeek: [],
  };

  const customers = customersRes.success && customersRes.data ? customersRes.data : [];
  const products = productsRes.success && productsRes.data ? productsRes.data : [];

  return (
    <DashboardView
      overview={overview}
      customers={customers}
      products={products}
    />
  );
}
