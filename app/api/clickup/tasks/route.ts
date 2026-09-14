import { NextResponse } from "next/server";

import { persistClickUpSnapshot } from "@/lib/clickup-db";
import fs from "fs";
import path from "path";

const SPACE_ID = "90070405062";

type ClickUpTask = {
  id: string;
  name: string;
  text_content?: string;
  description?: string;
  creator?: {
    id: number;
    username: string;
    email?: string;
  };
  status?: {
    status?: string;
    color?: string;
    type?: string;
  };
  priority?: {
    priority?: string;
    color?: string;
  } | null;
  due_date?: string | null;
  start_date?: string | null;
  date_created?: string;
  date_updated?: string;
  date_done?: string | null;
  date_closed?: string | null;
  time_estimate?: number | null;
  time_spent?: number | null;
  assignees?: Array<{
    id: string;
    username: string;
    email?: string;
    initials?: string;
    profilePicture?: string | null;
  }>;
  list?: {
    id?: string;
    name?: string;
    color?: string;
    colorStatus?: string;
  };
  folder?: {
    id?: string;
    name?: string;
    hidden?: boolean;
  };
  project?: {
    id?: string;
    name?: string;
    hidden?: boolean;
  };
  tags?: Array<{
    name?: string;
  }>;
};

type ClickUpList = {
  id: string;
  name: string;
  color?: string | null;
  colorStatus?: string | null;
  status?: {
    status?: string;
    color?: string;
    hide_label?: boolean;
  } | null;
  folder?: {
    id?: string;
    name?: string;
    hidden?: boolean;
  };
};

async function clickupGet(url: string, token: string) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: token,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const text = await response.text();

  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `ClickUp retornou resposta inválida. HTTP ${response.status}. URL: ${url}`
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.err ||
        data?.ECODE ||
        `Erro ClickUp HTTP ${response.status}`
    );
  }

  return data;
}

async function getListsFromSpace(
  token: string
): Promise<ClickUpList[]> {
  const lists: ClickUpList[] = [];

  const folderless = await clickupGet(
    `https://api.clickup.com/api/v2/space/${SPACE_ID}/list`,
    token
  );

  if (Array.isArray(folderless?.lists)) {
    lists.push(
      ...folderless.lists.map((list: any) => ({
        id: list.id,
        name: list.name,
        color: list.color || null,
        colorStatus: list.colorStatus || null,
        folder: null,
      }))
    );
  }

  const foldersResponse = await clickupGet(
    `https://api.clickup.com/api/v2/space/${SPACE_ID}/folder`,
    token
  );

  const folders = Array.isArray(foldersResponse?.folders)
    ? foldersResponse.folders
    : [];

  for (const folder of folders) {
    try {
      const folderLists = await clickupGet(
        `https://api.clickup.com/api/v2/folder/${folder.id}/list`,
        token
      );

      if (Array.isArray(folderLists?.lists)) {
        lists.push(
          ...folderLists.lists.map((list: any) => ({
            id: list.id,
            name: list.name,
            color: list.color || null,
            colorStatus: list.colorStatus || null,
            folder: {
              id: folder.id,
              name: folder.name,
            },
          }))
        );
      }
    } catch (error) {
      console.error(
        `Erro ao buscar listas da pasta ${folder.name}:`,
        error
      );
    }
  }

  return lists;
}

