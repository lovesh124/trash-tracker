export type Roommate = {
  id: string;
  name: string;
  order_index: number;
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
