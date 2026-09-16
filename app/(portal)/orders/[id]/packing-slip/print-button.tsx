"use client";

import { Printer } from "lucide-react";
import { primaryButtonClass } from "@/lib/ui";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={`${primaryButtonClass} print:hidden`}>
      <Printer className="size-4" />
      Print
    </button>
  );
}
