import { Receipt, ShoppingCart, Zap, type LucideIcon } from "lucide-react";
import type { ExpenseCategory } from "@/lib/categories";

export const CATEGORY_ICONS: Record<ExpenseCategory, LucideIcon> = {
  electricity: Zap,
  walmart: ShoppingCart,
  other: Receipt,
};
