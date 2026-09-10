"use server";

import { revalidatePath } from "next/cache";
import { checkPassword, signIn, signOut } from "@/lib/auth";

export async function login(_prev: string | null, formData: FormData): Promise<string | null> {
  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) return "Incorrect password.";
  await signIn();
  revalidatePath("/admin");
  return null;
}

export async function logout() {
  await signOut();
  revalidatePath("/admin");
}
