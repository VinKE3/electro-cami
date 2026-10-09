import { getProducts } from "@/actions/products";
import { PublicCatalog } from "@/components/public-catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const res = await getProducts({ publishedOnly: true });
  const products = res.success && res.data ? res.data : [];
  const businessPhone = process.env.NEXT_PUBLIC_BUSINESS_PHONE || "5491100000000";

  return <PublicCatalog products={products} businessPhone={businessPhone} />;
}
