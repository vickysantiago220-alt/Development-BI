import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const historyDir = path.join(process.cwd(), "data", "history");

export async function GET() {
  try {
    if (!fs.existsSync(historyDir)) {
      return NextResponse.json({
        success: true,
        snapshots: [],
      });
    }

    const files = fs
      .readdirSync(historyDir)
      .filter((file) => file.endsWith(".json"))
      .sort()
      .reverse();

    const snapshots = files.map((file) => {
      const filePath = path.join(historyDir, file);
      const snapshot = JSON.parse(fs.readFileSync(filePath, "utf-8"));

      return {
        file,
        timestamp: snapshot.timestamp,
        createdAt: snapshot.createdAt,
        statistics: snapshot.statistics ?? {},
        tasks: snapshot.tasks ?? [],
          activeDevelopers: (() => {
            const people = new Set<string>();
            for (const task of snapshot.tasks ?? []) {
              const statusName = String(task.status?.name || "").toLowerCase().trim();
              const statusType = String(task.status?.type || "").toLowerCase().trim();
              const done = statusType === "done" || statusType === "closed" || ["closed","complete","completed","histories","história","historia","concluido","concluida","concluidas","concluídas"].includes(statusName);
              if (done) continue;
              for (const person of task.responsible ?? []) {
                const identifier = person.id || person.email || person.name;
                if (identifier) people.add(identifier);
              }
            }
            return people.size;
          })(),
        statusCounts: snapshot.statusCounts ?? {},
      };
    });

    return NextResponse.json({
      success: true,
      snapshots,
    });
  } catch (error) {
    console.error("Erro ao consultar histórico:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Não foi possível consultar o histórico.",
      },
      { status: 500 }
    );
  }
}