async function getTasksFromList(
  listId: string,
  token: string
): Promise<ClickUpTask[]> {
  const tasks: ClickUpTask[] = [];

  let page = 0;
  let attempts = 0;

  while (true) {
    try {
      const data = await clickupGet(
        `https://api.clickup.com/api/v2/list/${listId}/task?page=${page}&include_closed=true&subtasks=true&include_timl=true`,
        token
      );

      const pageTasks = Array.isArray(data?.tasks)
        ? data.tasks
        : [];

      tasks.push(...pageTasks);

      attempts = 0;

      if (pageTasks.length < 100) {
        break;
      }

      page++;

      if (page >= 50) {
        break;
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      if (
        message.toLowerCase().includes("rate limit") &&
        attempts < 5
      ) {
        attempts++;

        const waitTime =
          attempts === 1
            ? 5000
            : attempts === 2
              ? 10000
              : attempts === 3
                ? 15000
                : attempts === 4
                  ? 20000
                  : 30000;

        console.warn(
          `Rate limit do ClickUp. Tentativa ${attempts}/5. Aguardando ${waitTime / 1000}s...`
        );

        await new Promise((resolve) =>
          setTimeout(resolve, waitTime)
        );

        continue;
      }

      throw error;
    }
  }

  return tasks;
}

function formatDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(Number(value));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function formatHours(value?: number | null) {
  if (!value || value <= 0) {
    return null;
  }

  return Math.round((value / 3600000) * 100) / 100;
}

async function enrichListColors(
  token: string,
  lists: ClickUpList[]
): Promise<ClickUpList[]> {
  const enriched: ClickUpList[] = [];
  const CONCURRENCY = 2;

  for (let i = 0; i < lists.length; i += CONCURRENCY) {
    const batch = lists.slice(i, i + CONCURRENCY);

    const results = await Promise.all(
      batch.map(async (list) => {
        try {
          const detail = await clickupGet(
            `https://api.clickup.com/api/v2/list/${list.id}`,
            token
          );

          return {
            ...list,
            color: detail?.status?.color || null,
            colorStatus: detail?.status?.status || null,
          };
        } catch (error) {
          console.warn(
            `Não foi possível obter a cor da lista ${list.name} (${list.id}).`
          );

          return list;
        }
      })
    );

    enriched.push(...results);
  }

  return enriched;
}
function normalizeTask(task: ClickUpTask, listMeta?: ClickUpList) {
  return {
    id: task.id,

    name: task.name,

    description:
      task.text_content ||
      task.description ||
      "",

    creator: task.creator
      ? {
          id: task.creator.id,
          name: task.creator.username,
          email: task.creator.email || null,
        }
      : null,

    project: {
      id:
        task.folder?.id ||
        task.project?.id ||
        task.list?.id ||
        null,

      name:
        task.folder?.name ||
        (task.project?.name &&
        task.project.name !== "hidden"
          ? task.project.name
          : null) ||
        task.list?.name ||
        "Sem projeto",
    },

    list: {
      id: task.list?.id || null,
      name: task.list?.name || null,
      color: listMeta?.color || task.list?.color || null,
      colorStatus: listMeta?.colorStatus || task.list?.colorStatus || null,
    },

    status: {
      name:
        task.status?.status ||
        "Sem status",

      color:
        task.status?.color ||
        null,

      type:
        task.status?.type ||
        null,
    },

    priority: {
      name:
        task.priority?.priority ||
        "Normal",

      color:
        task.priority?.color ||
        null,
    },

    responsible:
      task.assignees?.map((person) => ({
        id: person.id,
        name: person.username,
        email: person.email || null,
        initials: person.initials || null,
        profilePicture:
          person.profilePicture || null,
      })) || [],

    dates: {
      createdAt: formatDate(task.date_created),
      updatedAt: formatDate(task.date_updated),
      dateDone: formatDate(task.date_done),
      dateClosed: formatDate(task.date_closed),
      startDate: formatDate(task.start_date),
      dueDate: formatDate(task.due_date),
    },

    hours: {
      estimated:
        formatHours(task.time_estimate),

      tracked:
        formatHours(task.time_spent),
    },

    tags:
      task.tags
        ?.map((tag) => tag.name)
        .filter(Boolean) || [],
  };
}

export async function GET() {
  const token = process.env.CLICKUP_API_TOKEN;

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: "CLICKUP_API_TOKEN não configurado.",
      },
      { status: 500 }
    );
  }

  try {
    console.log("Iniciando sincronização ClickUp...");

    const lists = await getListsFromSpace(token);
    const enrichedLists = await enrichListColors(token, lists);

    console.log(`Lists encontradas: ${lists.length}`);

    const allTasks: ClickUpTask[] = [];

    const CONCURRENCY = 2;

    for (let i = 0; i < lists.length; i += CONCURRENCY) {
      const batch = lists.slice(i, i + CONCURRENCY);

      const results = await Promise.all(
        batch.map(async (list) => {
          try {
            const tasks = await getTasksFromList(list.id, token);

            console.log(`${list.name}: ${tasks.length} tarefas`);

            return tasks;
          } catch (error) {
            console.error(
              `Erro na List ${list.name}:`,
              error
            );

            throw new Error(
              `Falha ao sincronizar a lista "${list.name}": ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        })
      );

      results.forEach((tasks) => {
        allTasks.push(...tasks);
      });
    }

    const listMetaById = new Map(
      enrichedLists.map((list) => [list.id, list])
    );

    const normalizedTasks = allTasks.map((task) =>
      normalizeTask(task, listMetaById.get(task.list?.id || ""))
    );

    const developers = new Map();

    normalizedTasks.forEach((task) => {
      task.responsible.forEach((person) => {
        developers.set(person.id, person);
      });
    });

    const projects = new Map();

    normalizedTasks.forEach((task) => {
      if (task.project.id) {
        projects.set(task.project.id, task.project);
      }
    });

    const statusCounts: Record<string, number> = {};

    normalizedTasks.forEach((task) => {
      statusCounts[task.status.name] =
        (statusCounts[task.status.name] || 0) + 1;
    });

    const priorityCounts: Record<string, number> = {};

    normalizedTasks.forEach((task) => {
      priorityCounts[task.priority.name] =
        (priorityCounts[task.priority.name] || 0) + 1;
    });

    const responseData = {
      success: true,

      source: "ClickUp",

      workspace: {
        id:
          process.env.CLICKUP_WORKSPACE_ID ||
          "9007168562",
      },

      space: {
        id: SPACE_ID,
        name: "Projetos Desenvolvimento",
      },

      statistics: {
        totalTasks: normalizedTasks.length,
        lists: lists.length,
        developers: developers.size,
        projects: projects.size,

        withDueDate: normalizedTasks.filter(
          (task) => task.dates.dueDate
        ).length,

        withEstimate: normalizedTasks.filter(
          (task) => task.hours.estimated !== null
        ).length,

        withTrackedTime: normalizedTasks.filter(
          (task) => task.hours.tracked !== null
        ).length,

        statusCounts,
        priorityCounts,
      },

      lists: enrichedLists.map((list) => ({
        id: list.id,
        name: list.name,
        color: list.color || null,
        colorStatus: list.colorStatus || null,
        folder: list.folder || null,
      })),

      projects: Array.from(projects.values()),

      developers: Array.from(developers.values()),

      tasks: normalizedTasks,
    };

    await persistClickUpSnapshot({
      projects: Array.from(projects.values()),
      tasks: normalizedTasks,
    });

    console.log("Snapshot ClickUp persistido no MySQL com sucesso.");
    const cachePath = path.join(
      process.cwd(),
      "data",
      "clickup-cache.json"
    );

    fs.writeFileSync(
      cachePath,
      JSON.stringify(responseData, null, 2),
      "utf8"
    );

    console.log("Cache ClickUp atualizado com sucesso.");

    // Cria snapshot histórico somente após o cache
    // ter sido salvo com sucesso.
    const historyDir = path.join(
      process.cwd(),
      "data",
      "history"
    );

    fs.mkdirSync(historyDir, { recursive: true });

    const now = new Date();
    const timestamp = now.toISOString();

    const fileName = `${timestamp.replace(
      /[:.]/g,
      "-"
    )}.json`;

    const snapshot = {
      timestamp,
      createdAt: timestamp,
      source: "ClickUp",
      statistics: responseData.statistics,
      statusCounts: responseData.statistics.statusCounts,
      tasks: responseData.tasks,
    };

    const historyPath = path.join(
      historyDir,
      fileName
    );

    fs.writeFileSync(
      historyPath,
      JSON.stringify(snapshot, null, 2),
      "utf8"
    );

    console.log(
      `Snapshot histórico criado: ${fileName}`
    );

    return NextResponse.json({
      ...responseData,
      history: {
        created: true,
        file: fileName,
        timestamp,
      },
    });
  } catch (error) {
    console.error(
      "ClickUp integration error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro desconhecido na integração com o ClickUp.",
      },
      { status: 500 }
    );
  }
}















