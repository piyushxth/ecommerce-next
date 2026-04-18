import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const sizeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 30 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    sortOrder: { type: Number, required: true, default: 0, index: true },
  },
  { timestamps: true },
);

export type SizeDoc = InferSchemaType<typeof sizeSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Size: Model<SizeDoc> =
  (mongoose.models.Size as Model<SizeDoc>) ??
  mongoose.model<SizeDoc>("Size", sizeSchema);
