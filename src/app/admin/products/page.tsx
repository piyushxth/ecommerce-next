import { ComingSoon } from "../_components/ComingSoon";

export default function AdminProductsPage() {
  return (
    <ComingSoon
      title="Products"
      description="Create, edit, publish, and unpublish products and variants."
      planned={[
        "Searchable/paginated product table (name, category, gender, publish state, low-stock flag).",
        "Create + edit product form (name, slug, description, category, gender, published).",
        "Variant manager (SKU, color, size, price, salePrice, inStock, weight).",
        "Product image uploads wired to /public (or blob storage later).",
        "Soft delete + restore.",
      ]}
    />
  );
}
