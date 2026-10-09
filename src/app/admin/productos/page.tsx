import { getProducts } from "@/actions/products";
import { getSuppliers } from "@/actions/suppliers";
import { ProductsView } from "@/components/products-view";

export const dynamic = "force-dynamic";

export default async function AdminProductosPage() {
  const [productsRes, suppliersRes] = await Promise.all([
    getProducts(),
    getSuppliers(),
  ]);

  const initialProducts = productsRes.success && productsRes.data ? productsRes.data : [];
  const suppliers = suppliersRes.success && suppliersRes.data ? suppliersRes.data : [];

  return <ProductsView initialProducts={initialProducts} suppliers={suppliers} />;
}
