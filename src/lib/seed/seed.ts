/**
 * Seeder — populates the database with demo taxonomy, users, products,
 * variants, carts, orders, payments, wishlists, and coupons.
 *
 * Run with:   npm run seed
 *
 * Reads MONGODB_URI from .env.local (or the existing process env). Wipes all
 * ecommerce collections first, so never point it at a production database.
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import mongoose, { type Model } from "mongoose";

// Also load .env.local explicitly — Next.js conventionally uses it but
// `dotenv/config` only loads `.env`.
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: false });

import {
  User,
  Gender,
  Color,
  Size,
  Category,
  Product,
  ProductVariant,
  ProductImage,
  Address,
  Cart,
  CartItem,
  Order,
  OrderItem,
  Payment,
  Wishlist,
  Coupon,
} from "@/models";

const IMAGE_FILES = [
  "slate",
  "charcoal",
  "denim",
  "olive",
  "burgundy",
  "sand",
  "cream",
  "forest",
  "rose",
  "navy",
  "mustard",
  "lilac",
].map((name) => `/images/products/${name}.png`);

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Create .env.local with MONGODB_URI=... or export it before running.",
    );
  }

  // Deterministic-ish output between runs.
  faker.seed(42);

  console.log(`[seed] connecting to ${uri.replace(/:\/\/[^@]+@/, "://***@")}`);
  await mongoose.connect(uri, { bufferCommands: false });

  console.log("[seed] wiping existing collections...");
  const allModels: Model<unknown>[] = [
    User,
    Gender,
    Color,
    Size,
    Category,
    Product,
    ProductVariant,
    ProductImage,
    Address,
    Cart,
    CartItem,
    Order,
    OrderItem,
    Payment,
    Wishlist,
    Coupon,
  ] as Model<unknown>[];
  await Promise.all(allModels.map((m) => m.deleteMany({})));

  // Drop stale indexes that may linger from previous schema versions. Safe to
  // ignore the failure if the collection is brand new.
  for (const m of [Product, ProductVariant, Coupon, Cart, CartItem, Wishlist, Payment]) {
    try {
      await m.syncIndexes();
    } catch (err) {
      console.warn(`[seed] syncIndexes failed for ${m.modelName}:`, err);
    }
  }

  // --- Taxonomy -----------------------------------------------------------

  console.log("[seed] genders, colors, sizes, categories...");
  const genders = await Gender.insertMany([
    { label: "Men", slug: "men" },
    { label: "Women", slug: "women" },
    { label: "Unisex", slug: "unisex" },
  ]);

  const colors = await Color.insertMany([
    { name: "Slate", slug: "slate", hexCode: "#333a49" },
    { name: "Charcoal", slug: "charcoal", hexCode: "#1e242a" },
    { name: "Denim", slug: "denim", hexCode: "#2a5585" },
    { name: "Olive", slug: "olive", hexCode: "#6b733b" },
    { name: "Burgundy", slug: "burgundy", hexCode: "#741f2d" },
    { name: "Sand", slug: "sand", hexCode: "#d4c4a5" },
    { name: "Cream", slug: "cream", hexCode: "#f5ecd8" },
    { name: "Forest", slug: "forest", hexCode: "#2f4a35" },
    { name: "Rose", slug: "rose", hexCode: "#c47a80" },
    { name: "Navy", slug: "navy", hexCode: "#122247" },
  ]);

  const sizes = await Size.insertMany([
    { name: "XS", slug: "xs", sortOrder: 1 },
    { name: "S", slug: "s", sortOrder: 2 },
    { name: "M", slug: "m", sortOrder: 3 },
    { name: "L", slug: "l", sortOrder: 4 },
    { name: "XL", slug: "xl", sortOrder: 5 },
    { name: "XXL", slug: "xxl", sortOrder: 6 },
  ]);

  const topCategories = await Category.insertMany([
    { name: "Tops", slug: "tops", parentId: null },
    { name: "Bottoms", slug: "bottoms", parentId: null },
    { name: "Outerwear", slug: "outerwear", parentId: null },
    { name: "Footwear", slug: "footwear", parentId: null },
    { name: "Accessories", slug: "accessories", parentId: null },
  ]);
  const catBySlug = Object.fromEntries(topCategories.map((c) => [c.slug, c]));

  const subCategories = await Category.insertMany([
    { name: "T-Shirts", slug: "t-shirts", parentId: catBySlug.tops._id },
    { name: "Shirts", slug: "shirts", parentId: catBySlug.tops._id },
    { name: "Jeans", slug: "jeans", parentId: catBySlug.bottoms._id },
    { name: "Shorts", slug: "shorts", parentId: catBySlug.bottoms._id },
    { name: "Jackets", slug: "jackets", parentId: catBySlug.outerwear._id },
    { name: "Sneakers", slug: "sneakers", parentId: catBySlug.footwear._id },
    { name: "Bags", slug: "bags", parentId: catBySlug.accessories._id },
  ]);

  const leafCategories = subCategories; // products attach to leaf categories

  // --- Users --------------------------------------------------------------

  console.log("[seed] users...");
  const passwordHash = await bcrypt.hash("Password123!", 12);
  const userSeeds = [
    { name: "Ada Admin", email: "admin@example.com", role: "admin" as const },
    { name: "Buyer One", email: "buyer1@example.com", role: "user" as const },
    { name: "Buyer Two", email: "buyer2@example.com", role: "user" as const },
    { name: "Buyer Three", email: "buyer3@example.com", role: "user" as const },
    { name: "Buyer Four", email: "buyer4@example.com", role: "user" as const },
    { name: "Buyer Five", email: "buyer5@example.com", role: "user" as const },
  ];
  const users = await User.insertMany(
    userSeeds.map((u) => ({
      ...u,
      passwordHash,
      provider: "credentials",
      image: null,
    })),
  );

  // --- Addresses ----------------------------------------------------------

  console.log("[seed] addresses...");
  const addresses = [];
  for (const user of users) {
    const [primary, secondary] = await Address.insertMany([
      {
        userId: user._id,
        fullName: user.name,
        line1: faker.location.streetAddress(),
        line2: "",
        city: faker.location.city(),
        state: faker.location.state(),
        postalCode: faker.location.zipCode(),
        country: "United States",
        phone: faker.phone.number(),
        isDefault: true,
      },
      {
        userId: user._id,
        fullName: user.name,
        line1: faker.location.streetAddress(),
        line2: faker.location.secondaryAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        postalCode: faker.location.zipCode(),
        country: "United States",
        phone: faker.phone.number(),
        isDefault: false,
      },
    ]);
    addresses.push({ userId: user._id, primary, secondary });
  }

  // --- Products + variants + images --------------------------------------

  console.log("[seed] products, variants, images...");
  const productCount = 30;
  const usedSlugs = new Set<string>();
  const createdProducts: { _id: mongoose.Types.ObjectId }[] = [];

  for (let i = 0; i < productCount; i++) {
    const category = pick(leafCategories);
    const gender = pick(genders);
    const baseName = faker.commerce.productName();

    let slug = slugify(baseName);
    if (usedSlugs.has(slug)) slug = `${slug}-${i}`;
    usedSlugs.add(slug);

    const product = await Product.create({
      name: baseName,
      slug,
      description: faker.commerce.productDescription(),
      categoryId: category._id,
      genderId: gender._id,
      isPublished: Math.random() < 0.9,
    });
    createdProducts.push(product);

    // Variants: 2-5 unique (color, size) combos.
    const variantCount = faker.number.int({ min: 2, max: 5 });
    const usedPairs = new Set<string>();
    const variants = [];
    for (let v = 0; v < variantCount; v++) {
      const color = pick(colors);
      const size = pick(sizes);
      const key = `${color._id}-${size._id}`;
      if (usedPairs.has(key)) continue;
      usedPairs.add(key);

      const price = Number(faker.commerce.price({ min: 19, max: 249, dec: 2 }));
      const onSale = Math.random() < 0.35;
      variants.push({
        productId: product._id,
        sku: `${slug.toUpperCase().slice(0, 6)}-${color.slug.toUpperCase().slice(0, 3)}-${size.slug.toUpperCase()}-${faker.string.alphanumeric(4).toUpperCase()}`,
        price,
        salePrice: onSale ? Number((price * faker.number.float({ min: 0.6, max: 0.85, fractionDigits: 2 })).toFixed(2)) : null,
        colorId: color._id,
        sizeId: size._id,
        inStock: faker.number.int({ min: 0, max: 120 }),
        weight: faker.number.int({ min: 120, max: 900 }),
        dimensions: {
          length: faker.number.int({ min: 20, max: 60 }),
          width: faker.number.int({ min: 15, max: 45 }),
          height: faker.number.int({ min: 2, max: 20 }),
        },
      });
    }
    await ProductVariant.insertMany(variants);

    // Images: 1-4 per product, first one primary.
    const imageCount = faker.number.int({ min: 1, max: 4 });
    const imagePaths = pickN(IMAGE_FILES, imageCount);
    await ProductImage.insertMany(
      imagePaths.map((url, idx) => ({
        productId: product._id,
        variantId: null,
        url,
        sortOrder: idx,
        isPrimary: idx === 0,
      })),
    );
  }

  const allVariants = await ProductVariant.find({}).lean();

  // --- Carts + items ------------------------------------------------------

  console.log("[seed] carts...");
  for (const user of users.slice(1)) { // skip admin
    if (Math.random() < 0.7) {
      const cart = await Cart.create({ userId: user._id, sessionId: null });
      const itemCount = faker.number.int({ min: 1, max: 4 });
      const picked = pickN(allVariants, itemCount);
      await CartItem.insertMany(
        picked.map((v) => ({
          cartId: cart._id,
          productVariantId: v._id,
          quantity: faker.number.int({ min: 1, max: 3 }),
        })),
      );
    }
  }
  // One guest cart for good measure.
  const guestCart = await Cart.create({
    userId: null,
    sessionId: faker.string.uuid(),
  });
  const guestPicks = pickN(allVariants, 2);
  await CartItem.insertMany(
    guestPicks.map((v) => ({
      cartId: guestCart._id,
      productVariantId: v._id,
      quantity: 1,
    })),
  );

  // --- Orders + items + payments -----------------------------------------

  console.log("[seed] orders + payments...");
  const statuses = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;
  const paymentMethods = ["card", "paypal", "stripe", "cash_on_delivery"] as const;

  for (const { userId, primary, secondary } of addresses.slice(1)) { // skip admin
    const ordersPerUser = faker.number.int({ min: 0, max: 3 });
    for (let o = 0; o < ordersPerUser; o++) {
      const status = pick(statuses);
      const itemCount = faker.number.int({ min: 1, max: 3 });
      const picked = pickN(allVariants, itemCount);
      const quantities = picked.map(() => faker.number.int({ min: 1, max: 3 }));
      const total = picked.reduce(
        (sum, v, idx) => sum + (v.salePrice ?? v.price) * quantities[idx],
        0,
      );

      const order = await Order.create({
        userId,
        status,
        totalAmount: Number(total.toFixed(2)),
        shippingAddressId: primary._id,
        billingAddressId: Math.random() < 0.5 ? primary._id : secondary._id,
      });

      await OrderItem.insertMany(
        picked.map((v, idx) => ({
          orderId: order._id,
          productVariantId: v._id,
          quantity: quantities[idx],
          priceAtPurchase: v.salePrice ?? v.price,
        })),
      );

      const paid = status === "paid" || status === "shipped" || status === "delivered";
      await Payment.create({
        orderId: order._id,
        method: pick(paymentMethods),
        status: paid ? "succeeded" : status === "cancelled" ? "failed" : "pending",
        paidAt: paid ? faker.date.recent({ days: 30 }) : null,
        transactionId: paid ? `txn_${faker.string.alphanumeric(16)}` : null,
      });
    }
  }

  // --- Wishlists ----------------------------------------------------------

  console.log("[seed] wishlists...");
  for (const user of users.slice(1)) {
    const wishlistProducts = pickN(createdProducts, faker.number.int({ min: 0, max: 5 }));
    if (wishlistProducts.length === 0) continue;
    await Wishlist.insertMany(
      wishlistProducts.map((p) => ({
        userId: user._id,
        productId: p._id,
        addedAt: faker.date.recent({ days: 60 }),
      })),
    );
  }

  // --- Coupons ------------------------------------------------------------

  console.log("[seed] coupons...");
  await Coupon.insertMany([
    {
      code: "WELCOME10",
      discountType: "percent",
      discountValue: 10,
      expiresAt: faker.date.future({ years: 1 }),
      maxUsage: 1000,
      usedCount: 42,
    },
    {
      code: "FLAT20",
      discountType: "fixed",
      discountValue: 20,
      expiresAt: faker.date.future({ years: 1 }),
      maxUsage: 200,
      usedCount: 11,
    },
    {
      code: "SUMMER25",
      discountType: "percent",
      discountValue: 25,
      expiresAt: faker.date.soon({ days: 45 }),
      maxUsage: 500,
      usedCount: 118,
    },
  ]);

  // --- Summary ------------------------------------------------------------

  const [
    userN,
    genderN,
    colorN,
    sizeN,
    catN,
    prodN,
    varN,
    imgN,
    addrN,
    cartN,
    cartItemN,
    orderN,
    orderItemN,
    paymentN,
    wishN,
    couponN,
  ] = await Promise.all([
    User.countDocuments(),
    Gender.countDocuments(),
    Color.countDocuments(),
    Size.countDocuments(),
    Category.countDocuments(),
    Product.countDocuments(),
    ProductVariant.countDocuments(),
    ProductImage.countDocuments(),
    Address.countDocuments(),
    Cart.countDocuments(),
    CartItem.countDocuments(),
    Order.countDocuments(),
    OrderItem.countDocuments(),
    Payment.countDocuments(),
    Wishlist.countDocuments(),
    Coupon.countDocuments(),
  ]);

  console.log(`
[seed] done. counts:
  users            ${userN}
  genders          ${genderN}
  colors           ${colorN}
  sizes            ${sizeN}
  categories       ${catN}
  products         ${prodN}
  variants         ${varN}
  product images   ${imgN}
  addresses        ${addrN}
  carts            ${cartN}
  cart items       ${cartItemN}
  orders           ${orderN}
  order items      ${orderItemN}
  payments         ${paymentN}
  wishlists        ${wishN}
  coupons          ${couponN}

[seed] login creds: admin@example.com / Password123!  (and buyer1..buyer5@example.com / Password123!)
  `);
}

seed()
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
