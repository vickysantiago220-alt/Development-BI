import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cachePath = path.join(
      process.cwd(),
      "data",
      "clickup-cache.json"
    );

    if (!fs.existsSync(cachePath)) {
      return NextResponse.json(
        {
          success: false,
          error: "Cache do ClickUp não encontrado.",
        },
        { status: 404 }
      );
    }

    const cache = fs.readFileSync(
      cachePath,
      "utf8"
    );

    if (!cache.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Cache do ClickUp está vazio.",
        },
        { status: 404 }
      );
    }

    const data = JSON.parse(cache);

    return NextResponse.json(data);
  } catch (error) {
    console.error(
      "Erro ao ler cache do ClickUp:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao ler cache do ClickUp.",
      },
      { status: 500 }
    );
  }
}
