import { getProducts } from "@/actions/products";
import { getSuppliers } from "@/actions/suppliers";
import { getCategories } from "@/actions/categories";
import { ProductsView } from "@/components/products-view";

export const dynamic = "force-dynamic";

export default async function AdminProductosPage() {
  const [productsRes, suppliersRes, categoriesRes] = await Promise.all([
    getProducts(),
    getSuppliers(),
    getCategories(),
  ]);

  const initialProducts = productsRes.success && productsRes.data ? productsRes.data : [];
  const suppliers = suppliersRes.success && suppliersRes.data ? suppliersRes.data : [];
  const initialCategories = categoriesRes.success && categoriesRes.data ? categoriesRes.data : [];

  return (
    <ProductsView
      initialProducts={initialProducts}
      suppliers={suppliers}
      initialCategories={initialCategories}
    />
  );
}
