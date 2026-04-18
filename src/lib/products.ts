import "server-only";

import type { PipelineStage } from "mongoose";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db";
import {
  DEFAULT_SORT,
  type ProductFilterOptions,
  type ProductListItem,
  type ProductQuery,
  type SortKey,
} from "@/lib/products.types";
import { Category, Color, Gender, Product, Size } from "@/models";

// Re-export the shared types so existing imports from "@/lib/products" keep
// working. New client-side imports should target "@/lib/products.types".
export type {
  ProductFilterOptions,
  ProductListItem,
  ProductQuery,
  SortKey,
} from "@/lib/products.types";
export {
  DEFAULT_SORT,
  SORT_OPTIONS,
  parseSlugList,
  parseSort,
} from "@/lib/products.types";

function sortStage(sort: SortKey): PipelineStage {
  switch (sort) {
    case "price-desc":
      return { $sort: { effectivePrice: -1, _id: 1 } };
    case "price-asc":
      return { $sort: { effectivePrice: 1, _id: 1 } };
    case "name-asc":
      return { $sort: { name: 1, _id: 1 } };
    case "newest":
    default:
      return { $sort: { createdAt: -1, _id: 1 } };
  }
}

export async function getProductFilterOptions(): Promise<ProductFilterOptions> {
  await connectToDatabase();

  const [genders, categories, colors, sizes] = await Promise.all([
    Gender.find({}).sort({ label: 1 }).lean(),
    Category.find({}).sort({ name: 1 }).lean(),
    Color.find({}).sort({ name: 1 }).lean(),
    Size.find({}).sort({ sortOrder: 1 }).lean(),
  ]);

  const catById = new Map(
    categories.map((c) => [String(c._id), c.slug as string]),
  );

  return {
    genders: genders.map((g) => ({ label: g.label, slug: g.slug })),
    categories: categories.map((c) => ({
      name: c.name,
      slug: c.slug,
      parentSlug: c.parentId ? catById.get(String(c.parentId)) ?? null : null,
    })),
    colors: colors.map((c) => ({
      name: c.name,
      slug: c.slug,
      hexCode: c.hexCode,
    })),
    sizes: sizes.map((s) => ({
      name: s.name,
      slug: s.slug,
      sortOrder: s.sortOrder,
    })),
  };
}

