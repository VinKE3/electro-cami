import { getProducts } from "@/actions/products";
import { getCategories } from "@/actions/categories";
import { PublicCatalog } from "@/components/public-catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [productsRes, categoriesRes] = await Promise.all([
    getProducts({ publishedOnly: true }),
    getCategories(),
  ]);

  const products = productsRes.success && productsRes.data ? productsRes.data : [];
  const categories = categoriesRes.success && categoriesRes.data ? categoriesRes.data : [];
  const businessPhone = process.env.NEXT_PUBLIC_BUSINESS_PHONE || "5491100000000";

  return (
    <PublicCatalog
      products={products}
      businessPhone={businessPhone}
      initialCategories={categories}
    />
  );
}
