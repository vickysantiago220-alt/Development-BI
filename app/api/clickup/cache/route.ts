import { NextResponse } from "next/server";
import { getClickUpSnapshotFromDb } from "@/lib/clickup-read-db";

export async function GET() {
  try {
    const data = await getClickUpSnapshotFromDb();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error(
      "Erro ao consultar snapshot do ClickUp no MySQL:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao consultar dados do ClickUp.",
      },
      { status: 500 }
    );
  }
}
