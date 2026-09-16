import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(
          CASE
            WHEN LOWER(status) IN ('closed', 'completed')
            THEN 1 ELSE 0
          END
        ) AS completed,
        SUM(
          CASE
            WHEN LOWER(status) = 'blocked'
            THEN 1 ELSE 0
          END
        ) AS blocked,
        SUM(
          CASE
            WHEN date_due IS NOT NULL
              AND date_due < NOW()
              AND LOWER(status) NOT IN ('closed', 'completed')
            THEN 1 ELSE 0
          END
        ) AS overdue
      FROM bi_clickup_tasks
    `);

    const [projects] = await db.query(`
      SELECT COUNT(*) AS total
      FROM bi_clickup_projects
    `);

    const summary = (rows as any[])[0];
    const projectSummary = (projects as any[])[0];

    return NextResponse.json({
      success: true,
      projects: Number(projectSummary?.total || 0),
      tasks: Number(summary?.total || 0),
      completed: Number(summary?.completed || 0),
      blocked: Number(summary?.blocked || 0),
      overdue: Number(summary?.overdue || 0),
    });
  } catch (error) {
    console.error("Erro ao consultar resumo do ClickUp:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao consultar resumo do ClickUp.",
      },
      { status: 500 }
    );
  }
}
