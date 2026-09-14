"use server";

import { redirect } from "next/navigation";
import { endSession } from "@/lib/session";

export async function signOut() {
  await endSession();
  redirect("/");
}
