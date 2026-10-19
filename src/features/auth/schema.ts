import { z } from "zod";

const email = z.string().trim().email("Enter a valid email address.").max(254);
const password = z.string().min(8, "Password must be at least 8 characters.");

export const signInSchema = z.object({ email, password });

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name.").max(120),
  organizationName: z.string().trim().min(2, "Enter a workspace name.").max(120),
  email,
  password,
});
