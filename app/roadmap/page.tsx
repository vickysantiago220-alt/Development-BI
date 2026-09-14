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
    color?: string | null;
  };
  dates?: {
    startDate?: string | null;
    dueDate?: string | null;
  };
};

type ProjectRoadmap = {
  name: string;
  status: string;
  weeks: {
    status: string;
    color: string | null;
  }[];
  progress: number;
  totalTasks: number;
  completedTasks: number;
  dueDate: string | null;
  startDate: string | null;
  timelineStart: string | null;
  timelineEnd: string | null;
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

const legendSymbols: Record<string, string> = {
  OPEN: "●",
  HISTORIES: "●",
  "PENDING/BUG": "●",
  "PENDING/MELHORIA": "●",
  "EM PROGRESSO": "◐",
  "QA BUG": "⚠",
  "QA MELHORIA": "⚠",
  "QA REVIEW": "◉",
  "IN REVIEW": "◆",
  CLOSED: "✓",
};


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

function getWeekIndex(
  task: Task,
  roadmapWeeks: { start: string; end: string }[]
) {
  if (!task.dates?.dueDate) return -1;

  const dueDate = new Date(task.dates.dueDate);
  dueDate.setHours(0, 0, 0, 0);

  for (let index = 0; index < roadmapWeeks.length; index++) {
    const weekStart = new Date(roadmapWeeks[index].start);
    const weekEnd = new Date(roadmapWeeks[index].end);

    weekStart.setHours(0, 0, 0, 0);
    weekEnd.setHours(23, 59, 59, 999);

    if (dueDate >= weekStart && dueDate <= weekEnd) {
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
  const [periodo, setPeriodo] = useState("esta-semana");
  const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState("");
  const [dataFimPersonalizada, setDataFimPersonalizada] = useState("");

  const period = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayOfWeek = today.getDay();
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - daysSinceMonday);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const startOfNextWeek = new Date(startOfWeek);
    startOfNextWeek.setDate(startOfWeek.getDate() + 7);

    const endOfNextWeek = new Date(startOfNextWeek);
    endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
    endOfNextWeek.setHours(23, 59, 59, 999);

    let start = new Date(startOfWeek);
    let end = new Date(endOfWeek);

    if (periodo === "hoje") {
      start = new Date(today);
      end = new Date(today);
      end.setHours(23, 59, 59, 999);
    }

    if (periodo === "proxima-semana") {
      start = new Date(startOfNextWeek);
      end = new Date(endOfNextWeek);
    }

    if (periodo === "este-mes") {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    }

    if (periodo === "proximo-mes") {
      start = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      end = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      end.setHours(23, 59, 59, 999);
    }

    if (
      periodo === "personalizado" &&
      dataInicioPersonalizada &&
      dataFimPersonalizada
    ) {
      const customStart = new Date(
        `${dataInicioPersonalizada}T00:00:00`
      );
      const customEnd = new Date(
        `${dataFimPersonalizada}T23:59:59`
      );

      if (
        !Number.isNaN(customStart.getTime()) &&
        !Number.isNaN(customEnd.getTime()) &&
        customEnd >= customStart
      ) {
        start = customStart;
        end = customEnd;
      }
    }

    return {
      start,
      end,
    };
  }, [periodo, dataInicioPersonalizada, dataFimPersonalizada]);

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

  const legend = useMemo(() => {
    const statusMap = new Map<string, string>();

    for (const task of tasks) {
      const name = task.status?.name?.trim();

      if (!name) continue;

      if (!statusMap.has(name)) {
        statusMap.set(name, task.status?.color || "#B5B5B5");
      }
    }

    const entries = Array.from(statusMap.entries()).map(
      ([label, color]) => ({
        label,
        color,
        symbol:
          legendSymbols[label.toUpperCase()] ||
          (label.toLowerCase().includes("closed") ||
          label.toLowerCase().includes("conclu")
            ? "✓"
            : label.toLowerCase().includes("progress")
              ? "◐"
              : label.toLowerCase().includes("review")
                ? "◆"
                : label.toLowerCase().includes("qa")
                  ? "⚠"
                  : "●"),
      })
    );

    return entries.sort((a, b) =>
      a.label.localeCompare(b.label, "pt-BR")
    );
  }, [tasks]);
  const roadmapWeeks = useMemo(() => {
    const result: {
      label: string;
      start: string;
      end: string;
    }[] = [];

    const start = new Date(period.start);
    const end = new Date(period.end);

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const useDailyView =
      periodo === "hoje" ||
      periodo === "esta-semana" ||
      periodo === "proxima-semana";

    if (useDailyView) {
      const current = new Date(start);

      while (current <= end) {
        const dayStart = new Date(current);
        const dayEnd = new Date(current);

        dayStart.setHours(0, 0, 0, 0);
        dayEnd.setHours(23, 59, 59, 999);

        result.push({
          label: `${String(dayStart.getDate()).padStart(2, "0")} ${dayStart
            .toLocaleDateString("pt-BR", { month: "short" })
            .replace(".", "")
            .toUpperCase()}`,
          start: `${dayStart.getFullYear()}-${String(
            dayStart.getMonth() + 1
          ).padStart(2, "0")}-${String(dayStart.getDate()).padStart(2, "0")}`,
          end: `${dayEnd.getFullYear()}-${String(
            dayEnd.getMonth() + 1
          ).padStart(2, "0")}-${String(dayEnd.getDate()).padStart(2, "0")}`,
        });

        current.setDate(current.getDate() + 1);
      }

      return result;
    }

    const current = new Date(start);
    const dayOfWeek = current.getDay();
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    current.setDate(current.getDate() - daysSinceMonday);
    current.setHours(0, 0, 0, 0);

    while (current <= end) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);

      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const visibleStart =
        weekStart < start ? new Date(start) : weekStart;

      const visibleEnd =
        weekEnd > end ? new Date(end) : weekEnd;

      result.push({
        label: `${String(visibleStart.getDate()).padStart(2, "0")} — ${String(
          visibleEnd.getDate()
        ).padStart(2, "0")} ${visibleEnd
          .toLocaleDateString("pt-BR", { month: "short" })
          .replace(".", "")
          .toUpperCase()}`,
        start: `${visibleStart.getFullYear()}-${String(
          visibleStart.getMonth() + 1
        ).padStart(2, "0")}-${String(visibleStart.getDate()).padStart(2, "0")}`,
        end: `${visibleEnd.getFullYear()}-${String(
          visibleEnd.getMonth() + 1
        ).padStart(2, "0")}-${String(visibleEnd.getDate()).padStart(2, "0")}`,
      });

      current.setDate(current.getDate() + 7);
    }

    return result;
  }, [period, periodo]);

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
        const weekStatuses = roadmapWeeks.map((_, weekIndex) => {
          const weekTasks = projectTasks.filter(
            (task) => getWeekIndex(task, roadmapWeeks) === weekIndex
          );

          const status = getCellStatus(weekTasks);
          const color =
            weekTasks.find((task) => task.status?.color)?.status?.color || null;

          return {
            status,
            color,
          };
        });

        const totalTasks = projectTasks.length;
        const completedTasks = projectTasks.filter(isDone).length;
        const progress =
          totalTasks > 0
            ? Math.round((completedTasks / totalTasks) * 100)
            : 0;

        const dueDates = projectTasks
          .map((task) => parseDueDate(task))
          .filter((date): date is Date => Boolean(date))
          .sort((a, b) => a.getTime() - b.getTime());

        const dueDate =
          dueDates.length > 0
            ? dueDates[dueDates.length - 1].toISOString()
            : null;

        const startDates = projectTasks
          .map((task) => {
            const value = task.dates?.startDate;
            if (!value) return null;

            const date = new Date(value);
            return Number.isNaN(date.getTime()) ? null : date;
          })
          .filter((date): date is Date => Boolean(date))
          .sort((a, b) => a.getTime() - b.getTime());

        const periodDueDates = projectTasks
          .map((task) => parseDueDate(task))
          .filter((date): date is Date => {
            if (!date) return false;

            const periodStart = new Date(period.start);
            const periodEnd = new Date(period.end);

            periodStart.setHours(0, 0, 0, 0);
            periodEnd.setHours(23, 59, 59, 999);

            return date >= periodStart && date <= periodEnd;
          })
          .sort((a, b) => a.getTime() - b.getTime());

        const timelineStart =
          periodDueDates.length > 0
            ? periodDueDates[0].toISOString()
            : null;

        const timelineEnd =
          periodDueDates.length > 0
            ? periodDueDates[periodDueDates.length - 1].toISOString()
            : null;

        const startDate =
          startDates.length > 0
            ? startDates[0].toISOString()
            : dueDates.length > 0
              ? dueDates[0].toISOString()
              : null;

        return {
          name,
          status: getProjectStatus(projectTasks),
          weeks: weekStatuses,
          progress,
          totalTasks,
          completedTasks,
          dueDate,
          startDate,
          timelineStart,
          timelineEnd,
        };
      })
      .filter((project) =>
        project.weeks.some((week) => week.status !== "empty")
      )
      .sort((a, b) => {
        const aAttention = a.weeks.some((week) => week.status === "attention");
        const bAttention = b.weeks.some((week) => week.status === "attention");

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

  const completedProjects = useMemo(() => {
    const grouped = new Map<string, Task[]>();

    for (const task of tasks) {
      const project = getProject(task);

      if (project === "Sem projeto") {
        continue;
      }

      if (!grouped.has(project)) {
        grouped.set(project, []);
      }

      grouped.get(project)!.push(task);
    }

    return Array.from(grouped.values()).filter((projectTasks) => {
      if (projectTasks.length === 0) {
        return false;
      }

      const allCompleted = projectTasks.every(isDone);

      if (!allCompleted) {
        return false;
      }

      return projectTasks.some((task) => {
        const dueDate = parseDueDate(task);

        if (!dueDate) {
          return false;
        }

        const periodStart = new Date(period.start);
        const periodEnd = new Date(period.end);

        periodStart.setHours(0, 0, 0, 0);
        periodEnd.setHours(23, 59, 59, 999);

        return dueDate >= periodStart && dueDate <= periodEnd;
      });
    }).length;
  }, [tasks, period]);

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

          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 shadow-sm">
                <CalendarDays className="h-4 w-4 text-zinc-500" />

                <select
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                  className="bg-transparent text-sm font-medium text-zinc-700 outline-none"
                >
                  <option value="hoje">Hoje</option>
                  <option value="esta-semana">Esta semana</option>
                  <option value="proxima-semana">Próxima semana</option>
                  <option value="este-mes">Este mês</option>
                  <option value="proximo-mes">Próximo mês</option>
                  <option value="personalizado">Personalizado</option>
                </select>
              </div>

              {periodo === "personalizado" && (
                <>
                  <input
                    type="date"
                    value={dataInicioPersonalizada}
                    onChange={(e) => setDataInicioPersonalizada(e.target.value)}
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none focus:border-zinc-400"
                  />

                  <span className="text-sm text-zinc-400">até</span>

                  <input
                    type="date"
                    value={dataFimPersonalizada}
                    onChange={(e) => setDataFimPersonalizada(e.target.value)}
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none focus:border-zinc-400"
                  />
                </>
              )}
            </div>

            <p className="text-sm text-zinc-500">
              {formatDate(period.start)} – {formatDate(period.end)}
            </p>
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
            description="com 100% das demandas concluídas"
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
                className="flex h-5 w-5 items-center justify-center text-sm font-semibold"
                style={{ color: item.color }}
              >
                {item.symbol}
              </span>

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
                <div className="grid border-b border-zinc-200 bg-zinc-50/70" style={{ gridTemplateColumns: `280px repeat(${roadmapWeeks.length}, minmax(120px, 1fr))` }}>
                  <div className="px-6 py-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Projeto
                    </span>
                  </div>

                  {roadmapWeeks.map((week) => (
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
                    className="grid border-b border-zinc-100 last:border-b-0" style={{ gridTemplateColumns: `280px repeat(${roadmapWeeks.length}, minmax(120px, 1fr))` }}
                  >
                    <div className="px-6 py-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                          <FolderKanban className="h-4 w-4 text-zinc-600" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {project.name}
                          </p>

                          <p className="mt-1 text-xs font-medium text-zinc-500">
                            {project.status}
                          </p>

                          <div className="mt-3 flex items-center gap-3">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                              <div
                                className="h-full rounded-full bg-zinc-900"
                                style={{ width: `${project.progress}%` }}
                              />
                            </div>

                            <span className="shrink-0 text-xs font-semibold text-zinc-600">
                              {project.progress}%
                            </span>
                          </div>

                          <p className="mt-1.5 text-[11px] text-zinc-400">
                            {project.completedTasks} de {project.totalTasks} demandas concluídas
                            {project.dueDate
                              ? ` · prazo ${new Date(project.dueDate).toLocaleDateString("pt-BR")}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      className="relative border-l border-zinc-100 px-4 py-6"
                      style={{
                        gridColumn: `span ${roadmapWeeks.length} / span ${roadmapWeeks.length}`,
                      }}
                    >
                      <div className="relative h-10 overflow-hidden rounded-lg bg-zinc-50">
                        {roadmapWeeks.map((week) => (
                          <div
                            key={week.label}
                            className="absolute inset-y-0 border-l border-zinc-200/70"
                            style={{
                              left: `${
                                ((new Date(week.start).getTime() -
                                  new Date(period.start).getTime()) /
                                  (new Date(period.end).getTime() -
                                    new Date(period.start).getTime())) *
                                100
                              }%`,
                            }}
                          />
                        ))}

                        {(() => {
                          const position = getTimelinePosition(
                            project.timelineStart,
                            project.timelineEnd,
                            period.start.toISOString(),
                            period.end.toISOString()
                          );

                          if (!position) {
                            return (
                              <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-zinc-200" />
                            );
                          }

                          const projectColor =
                            [...project.weeks]
                              .reverse()
                              .find((week) => week.color)?.color ||
                            "#18181B";

                          const deliveryPosition = project.timelineEnd
                            ? getTimelinePosition(
                                project.timelineEnd,
                                project.timelineEnd,
                                period.start.toISOString(),
                                period.end.toISOString()
                              )
                            : null;

                          return (
                            <>
                              <div
                                className="absolute top-1/2 h-3 -translate-y-1/2"
                                style={{
                                  left: `${position.left}%`,
                                  width: `${position.width}%`,
                                }}
                              >
                                {project.weeks.map((week, index) => {
                                  if (week.status === "empty") return null;

                                  const segmentWidth = 100 / project.weeks.length;

                                  return (
                                    <div
                                      key={`${project.name}-${week.status}-${index}`}
                                      className="absolute top-0 h-3 shadow-sm first:rounded-l-full last:rounded-r-full"
                                      style={{
                                        left: `${index * segmentWidth}%`,
                                        width: `${segmentWidth}%`,
                                        backgroundColor:
                                          week.color || "#B5B5B5",
                                      }}
                                      title={`${week.status}`}
                                    />
                                  );
                                })}
                              </div>

                              {deliveryPosition && (
                                <div
                                  className="absolute top-1/2 z-10 h-5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-sm ring-2"
                                  style={{
                                    left: `${deliveryPosition.left}%`,
                                    outlineColor: projectColor,
                                  }}
                                  title={`Entrega: ${new Date(
                                    project.timelineEnd!
                                  ).toLocaleDateString("pt-BR")}`}
                                />
                              )}
                            </>
                          );
                        })()}
                      </div>

                      <div className="mt-2 flex justify-between text-[10px] text-zinc-400">
                        <span>
                          {project.timelineStart
                            ? new Date(project.timelineStart).toLocaleDateString(
                                "pt-BR"
                              )
                            : "Sem entrega no período"}
                        </span>

                        <span>
                          {project.timelineEnd
                            ? new Date(project.timelineEnd).toLocaleDateString(
                                "pt-BR"
                              )
                            : "Sem entrega no período"}
                        </span>
                      </div>
                    </div>
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

function getTimelinePosition(
  startDate: string | null,
  dueDate: string | null,
  periodStart: string,
  periodEnd: string
) {
  if (!startDate && !dueDate) {
    return null;
  }

  const start = new Date(startDate || dueDate!);
  const end = new Date(dueDate || startDate!);
  const rangeStart = new Date(periodStart);
  const rangeEnd = new Date(periodEnd);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    Number.isNaN(rangeStart.getTime()) ||
    Number.isNaN(rangeEnd.getTime())
  ) {
    return null;
  }

  const total = rangeEnd.getTime() - rangeStart.getTime();

  if (total <= 0) {
    return null;
  }

  const visibleStart = Math.max(start.getTime(), rangeStart.getTime());
  const visibleEnd = Math.min(end.getTime(), rangeEnd.getTime());

  if (visibleEnd < rangeStart.getTime() || visibleStart > rangeEnd.getTime()) {
    return null;
  }

  const left = ((visibleStart - rangeStart.getTime()) / total) * 100;
  const right = ((visibleEnd - rangeStart.getTime()) / total) * 100;
  const width = Math.max(right - left, 2);

  return {
    left: Math.max(0, Math.min(left, 100)),
    width: Math.min(width, 100),
  };
}
function RoadmapCell({
  status,
  color,
}: {
  status: string;
  color: string | null;
}) {
  if (status === "empty") {
    return (
      <div className="border-l border-zinc-100 px-3 py-4">
        <div className="h-2 rounded-full bg-zinc-100" />
      </div>
    );
  }

  const styles: Record<string, string> = {
    development: "#18181B",
    planned: "#D4D4D8",
    attention: "#F59E0B",
    completed: "#22C55E",
  };

  const backgroundColor = color || styles[status] || "#E4E4E7";

  return (
    <div className="border-l border-zinc-100 px-3 py-4">
      <div
        className="relative h-2 overflow-hidden rounded-full"
        style={{ backgroundColor }}
      >
        {status === "completed" && (
          <div className="absolute inset-y-0 right-0 w-1/3 bg-white/30" />
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



























































