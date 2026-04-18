import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  addItemToServerCart,
  getCartForUser,
} from "@/lib/cart/server";
import { addItemSchema } from "@/lib/validations/cart";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cart = await getCartForUser(session.user.id);
  return NextResponse.json(cart, {
    headers: { "cache-control": "no-store" },
  });
}

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

  const parsed = addItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const cart = await addItemToServerCart(session.user.id, parsed.data);
  return NextResponse.json(cart, {
    headers: { "cache-control": "no-store" },
  });
}
