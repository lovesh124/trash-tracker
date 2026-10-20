import { Fragment } from "react";
import { cn } from "@/lib/utils";

// Same locale behavior as formatCents (lib/money.ts), split into parts so the
// currency symbol can be styled on its own.
const formatter = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });

/** A standalone amount with a smaller, softer currency symbol. Use formatCents for amounts inside sentences. */
export function Money({ cents, className }: { cents: number; className?: string }) {
  return (
    <span className={cn("tabular-nums", className)}>
      {formatter.formatToParts(cents / 100).map((part, i) =>
        part.type === "currency" ? (
          <span key={i} className="text-[0.75em] opacity-70">
            {part.value}
          </span>
        ) : (
          <Fragment key={i}>{part.value}</Fragment>
        )
      )}
    </span>
  );
}
