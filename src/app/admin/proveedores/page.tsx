import { getSuppliers } from "@/actions/suppliers";
import { SuppliersView } from "@/components/suppliers-view";

export const dynamic = "force-dynamic";

export default async function AdminProveedoresPage() {
  const res = await getSuppliers();
  const initialSuppliers = res.success && res.data ? res.data : [];

  return <SuppliersView initialSuppliers={initialSuppliers} />;
}
