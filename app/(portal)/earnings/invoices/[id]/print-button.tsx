"use client";

import { Printer } from "lucide-react";
import { secondaryButtonClass } from "@/lib/ui";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={`${secondaryButtonClass} print:hidden`}>
      <Printer className="size-4" />
      Print or save as PDF
    </button>
  );
}
