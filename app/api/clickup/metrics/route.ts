import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json(
        {
          success: false,
          error: "Informe start e end.",
        },
        { status: 400 }
      );
    }

    const [rows] = await db.query(
      `
      SELECT
        SUM(
          CASE
            WHEN LOWER(status) NOT IN ('closed', 'completed')
             AND (
               (date_created >= ? AND date_created <= ?)
               OR
               (date_due >= ? AND date_due <= ?)
             )
            THEN 1 ELSE 0
          END
        ) AS active,

        SUM(
          CASE
            WHEN date_created >= ?
             AND date_created <= ?
            THEN 1 ELSE 0
          END
        ) AS created,

        SUM(
          CASE
            WHEN LOWER(status) IN ('closed', 'completed')
             AND date_done >= ?
             AND date_done <= ?
            THEN 1 ELSE 0
          END
        ) AS completed,

        SUM(
          CASE
            WHEN (
              LOWER(status) LIKE '%bug%'
              OR LOWER(status) LIKE '%qa bug%'
            )
            AND (
              (date_created >= ? AND date_created <= ?)
              OR
              (date_done >= ? AND date_done <= ?)
            )
            THEN 1 ELSE 0
          END
        ) AS bugs,

        SUM(
          CASE
            WHEN LOWER(status) = 'blocked'
             AND (
              (date_created >= ? AND date_created <= ?)
              OR
              (date_done >= ? AND date_done <= ?)
             )
            THEN 1 ELSE 0
          END
        ) AS blocked,

        SUM(
          CASE
            WHEN LOWER(status) NOT IN ('closed', 'completed')
             AND date_due IS NOT NULL
             AND date_due < NOW()
             AND (
               (date_created >= ? AND date_created <= ?)
               OR
               (date_due >= ? AND date_due <= ?)
             )
            THEN 1 ELSE 0
          END
        ) AS overdue

      FROM bi_clickup_tasks
      `,
      [
        start, end, start, end,
        start, end,
        start, end,
        start, end, start, end,
        start, end, start, end,
        start, end, start, end,
      ]
    );

    const [projects] = await db.query(
      `
      SELECT COUNT(DISTINCT project_clickup_id) AS active_projects
      FROM bi_clickup_tasks
      WHERE LOWER(status) NOT IN ('closed', 'completed')
        AND (
          (date_created >= ? AND date_created <= ?)
          OR
          (date_due >= ? AND date_due <= ?)
        )
      `,
      [start, end, start, end]
    );

    const summary = (rows as any[])[0];
    const projectSummary = (projects as any[])[0];

    return NextResponse.json({
      success: true,
      active: Number(summary?.active || 0),
      created: Number(summary?.created || 0),
      completed: Number(summary?.completed || 0),
      bugs: Number(summary?.bugs || 0),
      blocked: Number(summary?.blocked || 0),
      overdue: Number(summary?.overdue || 0),
      activeProjects: Number(projectSummary?.active_projects || 0),
    });
  } catch (error) {
    console.error("Erro ao consultar indicadores do ClickUp:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao consultar indicadores do ClickUp.",
      },
      { status: 500 }
    );
  }
}
