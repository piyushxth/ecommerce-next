import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const genderSchema = new Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 60 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
  },
  { timestamps: true },
);

export type GenderDoc = InferSchemaType<typeof genderSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Gender: Model<GenderDoc> =
  (mongoose.models.Gender as Model<GenderDoc>) ??
  mongoose.model<GenderDoc>("Gender", genderSchema);
