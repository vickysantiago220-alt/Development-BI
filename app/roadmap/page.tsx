"use client";

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FolderKanban,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Task = {
  id: string;
  name: string;
  project?: {
    id?: string;
    name?: string;
  };
  list?: {
    id?: string;
    name?: string;
  };
  status?: {
    name?: string;
    type?: string;
  };
  dates?: {
    dueDate?: string | null;
  };
};

type ProjectRoadmap = {
  name: string;
  status: string;
  weeks: string[];
};

type MilestoneData = {
  project: string;
  demand: string;
  date: string;
  status: string;
};

const weeks = [
  {
    label: "07 — 13 SET",
    start: "2026-09-07",
    end: "2026-09-13",
  },
  {
    label: "14 — 20 SET",
    start: "2026-09-14",
    end: "2026-09-20",
  },
  {
    label: "21 — 27 SET",
    start: "2026-09-21",
    end: "2026-09-27",
  },
  {
    label: "28 SET — 04 OUT",
    start: "2026-09-28",
    end: "2026-10-04",
  },
];

const legend = [
  {
    label: "Em desenvolvimento",
    className: "bg-zinc-900",
  },
  {
    label: "Planejado",
    className: "bg-zinc-200",
  },
  {
    label: "Atenção",
    className: "bg-amber-400",
  },
  {
    label: "Concluído",
    className: "bg-emerald-500",
  },
];

function isDone(task: Task) {
  const statusName = String(task.status?.name || "").toLowerCase().trim();
  const statusType = String(task.status?.type || "").toLowerCase().trim();

  return (
    statusType === "done" ||
    statusType === "closed" ||
    [
      "closed",
      "complete",
      "completed",
      "concluído",
      "concluída",
      "concluidas",
      "concluídas",
      "histories",
      "história",
      "historia",
    ].includes(statusName)
  );
}

function isBlocked(task: Task) {
  const statusName = String(task.status?.name || "").toLowerCase().trim();

  return statusName === "blocked" || statusName === "bloqueado";
}

function isDevelopment(task: Task) {
  const statusName = String(task.status?.name || "").toLowerCase().trim();

  return ![
    "open",
    "pending/bug",
    "pending/melhoria",
    "blocked",
    "bloqueado",
  ].includes(statusName) && !isDone(task);
}

function isReview(task: Task) {
  const statusName = String(task.status?.name || "").toLowerCase().trim();

  return [
    "in review",
    "qa bug",
    "qa melhoria",
    "homologação",
    "homologacao",
  ].includes(statusName);
}

function isOverdue(task: Task) {
  if (isDone(task) || !task.dates?.dueDate) {
    return false;
  }

  const dueDate = new Date(task.dates.dueDate);

  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return dueDate < today;
}

function getProject(task: Task) {
  const project = String(task.project?.name || "").trim();
  const list = String(task.list?.name || "").trim();

  if (!project || project.toLowerCase() === "hidden") {
    return list || "Sem projeto";
  }

  return project;
}

function parseDueDate(task: Task) {
  if (!task.dates?.dueDate) {
    return null;
  }

  const date = new Date(task.dates.dueDate);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getWeekIndex(task: Task) {
  const dueDate = parseDueDate(task);

  if (!dueDate) {
    return -1;
  }

  const dateOnly = new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate()
  );

  for (let index = 0; index < weeks.length; index += 1) {
    const start = new Date(`${weeks[index].start}T00:00:00`);
    const end = new Date(`${weeks[index].end}T23:59:59`);

    if (dateOnly >= start && dateOnly <= end) {
      return index;
    }
  }

  return -1;
}

function getCellStatus(tasks: Task[]) {
  if (tasks.length === 0) {
    return "empty";
  }

  if (tasks.some(isOverdue) || tasks.some(isBlocked)) {
    return "attention";
  }

  if (tasks.every(isDone)) {
    return "completed";
  }

  if (tasks.some(isDevelopment) || tasks.some(isReview)) {
    return "development";
  }

  return "planned";
}

