import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { registerSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Validation failed.",
        errors: z.flattenError(parsed.error).fieldErrors,
      },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;

  try {
    await connectToDatabase();

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return NextResponse.json(
        { message: "An account with that email already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      passwordHash,
      provider: "credentials",
      role: "user",
    });

    return NextResponse.json(
      {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    // Handle the race condition where two concurrent requests both pass the
    // findOne check and the second insert fails with a duplicate-key error.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: unknown }).code === 11000
    ) {
      return NextResponse.json(
        { message: "An account with that email already exists." },
        { status: 409 },
      );
    }
    console.error("[register] Unexpected error:", error);
    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
