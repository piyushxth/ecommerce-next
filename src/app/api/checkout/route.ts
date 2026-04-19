import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { placeOrder } from "@/lib/checkout/server";
import { checkoutSchema } from "@/lib/validations/checkout";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await placeOrder(session.user.id, parsed.data);

  if (!result.ok) {
    switch (result.error.kind) {
      case "empty_cart":
        return NextResponse.json(
          { error: "Your cart is empty." },
          { status: 409 },
        );
      case "variant_missing":
        return NextResponse.json(
          {
            error: "A product in your cart is no longer available.",
            variantId: result.error.variantId,
          },
          { status: 409 },
        );
      case "stock":
        return NextResponse.json(
          {
            error: `Only ${result.error.available} of "${result.error.productName}" available.`,
            variantId: result.error.variantId,
            available: result.error.available,
          },
          { status: 409 },
        );
    }
  }

  return NextResponse.json(
    { orderId: result.orderId },
    { headers: { "cache-control": "no-store" } },
  );
}