function getProjectStatus(tasks: Task[]) {
  const activeTasks = tasks.filter((task) => !isDone(task));

  if (activeTasks.length === 0) {
    return "Concluído";
  }

  if (activeTasks.some(isOverdue) || activeTasks.some(isBlocked)) {
    return "Atenção";
  }

  if (activeTasks.some(isDevelopment) || activeTasks.some(isReview)) {
    return "Em desenvolvimento";
  }

  return "Planejado";
}

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export default function RoadmapPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRoadmap() {
      try {
        const response = await fetch("/api/clickup/cache", {
          cache: "no-store",
        });

        const data = await response.json();

        if (data.success && Array.isArray(data.tasks)) {
          setTasks(data.tasks);
        }
      } catch (error) {
        console.error("Erro ao carregar roadmap:", error);
      } finally {
        setLoading(false);
      }
    }

    loadRoadmap();
  }, []);

  const projects = useMemo<ProjectRoadmap[]>(() => {
    const grouped = new Map<string, Task[]>();

    for (const task of tasks) {
      const project = getProject(task);

      if (!grouped.has(project)) {
        grouped.set(project, []);
      }

      grouped.get(project)!.push(task);
    }

    return Array.from(grouped.entries())
      .map(([name, projectTasks]) => {
        const weekStatuses = weeks.map((_, weekIndex) => {
          const weekTasks = projectTasks.filter(
            (task) => getWeekIndex(task) === weekIndex
          );

          return getCellStatus(weekTasks);
        });

        return {
          name,
          status: getProjectStatus(projectTasks),
          weeks: weekStatuses,
        };
      })
      .filter((project) =>
        project.weeks.some((status) => status !== "empty")
      )
      .sort((a, b) => {
        const aAttention = a.weeks.includes("attention");
        const bAttention = b.weeks.includes("attention");

        if (aAttention !== bAttention) {
          return aAttention ? -1 : 1;
        }

        return a.name.localeCompare(b.name);
      });
  }, [tasks]);

  const milestones = useMemo<MilestoneData[]>(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return tasks
      .map((task) => {
        const dueDate = parseDueDate(task);

        if (!dueDate) {
          return null;
        }

        const dueDateOnly = new Date(
          dueDate.getFullYear(),
          dueDate.getMonth(),
          dueDate.getDate()
        );

        if (dueDateOnly < now || isDone(task)) {
          return null;
        }

        let status = "Normal";

        if (isOverdue(task) || isBlocked(task)) {
          status = "Alta";
        } else if (isDevelopment(task) || isReview(task)) {
          status = "Normal";
        }

        return {
          project: getProject(task),
          demand: task.name || "Demanda sem nome",
          date: formatDate(dueDate),
          status,
          dueDate: dueDateOnly,
        };
      })
      .filter(
        (
          item
        ): item is MilestoneData & { dueDate: Date } => item !== null
      )
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 6)
      .map(({ project, demand, date, status }) => ({
        project,
        demand,
        date,
        status,
      }));
  }, [tasks]);

  const roadmapProjects = projects.length;

  const developmentProjects = projects.filter(
    (project) => project.status === "Em desenvolvimento"
  ).length;

  const attentionProjects = projects.filter(
    (project) => project.status === "Atenção"
  ).length;

  const completedProjects = projects.filter(
    (project) => project.status === "Concluído"
  ).length;

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <header className="border-b border-zinc-200 bg-white px-5 py-6 lg:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
              Gestão
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Roadmap
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Visualize a evolução dos projetos ao longo das próximas semanas.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm">
            <CalendarDays className="h-4 w-4 text-zinc-500" />
            Setembro — Outubro
          </div>
        </div>
      </header>

      <div className="space-y-6 p-5 lg:p-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            title="Projetos no roadmap"
            value={
              loading
                ? "—"
                : roadmapProjects.toLocaleString("pt-BR")
            }
            description="projetos com entregas no período"
            icon={<FolderKanban className="h-4 w-4" />}
          />

          <Metric
            title="Em desenvolvimento"
            value={
              loading
                ? "—"
                : developmentProjects.toLocaleString("pt-BR")
            }
            description="projetos em execução"
            icon={<Clock3 className="h-4 w-4" />}
          />

          <Metric
            title="Em atenção"
            value={
              loading
                ? "—"
                : attentionProjects.toLocaleString("pt-BR")
            }
            description="com atrasos ou bloqueios"
            icon={<AlertTriangle className="h-4 w-4" />}
          />

          <Metric
            title="Concluídos"
            value={
              loading
                ? "—"
                : completedProjects.toLocaleString("pt-BR")
            }
            description="projetos sem demandas ativas"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
        </section>

        <section className="flex flex-wrap items-center gap-5 rounded-2xl border border-zinc-200 bg-white px-6 py-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Legenda
          </span>

          {legend.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 text-xs text-zinc-600"
            >
              <span
                className={`h-3 w-3 rounded-sm ${item.className}`}
              />

              {item.label}
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 p-6">
            <h2 className="font-semibold">Roadmap de projetos</h2>

            <p className="mt-1 text-sm text-zinc-500">
              Planejamento visual baseado nos prazos das demandas do ClickUp
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-zinc-500">
              Carregando roadmap...
            </div>
          ) : projects.length === 0 ? (
            <div className="p-10 text-center text-sm text-zinc-500">
              Nenhuma demanda com prazo encontrado no período.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[1050px]">
                <div className="grid grid-cols-[280px_repeat(4,1fr)] border-b border-zinc-200 bg-zinc-50/70">
                  <div className="px-6 py-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Projeto
                    </span>
                  </div>

                  {weeks.map((week) => (
                    <div
                      key={week.label}
                      className="border-l border-zinc-200 px-4 py-4 text-center"
                    >
                      <span className="text-xs font-semibold text-zinc-600">
                        {week.label}
                      </span>
                    </div>
                  ))}
                </div>

                {projects.map((project) => (
                  <div
                    key={project.name}
                    className="grid grid-cols-[280px_repeat(4,1fr)] border-b border-zinc-100 last:border-b-0"
                  >
                    <div className="flex items-center gap-3 px-6 py-5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
                        <FolderKanban className="h-4 w-4 text-zinc-600" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {project.name}
                        </p>

                        <p className="mt-1 text-xs text-zinc-400">
                          {project.status}
                        </p>
                      </div>
                    </div>

                    {project.weeks.map((status, index) => (
                      <RoadmapCell
                        key={`${project.name}-${index}`}
                        status={status}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 p-6">
            <h2 className="font-semibold">Próximos marcos</h2>

            <p className="mt-1 text-sm text-zinc-500">
              Principais demandas com prazo futuro
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-zinc-500">
              Carregando marcos...
            </div>
          ) : milestones.length === 0 ? (
            <div className="p-10 text-center text-sm text-zinc-500">
              Nenhuma entrega futura encontrada.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {milestones.map((milestone, index) => (
                <Milestone
                  key={`${milestone.project}-${milestone.demand}-${index}`}
                  project={milestone.project}
                  demand={milestone.demand}
                  date={milestone.date}
                  status={milestone.status}
                />
              ))}
            </div>
          )}
        </section>

        <div className="border-t border-zinc-200 pt-5 text-xs text-zinc-400">
          Dados sincronizados a partir do ClickUp. O roadmap utiliza os prazos
          reais das demandas para organizar as entregas por semana.
        </div>
      </div>
    </div>
  );
}

function Metric({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{title}</p>

        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-3xl font-semibold tracking-tight">
        {value}
      </p>

      <p className="mt-1 text-xs text-zinc-400">{description}</p>
    </div>
  );
}

function RoadmapCell({ status }: { status: string }) {
  if (status === "empty") {
    return (
      <div className="border-l border-zinc-100 p-3">
        <div className="h-12 rounded-lg bg-zinc-50" />
      </div>
    );
  }

  const styles: Record<string, string> = {
    development: "bg-zinc-900",
    planned: "bg-zinc-200",
    attention: "bg-amber-400",
    completed: "bg-emerald-500",
  };

  return (
    <div className="border-l border-zinc-100 p-3">
      <div
        className={`flex h-12 items-center justify-center rounded-lg ${
          styles[status] || "bg-zinc-100"
        }`}
      >
        {status === "completed" && (
          <CheckCircle2 className="h-4 w-4 text-white" />
        )}

        {status === "attention" && (
          <AlertTriangle className="h-4 w-4 text-zinc-900" />
        )}
      </div>
    </div>
  );
}

function Milestone({
  project,
  demand,
  date,
  status,
}: {
  project: string;
  demand: string;
  date: string;
  status: string;
}) {
  return (
    <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
          <CalendarDays className="h-4 w-4 text-zinc-600" />
        </div>

        <div>
          <p className="text-sm font-semibold">{demand}</p>

          <p className="mt-1 text-xs text-zinc-500">{project}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 pl-14 sm:pl-0">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            status === "Alta"
              ? "bg-amber-50 text-amber-700"
              : "bg-zinc-100 text-zinc-600"
          }`}
        >
          {status}
        </span>

        <span className="text-sm font-semibold text-zinc-700">
          {date}
        </span>
      </div>
    </div>
  );
}




