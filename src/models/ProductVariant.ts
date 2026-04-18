import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const dimensionsSchema = new Schema(
  {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
  },
  { _id: false },
);

const productVariantSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    // Prices stored as numbers for simplicity. For real money you may prefer
    // minor-unit integers (cents) to avoid float rounding.
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, min: 0, default: null },
    colorId: { type: Schema.Types.ObjectId, ref: "Color", required: true, index: true },
    sizeId: { type: Schema.Types.ObjectId, ref: "Size", required: true, index: true },
    inStock: { type: Number, required: true, min: 0, default: 0 },
    weight: { type: Number, min: 0, default: 0 }, // grams
    dimensions: { type: dimensionsSchema, default: undefined }, // cm
  },
  { timestamps: true },
);

// A product should not have the same color+size twice.
productVariantSchema.index({ productId: 1, colorId: 1, sizeId: 1 }, { unique: true });

export type ProductVariantDoc = InferSchemaType<typeof productVariantSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ProductVariant: Model<ProductVariantDoc> =
  (mongoose.models.ProductVariant as Model<ProductVariantDoc>) ??
  mongoose.model<ProductVariantDoc>("ProductVariant", productVariantSchema);