export async function listProducts(
  query: ProductQuery,
): Promise<ProductListItem[]> {
  await connectToDatabase();

  const sort = query.sort ?? DEFAULT_SORT;

  // Resolve slug-based filter inputs to ObjectIds in parallel. Empty arrays
  // mean "no filter on this dimension".
  const [genderIds, categoryIds, colorIds, sizeIds] = await Promise.all([
    query.genders?.length
      ? Gender.find({ slug: { $in: query.genders } }).distinct("_id")
      : Promise.resolve<mongoose.Types.ObjectId[]>([]),
    query.categories?.length
      ? Category.find({ slug: { $in: query.categories } }).distinct("_id")
      : Promise.resolve<mongoose.Types.ObjectId[]>([]),
    query.colors?.length
      ? Color.find({ slug: { $in: query.colors } }).distinct("_id")
      : Promise.resolve<mongoose.Types.ObjectId[]>([]),
    query.sizes?.length
      ? Size.find({ slug: { $in: query.sizes } }).distinct("_id")
      : Promise.resolve<mongoose.Types.ObjectId[]>([]),
  ]);

  const productMatch: Record<string, unknown> = { isPublished: true };
  if (genderIds.length) productMatch.genderId = { $in: genderIds };
  if (categoryIds.length) productMatch.categoryId = { $in: categoryIds };

  // If a selected filter has no matching docs (e.g. bad slug), the resulting
  // empty $in would match nothing, which is the correct UX.
  if (query.genders?.length && !genderIds.length) return [];
  if (query.categories?.length && !categoryIds.length) return [];

  const pipeline: PipelineStage[] = [
    { $match: productMatch },
    // Pull in all variants for each product.
    {
      $lookup: {
        from: "productvariants",
        localField: "_id",
        foreignField: "productId",
        as: "variants",
      },
    },
  ];

  // Apply color/size filters on the variant join so a product only matches if
  // *some* variant satisfies both. We filter the `variants` array too so the
  // color swatches on the card reflect what's actually available.
  if (colorIds.length) {
    pipeline.push({
      $match: { "variants.colorId": { $in: colorIds } },
    });
  }
  if (sizeIds.length) {
    pipeline.push({
      $match: { "variants.sizeId": { $in: sizeIds } },
    });
  }

  pipeline.push(
    {
      $addFields: {
        effectivePrice: {
          $min: {
            $map: {
              input: "$variants",
              as: "v",
              in: { $ifNull: ["$$v.salePrice", "$$v.price"] },
            },
          },
        },
        fullPrice: {
          $min: {
            $map: { input: "$variants", as: "v", in: "$$v.price" },
          },
        },
        hasSale: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: "$variants",
                  as: "v",
                  cond: { $ne: ["$$v.salePrice", null] },
                },
              },
            },
            0,
          ],
        },
        // Unique color ids used by this product's variants.
        variantColorIds: {
          $setUnion: [
            {
              $map: {
                input: "$variants",
                as: "v",
                in: "$$v.colorId",
              },
            },
            [],
          ],
        },
      },
    },
    // Join the primary image (fallback: the lowest sortOrder image).
    {
      $lookup: {
        from: "productimages",
        let: { pid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$productId", "$$pid"] } } },
          { $sort: { isPrimary: -1, sortOrder: 1 } },
          { $limit: 1 },
        ],
        as: "primaryImage",
      },
    },
    // Join category + gender docs for display metadata.
    {
      $lookup: {
        from: "categories",
        localField: "categoryId",
        foreignField: "_id",
        as: "category",
      },
    },
    {
      $lookup: {
        from: "genders",
        localField: "genderId",
        foreignField: "_id",
        as: "gender",
      },
    },
    // Join the colors used by the product's variants.
    {
      $lookup: {
        from: "colors",
        localField: "variantColorIds",
        foreignField: "_id",
        as: "variantColors",
      },
    },
    {
      $unwind: { path: "$category", preserveNullAndEmptyArrays: true },
    },
    {
      $unwind: { path: "$gender", preserveNullAndEmptyArrays: true },
    },
    sortStage(sort),
    { $limit: 60 },
    {
      $project: {
        name: 1,
        slug: 1,
        effectivePrice: 1,
        fullPrice: 1,
        hasSale: 1,
        createdAt: 1,
        primaryImage: { $arrayElemAt: ["$primaryImage", 0] },
        category: { name: "$category.name", slug: "$category.slug" },
        gender: { label: "$gender.label", slug: "$gender.slug" },
        variantColors: { name: 1, slug: 1, hexCode: 1 },
      },
    },
  );

  type AggResult = {
    _id: mongoose.Types.ObjectId;
    name: string;
    slug: string;
    effectivePrice: number | null;
    fullPrice: number | null;
    hasSale: boolean;
    primaryImage?: { url: string } | null;
    category?: { name: string; slug: string } | null;
    gender?: { label: string; slug: string } | null;
    variantColors: { name: string; slug: string; hexCode: string }[];
  };

  const docs = (await Product.aggregate<AggResult>(pipeline)) as AggResult[];

  return docs.map((d) => ({
    id: String(d._id),
    name: d.name,
    slug: d.slug,
    gender: d.gender ?? { label: "", slug: "" },
    category: d.category ?? { name: "", slug: "" },
    price: d.fullPrice ?? 0,
    salePrice: d.hasSale && d.effectivePrice !== d.fullPrice ? d.effectivePrice : null,
    isOnSale:
      d.hasSale && d.effectivePrice !== null && d.effectivePrice !== d.fullPrice,
    primaryImageUrl: d.primaryImage?.url ?? null,
    colors: (d.variantColors ?? []).sort((a, b) => a.name.localeCompare(b.name)),
  }));
}
