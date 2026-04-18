import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Name must be at least 2 characters long." })
    .max(60, { error: "Name must be 60 characters or fewer." }),
  email: z
    .email({ error: "Please enter a valid email." })
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters long." })
    .max(100, { error: "Password is too long." })
    .regex(/[a-zA-Z]/, { error: "Password must contain at least one letter." })
    .regex(/[0-9]/, { error: "Password must contain at least one number." }),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email({ error: "Please enter a valid email." }).trim().toLowerCase(),
  password: z.string().min(1, { error: "Password is required." }),
});

export type LoginInput = z.infer<typeof loginSchema>;
