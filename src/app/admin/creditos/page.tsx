import { getCredits } from "@/actions/credits";
import { getCustomers } from "@/actions/customers";
import { getProducts } from "@/actions/products";
import { CreditsView } from "@/components/credits-view";

export const dynamic = "force-dynamic";

export default async function AdminCreditosPage() {
  const [creditsRes, customersRes, productsRes] = await Promise.all([
    getCredits(),
    getCustomers(),
    getProducts(),
  ]);

  const initialCredits = creditsRes.success && creditsRes.data ? creditsRes.data : [];
  const customers = customersRes.success && customersRes.data ? customersRes.data : [];
  const products = productsRes.success && productsRes.data ? productsRes.data : [];

  return (
    <CreditsView
      initialCredits={initialCredits}
      customers={customers}
      products={products}
    />
  );
}
