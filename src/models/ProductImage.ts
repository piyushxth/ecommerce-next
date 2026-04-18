import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const productImageSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    // Optional — populated when the image is variant-specific (e.g. a color).
    variantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
      default: null,
      index: true,
    },
    // Can be either a public-folder path (e.g. `/images/products/foo.jpg`) or
    // a full URL (when we move to a CDN later).
    url: { type: String, required: true, trim: true },
    sortOrder: { type: Number, default: 0, index: true },
    isPrimary: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export type ProductImageDoc = InferSchemaType<typeof productImageSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ProductImage: Model<ProductImageDoc> =
  (mongoose.models.ProductImage as Model<ProductImageDoc>) ??
  mongoose.model<ProductImageDoc>("ProductImage", productImageSchema);
