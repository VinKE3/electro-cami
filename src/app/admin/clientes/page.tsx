import { getCustomers } from "@/actions/customers";
import { CustomersView } from "@/components/customers-view";

export const dynamic = "force-dynamic";

export default async function AdminClientesPage() {
  const res = await getCustomers();
  const initialCustomers = res.success && res.data ? res.data : [];

  return <CustomersView initialCustomers={initialCustomers} />;
}
