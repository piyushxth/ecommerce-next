import { connectToDatabase } from "@/lib/db";
import { Cart } from "@/models/Cart";
import { CartItem } from "@/models/CartItem";
import { Order } from "@/models/Order";
import { OrderItem } from "@/models/OrderItem";
import { Product } from "@/models/Product";
import { ProductVariant } from "@/models/ProductVariant";
import { User } from "@/models/User";

/** Variants at or below this stock count are flagged as "low stock". */
export const LOW_STOCK_THRESHOLD = 5;

export type AdminMetrics = {
  products: {
    total: number;
    published: number;
    unpublished: number;
    lowStockVariants: number;
    outOfStockVariants: number;
  };
  orders: {
    total: number;
    pending: number;
    paid: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    refunded: number;
    today: number;
    last7Days: number;
  };
  revenue: {
    // Sum of totalAmount for orders in a "fulfilled" state (paid onwards).
    allTime: number;
    last30Days: number;
  };
  users: {
    total: number;
    admins: number;
    newLast7Days: number;
  };
  carts: {
    totalWithItems: number;
  };
};

export type RecentOrder = {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: Date;
  userEmail: string | null;
  userName: string | null;
  itemCount: number;
};

const startOfDayUTC = (d = new Date()) => {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
};

const daysAgo = (n: number) => {
  const x = new Date();
  x.setUTCDate(x.getUTCDate() - n);
  x.setUTCHours(0, 0, 0, 0);
  return x;
};

export async function getAdminMetrics(): Promise<AdminMetrics> {
  await connectToDatabase();

  const todayStart = startOfDayUTC();
  const sevenAgo = daysAgo(7);
  const thirtyAgo = daysAgo(30);

  // Counts run in parallel. Most are cheap index-only scans; the aggregations
  // touch Order/ProductVariant but fall well under "load this page in < 200ms"
  // for realistic catalog sizes.
  const [
    productTotal,
    productPublished,
    lowStockVariants,
    outOfStockVariants,
    orderStatusGroups,
    ordersToday,
    ordersLast7,
    revenueAgg,
    userTotal,
    userAdmins,
    userNew7,
    cartsWithItemsAgg,
  ] = await Promise.all([
    Product.countDocuments({}),
    Product.countDocuments({ isPublished: true }),
    ProductVariant.countDocuments({
      inStock: { $gt: 0, $lte: LOW_STOCK_THRESHOLD },
    }),
    ProductVariant.countDocuments({ inStock: 0 }),
    Order.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Order.countDocuments({ createdAt: { $gte: todayStart } }),
    Order.countDocuments({ createdAt: { $gte: sevenAgo } }),
    Order.aggregate<{ _id: null; allTime: number; last30: number }>([
      {
        $match: {
          status: { $in: ["paid", "shipped", "delivered"] },
        },
      },
      {
        $group: {
          _id: null,
          allTime: { $sum: "$totalAmount" },
          last30: {
            $sum: {
              $cond: [
                { $gte: ["$createdAt", thirtyAgo] },
                "$totalAmount",
                0,
              ],
            },
          },
        },
      },
    ]),
    User.countDocuments({}),
    User.countDocuments({ role: "admin" }),
    User.countDocuments({ createdAt: { $gte: sevenAgo } }),
    CartItem.aggregate<{ _id: null; carts: number }>([
      { $group: { _id: "$cartId" } },
      { $count: "carts" },
    ]).then((rows) =>
      rows[0] ? [{ _id: null, carts: rows[0].carts }] : [],
    ),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const row of orderStatusGroups) {
    if (row._id) statusCounts[row._id] = row.count;
  }

  const revenue = revenueAgg[0] ?? { allTime: 0, last30: 0 };

  const cartCountRow = cartsWithItemsAgg[0];
  const cartsTotal = cartCountRow ? cartCountRow.carts : 0;
  void Cart; // import kept for schema registration symmetry

  return {
    products: {
      total: productTotal,
      published: productPublished,
      unpublished: productTotal - productPublished,
      lowStockVariants,
      outOfStockVariants,
    },
    orders: {
      total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      pending: statusCounts.pending ?? 0,
      paid: statusCounts.paid ?? 0,
      shipped: statusCounts.shipped ?? 0,
      delivered: statusCounts.delivered ?? 0,
      cancelled: statusCounts.cancelled ?? 0,
      refunded: statusCounts.refunded ?? 0,
      today: ordersToday,
      last7Days: ordersLast7,
    },
    revenue: {
      allTime: revenue.allTime ?? 0,
      last30Days: revenue.last30 ?? 0,
    },
    users: {
      total: userTotal,
      admins: userAdmins,
      newLast7Days: userNew7,
    },
    carts: {
      totalWithItems: cartsTotal,
    },
  };
}

export async function getRecentOrders(limit = 5): Promise<RecentOrder[]> {
  await connectToDatabase();

  type Row = {
    _id: unknown;
    status: string;
    totalAmount: number;
    createdAt: Date;
    user?: { email?: string; name?: string };
    itemCount?: number;
  };

  const rows = await Order.aggregate<Row>([
    { $sort: { createdAt: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "orderitems",
        localField: "_id",
        foreignField: "orderId",
        as: "items",
      },
    },
    {
      $project: {
        status: 1,
        totalAmount: 1,
        createdAt: 1,
        "user.email": 1,
        "user.name": 1,
        itemCount: { $sum: "$items.quantity" },
      },
    },
  ]);

  void OrderItem; // ensure model registered for the $lookup target name

  return rows.map((r) => ({
    id: String(r._id),
    status: r.status,
    totalAmount: r.totalAmount,
    createdAt: r.createdAt,
    userEmail: r.user?.email ?? null,
    userName: r.user?.name ?? null,
    itemCount: r.itemCount ?? 0,
  }));
}
