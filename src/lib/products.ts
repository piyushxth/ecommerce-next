import "server-only";

import type { PipelineStage } from "mongoose";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db";
import {
  DEFAULT_SORT,
  type ProductDetail,
  type ProductDetailImage,
  type ProductDetailVariant,
  type ProductFilterOptions,
  type ProductListItem,
  type ProductQuery,
  type SortKey,
} from "@/lib/products.types";
import { Category, Color, Gender, Product, ProductImage, ProductVariant, Size } from "@/models";

// Re-export the shared types so existing imports from "@/lib/products" keep
// working. New client-side imports should target "@/lib/products.types".
export type {
  ProductDetail,
  ProductDetailImage,
  ProductDetailVariant,
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
  // empty $in would match nothing, which is the correct UX. We check all four
  // dimensions — color/size are applied via a variants $match further down, so
  // an empty id list there would silently skip the stage and return the full
  // catalog.
  if (query.genders?.length && !genderIds.length) return [];
  if (query.categories?.length && !categoryIds.length) return [];
  if (query.colors?.length && !colorIds.length) return [];
  if (query.sizes?.length && !sizeIds.length) return [];

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

  // Variant-level filters. We want a product to match only if a single variant
  // satisfies every active dimension simultaneously — so color=red+size=l must
  // match the same variant, not red from one variant and l from another. Use
  // $elemMatch to express the AND across array elements.
  const variantElem: Record<string, unknown> = {};
  if (colorIds.length) variantElem.colorId = { $in: colorIds };
  if (sizeIds.length) variantElem.sizeId = { $in: sizeIds };
  if (Object.keys(variantElem).length) {
    pipeline.push({ $match: { variants: { $elemMatch: variantElem } } });

    // Narrow the embedded `variants` array to the ones that actually match,
    // so the derived price/color/sale fields below reflect only variants the
    // user asked for (e.g. filtering by size XL shouldn't show the size-S
    // price or a color swatch only available in size S).
    const conds: Array<Record<string, unknown>> = [];
    if (colorIds.length) conds.push({ $in: ["$$v.colorId", colorIds] });
    if (sizeIds.length) conds.push({ $in: ["$$v.sizeId", sizeIds] });
    pipeline.push({
      $set: {
        variants: {
          $filter: {
            input: "$variants",
            as: "v",
            cond: conds.length === 1 ? conds[0] : { $and: conds },
          },
        },
      },
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
    // Pick the first in-stock variant for the ProductCard quick-add button.
    // Falls back to the first variant overall so a card for an out-of-stock
    // product still has something to bind to (the button will be disabled).
    {
      $set: {
        quickAddRaw: {
          $let: {
            vars: {
              inStock: {
                $filter: {
                  input: "$variants",
                  as: "v",
                  cond: { $gt: ["$$v.inStock", 0] },
                },
              },
            },
            in: {
              $cond: [
                { $gt: [{ $size: "$$inStock" }, 0] },
                { $arrayElemAt: ["$$inStock", 0] },
                { $arrayElemAt: ["$variants", 0] },
              ],
            },
          },
        },
      },
    },
    {
      $lookup: {
        from: "colors",
        localField: "quickAddRaw.colorId",
        foreignField: "_id",
        as: "quickAddColor",
      },
    },
    {
      $lookup: {
        from: "sizes",
        localField: "quickAddRaw.sizeId",
        foreignField: "_id",
        as: "quickAddSize",
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
        quickAddRaw: 1,
        quickAddColor: { $arrayElemAt: ["$quickAddColor", 0] },
        quickAddSize: { $arrayElemAt: ["$quickAddSize", 0] },
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
    quickAddRaw?: {
      _id: mongoose.Types.ObjectId;
      sku: string;
      price: number;
      salePrice: number | null;
      inStock: number;
    } | null;
    quickAddColor?: { name: string; hexCode: string } | null;
    quickAddSize?: { name: string } | null;
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
    quickAddVariant:
      d.quickAddRaw && d.quickAddColor && d.quickAddSize
        ? {
            id: String(d.quickAddRaw._id),
            sku: d.quickAddRaw.sku,
            price: d.quickAddRaw.price,
            salePrice: d.quickAddRaw.salePrice ?? null,
            inStock: d.quickAddRaw.inStock,
            color: {
              name: d.quickAddColor.name,
              hexCode: d.quickAddColor.hexCode,
            },
            size: { name: d.quickAddSize.name },
          }
        : null,
  }));
}

// -----------------------------------------------------------------------
// Product detail
// -----------------------------------------------------------------------

// Raw shapes coming out of the individual Mongoose queries. Kept local so the
// public type surface in products.types.ts stays clean.
type RawVariant = {
  _id: mongoose.Types.ObjectId;
  sku: string;
  price: number;
  salePrice: number | null;
  inStock: number;
  colorId: mongoose.Types.ObjectId;
  sizeId: mongoose.Types.ObjectId;
};

type RawImage = {
  _id: mongoose.Types.ObjectId;
  url: string;
  variantId: mongoose.Types.ObjectId | null;
  sortOrder: number;
  isPrimary: boolean;
};

type RawColor = {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  hexCode: string;
};

type RawSize = {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  sortOrder: number;
};

// Look up a single published product by slug. Returns null when the slug
// doesn't exist or the product is unpublished — the caller is expected to
// translate that into a 404.
export async function getProductBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  if (!slug) return null;

  await connectToDatabase();

  // We deliberately use four parallel, well-indexed queries instead of a
  // single monster aggregation: the detail page needs the *full* variant and
  // image lists (not derived aggregates), and each collection is indexed on
  // productId, so four round trips to a local mongo are negligible and the
  // code stays debuggable.
  const product = await Product.findOne({ slug, isPublished: true })
    .populate<{ categoryId: RawColor & { parentId: unknown } }>({
      path: "categoryId",
      select: "name slug",
    })
    .populate<{ genderId: { _id: mongoose.Types.ObjectId; label: string; slug: string } }>({
      path: "genderId",
      select: "label slug",
    })
    .lean();

  if (!product) return null;

  const [rawVariants, rawImages] = await Promise.all([
    ProductVariant.find({ productId: product._id }).lean<RawVariant[]>(),
    ProductImage.find({ productId: product._id })
      .sort({ isPrimary: -1, sortOrder: 1 })
      .lean<RawImage[]>(),
  ]);

  // Resolve color/size docs referenced by the variants in two bulk queries
  // rather than N populate() calls.
  const colorIds = [...new Set(rawVariants.map((v) => String(v.colorId)))];
  const sizeIds = [...new Set(rawVariants.map((v) => String(v.sizeId)))];
  const [rawColors, rawSizes] = await Promise.all([
    Color.find({ _id: { $in: colorIds } }).lean<RawColor[]>(),
    Size.find({ _id: { $in: sizeIds } }).lean<RawSize[]>(),
  ]);
  const colorById = new Map(rawColors.map((c) => [String(c._id), c]));
  const sizeById = new Map(rawSizes.map((s) => [String(s._id), s]));
  const variantById = new Map(rawVariants.map((v) => [String(v._id), v]));

  const variants: ProductDetailVariant[] = rawVariants
    .map((v): ProductDetailVariant | null => {
      const c = colorById.get(String(v.colorId));
      const s = sizeById.get(String(v.sizeId));
      if (!c || !s) return null;
      return {
        id: String(v._id),
        sku: v.sku,
        price: v.price,
        salePrice: v.salePrice ?? null,
        inStock: v.inStock,
        color: { id: String(c._id), name: c.name, slug: c.slug, hexCode: c.hexCode },
        size: {
          id: String(s._id),
          name: s.name,
          slug: s.slug,
          sortOrder: s.sortOrder,
        },
      };
    })
    .filter((v): v is ProductDetailVariant => v !== null);

  const images: ProductDetailImage[] = rawImages.map((img) => {
    const variant = img.variantId
      ? variantById.get(String(img.variantId))
      : undefined;
    const color = variant ? colorById.get(String(variant.colorId)) : undefined;
    return {
      id: String(img._id),
      url: img.url,
      variantId: img.variantId ? String(img.variantId) : null,
      colorSlug: color?.slug ?? null,
      sortOrder: img.sortOrder,
      isPrimary: img.isPrimary,
    };
  });

  // Flatten distinct colors/sizes for the pickers. Colors keep first-seen
  // order (matches how Nike-style pickers behave); sizes sort by sortOrder.
  const colors: ProductDetail["colors"] = [];
  const seenColor = new Set<string>();
  for (const v of variants) {
    if (!seenColor.has(v.color.id)) {
      seenColor.add(v.color.id);
      colors.push(v.color);
    }
  }

  const sizes: ProductDetail["sizes"] = [];
  const seenSize = new Set<string>();
  for (const v of variants) {
    if (!seenSize.has(v.size.id)) {
      seenSize.add(v.size.id);
      sizes.push(v.size);
    }
  }
  sizes.sort((a, b) => a.sortOrder - b.sortOrder);

  // Price aggregates: lowest full price and lowest effective price across
  // variants. "On sale" means the effective price beats the full price.
  const prices = variants.map((v) => v.price);
  const effectivePrices = variants.map((v) => v.salePrice ?? v.price);
  const price = prices.length ? Math.min(...prices) : 0;
  const effective = effectivePrices.length ? Math.min(...effectivePrices) : 0;
  const anyOnSale = variants.some(
    (v) => v.salePrice !== null && v.salePrice < v.price,
  );
  const isOnSale = anyOnSale && effective < price;

  const categoryDoc = product.categoryId as unknown as {
    _id: mongoose.Types.ObjectId;
    name: string;
    slug: string;
  } | null;
  const genderDoc = product.genderId as unknown as {
    _id: mongoose.Types.ObjectId;
    label: string;
    slug: string;
  } | null;

  return {
    id: String(product._id),
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    gender: genderDoc
      ? { id: String(genderDoc._id), label: genderDoc.label, slug: genderDoc.slug }
      : { id: "", label: "", slug: "" },
    category: categoryDoc
      ? { id: String(categoryDoc._id), name: categoryDoc.name, slug: categoryDoc.slug }
      : { id: "", name: "", slug: "" },
    price,
    salePrice: isOnSale ? effective : null,
    isOnSale,
    variants,
    images,
    colors,
    sizes,
  };
}

// Four similar products for the "You might also like" rail. Primary match is
// by category; if that yields fewer than `limit` results, we fall back to
// same-gender products to avoid an empty row.
export async function getRecommendedProducts(params: {
  productId: string;
  categoryId: string;
  genderId: string;
  limit?: number;
}): Promise<ProductListItem[]> {
  const limit = params.limit ?? 4;
  await connectToDatabase();

  const currentId = new mongoose.Types.ObjectId(params.productId);
  const categoryId = params.categoryId
    ? new mongoose.Types.ObjectId(params.categoryId)
    : null;
  const genderId = params.genderId
    ? new mongoose.Types.ObjectId(params.genderId)
    : null;

  const buildPipeline = (
    match: Record<string, unknown>,
    excludeIds: mongoose.Types.ObjectId[],
  ): PipelineStage[] => [
    {
      $match: {
        ...match,
        isPublished: true,
        _id: { $nin: [currentId, ...excludeIds] },
      },
    },
    {
      $lookup: {
        from: "productvariants",
        localField: "_id",
        foreignField: "productId",
        as: "variants",
      },
    },
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
          $min: { $map: { input: "$variants", as: "v", in: "$$v.price" } },
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
        variantColorIds: {
          $setUnion: [
            { $map: { input: "$variants", as: "v", in: "$$v.colorId" } },
            [],
          ],
        },
      },
    },
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
    {
      $lookup: {
        from: "colors",
        localField: "variantColorIds",
        foreignField: "_id",
        as: "variantColors",
      },
    },
    {
      $set: {
        quickAddRaw: {
          $let: {
            vars: {
              inStock: {
                $filter: {
                  input: "$variants",
                  as: "v",
                  cond: { $gt: ["$$v.inStock", 0] },
                },
              },
            },
            in: {
              $cond: [
                { $gt: [{ $size: "$$inStock" }, 0] },
                { $arrayElemAt: ["$$inStock", 0] },
                { $arrayElemAt: ["$variants", 0] },
              ],
            },
          },
        },
      },
    },
    {
      $lookup: {
        from: "colors",
        localField: "quickAddRaw.colorId",
        foreignField: "_id",
        as: "quickAddColor",
      },
    },
    {
      $lookup: {
        from: "sizes",
        localField: "quickAddRaw.sizeId",
        foreignField: "_id",
        as: "quickAddSize",
      },
    },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$gender", preserveNullAndEmptyArrays: true } },
    { $sort: { createdAt: -1, _id: 1 } },
    { $limit: limit },
    {
      $project: {
        name: 1,
        slug: 1,
        effectivePrice: 1,
        fullPrice: 1,
        hasSale: 1,
        primaryImage: { $arrayElemAt: ["$primaryImage", 0] },
        category: { name: "$category.name", slug: "$category.slug" },
        gender: { label: "$gender.label", slug: "$gender.slug" },
        variantColors: { name: 1, slug: 1, hexCode: 1 },
        quickAddRaw: 1,
        quickAddColor: { $arrayElemAt: ["$quickAddColor", 0] },
        quickAddSize: { $arrayElemAt: ["$quickAddSize", 0] },
      },
    },
  ];

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
    quickAddRaw?: {
      _id: mongoose.Types.ObjectId;
      sku: string;
      price: number;
      salePrice: number | null;
      inStock: number;
    } | null;
    quickAddColor?: { name: string; hexCode: string } | null;
    quickAddSize?: { name: string } | null;
  };

  const toItem = (d: AggResult): ProductListItem => ({
    id: String(d._id),
    name: d.name,
    slug: d.slug,
    gender: d.gender ?? { label: "", slug: "" },
    category: d.category ?? { name: "", slug: "" },
    price: d.fullPrice ?? 0,
    salePrice:
      d.hasSale && d.effectivePrice !== d.fullPrice ? d.effectivePrice : null,
    isOnSale:
      d.hasSale &&
      d.effectivePrice !== null &&
      d.effectivePrice !== d.fullPrice,
    primaryImageUrl: d.primaryImage?.url ?? null,
    colors: (d.variantColors ?? []).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
    quickAddVariant:
      d.quickAddRaw && d.quickAddColor && d.quickAddSize
        ? {
            id: String(d.quickAddRaw._id),
            sku: d.quickAddRaw.sku,
            price: d.quickAddRaw.price,
            salePrice: d.quickAddRaw.salePrice ?? null,
            inStock: d.quickAddRaw.inStock,
            color: {
              name: d.quickAddColor.name,
              hexCode: d.quickAddColor.hexCode,
            },
            size: { name: d.quickAddSize.name },
          }
        : null,
  });

  // 1) Same category (preferred)
  const primary = categoryId
    ? ((await Product.aggregate<AggResult>(
        buildPipeline({ categoryId }, []),
      )) as AggResult[])
    : [];
  let out = primary.map(toItem);

  // 2) Fallback: same gender, excluding already-picked products.
  if (out.length < limit && genderId) {
    const excludeIds = [
      ...primary.map((p) => p._id),
    ];
    const remaining = limit - out.length;
    const fallback = (await Product.aggregate<AggResult>(
      buildPipeline({ genderId }, excludeIds).map((stage) =>
        "$limit" in stage ? { $limit: remaining } : stage,
      ),
    )) as AggResult[];
    out = out.concat(fallback.map(toItem));
  }

  return out;
}
