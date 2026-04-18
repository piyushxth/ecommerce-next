import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { mergeGuestCartIntoServerCart } from "@/lib/cart/server";
import { mergeCartSchema } from "@/lib/validations/cart";

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

  const parsed = mergeCartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const cart = await mergeGuestCartIntoServerCart(
    session.user.id,
    parsed.data.items,
  );
  return NextResponse.json(cart, {
    headers: { "cache-control": "no-store" },
  });
}
