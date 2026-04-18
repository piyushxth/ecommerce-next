import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const colorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // 3- or 6-digit hex with leading '#'.
    hexCode: {
      type: String,
      required: true,
      trim: true,
      match: [/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "hexCode must look like #RRGGBB"],
    },
  },
  { timestamps: true },
);

export type ColorDoc = InferSchemaType<typeof colorSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Color: Model<ColorDoc> =
  (mongoose.models.Color as Model<ColorDoc>) ??
  mongoose.model<ColorDoc>("Color", colorSchema);
