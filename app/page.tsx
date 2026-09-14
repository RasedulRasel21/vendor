import { redirect } from "next/navigation";
import { getCurrentVendorUser } from "@/lib/session";

export default async function Home() {
  redirect((await getCurrentVendorUser()) ? "/dashboard" : "/login");
}
