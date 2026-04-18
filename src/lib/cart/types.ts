// Shape of a single line item in the cart. Kept deliberately flat so the
// drawer can render without re-fetching product data. The canonical id is
// `variantId` — the same size+color combo is one line item.
export type CartItem = {
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  imageUrl: string | null;
  color: { name: string; hexCode: string };
  size: { name: string };
  price: number; // unit price actually charged (salePrice ?? price)
  fullPrice: number; // variant's non-sale price, for strikethrough
  inStock: number; // snapshot of stock at the time of add — used to clamp qty
  quantity: number;
};

// Minimum quantity is 1; removal is a distinct action.
export const MAX_QTY_PER_ITEM = 10;
