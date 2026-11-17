/**
 * The fixed set of expense categories. Must match the check constraint in
 * supabase/migration_expense_category.sql — to add one, add it in both places.
 */
export const EXPENSE_CATEGORIES = [
  { key: "electricity", label: "Electricity" },
  { key: "walmart", label: "Walmart" },
  { key: "other", label: "Other" },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["key"];

/** Categories tracked with their own monthly totals (everything except "other"). */
export const TRACKED_CATEGORIES = EXPENSE_CATEGORIES.filter((c) => c.key !== "other");

export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return typeof value === "string" && EXPENSE_CATEGORIES.some((c) => c.key === value);
}

export function categoryLabel(key: ExpenseCategory): string {
  return EXPENSE_CATEGORIES.find((c) => c.key === key)!.label;
}
