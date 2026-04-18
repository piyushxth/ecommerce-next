import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  removeItemFromServerCart,
  setItemQuantityInServerCart,
} from "@/lib/cart/server";
import { setQuantitySchema } from "@/lib/validations/cart";

export const dynamic = "force-dynamic";

// Next.js 16 route handler — `params` is a Promise and must be awaited.
type Params = Promise<{ variantId: string }>;

export async function PATCH(
  request: Request,
  { params }: { params: Params },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { variantId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = setQuantitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const cart = await setItemQuantityInServerCart(
    session.user.id,
    variantId,
    parsed.data.quantity,
  );
  return NextResponse.json(cart, {
    headers: { "cache-control": "no-store" },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Params },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { variantId } = await params;
  const cart = await removeItemFromServerCart(session.user.id, variantId);
  return NextResponse.json(cart, {
    headers: { "cache-control": "no-store" },
  });
}
