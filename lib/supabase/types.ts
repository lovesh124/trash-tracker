export type Roommate = {
  id: string;
  name: string;
  order_index: number;
  email: string | null;
};

export type TrashLog = {
  id: string;
  roommate_id: string;
  taken_at: string;
  photo_url: string | null;
  created_at: string;
};

export type TrashLogWithRoommate = TrashLog & {
  roommate: Pick<Roommate, "id" | "name">;
};

export type CurrentTurn = {
  roommate: Roommate;
  lastLog: TrashLogWithRoommate | null;
};

export type Expense = {
  id: string;
  payer_id: string;
  description: string;
  created_at: string;
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
      owerNames: string[];
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
