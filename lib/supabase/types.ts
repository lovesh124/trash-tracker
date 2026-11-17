import type { ExpenseCategory } from "@/lib/categories";

export type Roommate = {
  id: string;
  name: string;
  order_index: number;
  email: string | null;
};

/** Shape shared by every chore's log table (trash_logs, sweep_logs, ...). */
export type ChoreLog = {
  id: string;
  roommate_id: string;
  taken_at: string;
  photo_url: string | null;
  created_at: string;
};

export type ChoreLogWithRoommate = ChoreLog & {
  roommate: Pick<Roommate, "id" | "name">;
};

export type CurrentTurn = {
  roommate: Roommate;
  lastLog: ChoreLogWithRoommate | null;
};

export type Expense = {
  id: string;
  payer_id: string;
  description: string;
  created_at: string;
  total_cents: number | null;
  category: ExpenseCategory;
};

export type ExpenseSplit = {
  id: string;
  expense_id: string;
  roommate_id: string;
  amount_cents: number;
};

export type ExpenseWithDetails = Expense & {
  payer: Pick<Roommate, "id" | "name">;
  splits: (Pick<ExpenseSplit, "id" | "amount_cents"> & {
    roommate: Pick<Roommate, "id" | "name">;
  })[];
};

export type Settlement = {
  id: string;
  from_roommate_id: string;
  to_roommate_id: string;
  amount_cents: number;
  proof_url: string | null;
  created_at: string;
};

export type SettlementWithRoommates = Settlement & {
  from: Pick<Roommate, "id" | "name">;
  to: Pick<Roommate, "id" | "name">;
};

export type ActivityItem =
  | {
      type: "expense";
      id: string;
      createdAt: string;
      payer: Pick<Roommate, "id" | "name">;
      description: string;
      totalCents: number;
      category: ExpenseCategory;
      /** Everyone who owes the payer on this expense, and whether they've paid it back (via a settle-up). */
      owers: { name: string; amountCents: number; paidBack: boolean }[];
    }
  | {
      type: "settlement";
      id: string;
      createdAt: string;
      from: Pick<Roommate, "id" | "name">;
      to: Pick<Roommate, "id" | "name">;
      amountCents: number;
      proofUrl: string | null;
    };

/** Things that can be undone (deleted) via /api/undo. */
export type UndoType = "trash" | "sweep" | "expense" | "settlement";

/** A recent Electricity/Walmart expense with each person's share (see /api/spending). */
export type SpendingExpense = {
  id: string;
  category: ExpenseCategory;
  createdAt: string;
  totalCents: number;
  shares: { roommate: Pick<Roommate, "id" | "name">; cents: number }[];
};
