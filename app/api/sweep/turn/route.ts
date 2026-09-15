import { NextResponse } from "next/server";
import { getCurrentTurn } from "@/lib/chores-server";

export async function GET() {
  const result = await getCurrentTurn("sweep_logs");
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result.turn);
}
