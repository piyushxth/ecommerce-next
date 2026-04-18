import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { authConfig } from "@/auth.config";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { loginSchema } from "@/lib/validations/auth";

class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) throw new InvalidCredentialsError();

        const { email, password } = parsed.data;

        await connectToDatabase();
        const user = await User.findOne({ email }).select(
          "+passwordHash name email image role provider",
        );

        if (!user || !user.passwordHash) throw new InvalidCredentialsError();

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) throw new InvalidCredentialsError();

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image ?? null,
          role: user.role,
        };
      },
    }),
  ],
});
