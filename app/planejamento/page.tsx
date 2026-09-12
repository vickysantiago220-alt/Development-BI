"use client";

import { useEffect, useMemo, useState } from "react";
import { exportPlanningPdf, exportPlanningPptx } from "@/lib/export-planning";
import {
  AlertTriangle, CalendarDays, CheckCircle2, Clock3, FileDown, Presentation,
} from "lucide-react";

export default function PlanejamentoPage() {
  const [cacheData, setCacheData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"lista" | "calendario">("lista");
  const pageSize = 10;

  useEffect(() => {
    fetch("/api/clickup/cache", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Não foi possível carregar o cache do ClickUp.");
        }

        return response.json();
      })
      .then((data) => setCacheData(data))
      .catch((error) => {
        console.error("Erro ao carregar planejamento:", error);
      })
      .finally(() => setLoading(false));
  }, []);

  const tasks = Array.isArray(cacheData?.tasks)
    ? cacheData.tasks
    : [];

  const parseDate = (value: any) => {
    if (!value) return null;

    const text = String(value).trim();
    const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);

    if (br) {
      const date = new Date(
        Number(br[3]),
        Number(br[2]) - 1,
        Number(br[1])
      );

      return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(text);

    return Number.isNaN(date.getTime()) ? null : date;
  };

  const isDone = (task: any) => {
    const type = String(task.status?.type || "").toLowerCase();
    const name = String(task.status?.name || "").toLowerCase();

    const getCalendarSummary = (dayTasks: any[]) => {
    const developers = new Map<string, number>();
    const projects = new Map<string, number>();

    dayTasks.forEach((task: any) => {
      const responsibles = task.responsible?.length
        ? task.responsible
        : ["Sem responsável"];

      responsibles.forEach((name: string) => {
        developers.set(name, (developers.get(name) || 0) + 1);
      });

      const project =
        task.project?.name && task.project.name !== "hidden"
          ? task.project.name
          : task.list?.name || "Sem projeto";

      projects.set(project, (projects.get(project) || 0) + 1);
    });

    return {
      developers: Array.from(developers.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4),
      projects: Array.from(projects.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4),
      totalDevelopers: developers.size,
      totalProjects: projects.size,
    };
  };
  return (
      type === "closed" ||
      type === "done" ||
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
      ].includes(name)
    );
  };

  const getPriority = (task: any) => {
    const priority = String(
      task.priority?.name || ""
    )
      .trim()
      .toLowerCase();

    if (["urgent", "urgente"].includes(priority)) {
      return "Urgente";
    }

    if (["high", "alta"].includes(priority)) {
      return "Alta";
    }

    if (
      ["normal", "medium", "média", "media"].includes(priority)
    ) {
      return "Normal";
    }

    if (["low", "baixa"].includes(priority)) {
      return "Baixa";
    }

    return "Não definida";
  };

  const getProjectPriority = (task: any) => {
    const color = String(
      task.list?.color || ""
    ).trim().toLowerCase();

    const colorStatus = String(
      task.list?.colorStatus || ""
    ).trim().toLowerCase();

    if (
      color === "#d33d44" ||
      colorStatus === "red" ||
      colorStatus === "vermelho"
    ) {
      return "Alta";
    }

    if (
      color === "#f1c40f" ||
      colorStatus === "yellow" ||
      colorStatus === "amarelo"
    ) {
      return "Média";
    }

    if (
      color === "#008844" ||
      colorStatus === "green" ||
      colorStatus === "verde"
    ) {
      return "Baixa";
    }

    return "Não definida";
  };

  const getPlanningPriority = (
    projectPriority: string,
    demandPriority: string
  ) => {
    if (
      projectPriority === "Alta" &&
      demandPriority === "Alta"
    ) {
      return "Prioridade máxima";
    }

    if (
      projectPriority === "Alta" ||
      demandPriority === "Alta"
    ) {
      return "Alta atenção";
    }

    if (
      projectPriority === "Média" ||
      demandPriority === "Normal"
    ) {
      return "Planejar";
    }

    if (
      projectPriority === "Baixa" &&
      demandPriority === "Baixa"
    ) {
      return "Baixa prioridade";
    }

    return "Não definida";
  };
  const planning = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayOfWeek = today.getDay();
    const daysUntilNextMonday =
      dayOfWeek === 0 ? 1 : 8 - dayOfWeek;

    const nextWeekStart = new Date(today);
    nextWeekStart.setDate(
      today.getDate() + daysUntilNextMonday
    );

    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(
      nextWeekStart.getDate() + 6
    );
    nextWeekEnd.setHours(23, 59, 59, 999);

    const activeTasks = tasks.filter((task: any) => {
      if (isDone(task)) return false;

      const status = String(
        task.status?.name || ""
      )
        .trim()
        .toLowerCase();

      return [
        "pending/melhoria",
        "pending/bug",
        "open",
        "em progresso",
        "in progress",
      ].includes(status);
    });

    const weeklyTasks = activeTasks
      .map((task: any) => {
        const dueDate = parseDate(task.dates?.dueDate);
        const demandPriority = getPriority(task);
        const projectPriority = getProjectPriority(task);
        const planningPriority = getPlanningPriority(
          projectPriority,
          demandPriority
        );

        if (!dueDate) {
          return {
            ...task,
            dueDate: null,
            priority: demandPriority,
            projectPriority,
            planningPriority,
            planningStatus: "Sem prazo",
            responsible: (task.responsible || [])
              .map((person: any) => person.name)
              .filter(Boolean),
          };
        }

        const dueNextWeek =
          dueDate.getTime() >= nextWeekStart.getTime() &&
          dueDate.getTime() <= nextWeekEnd.getTime();

        if (!dueNextWeek) return null;

        return {
          ...task,
          dueDate,
          priority: demandPriority,
          projectPriority,
          planningPriority,
          responsible: (task.responsible || [])
            .map((person: any) => person.name)
            .filter(Boolean),
          planningStatus: "Planejada",
        };
      })
      .filter(Boolean);

    const developers = new Map<string, any>();

    weeklyTasks.forEach((task: any) => {
      if (!task.responsible?.length) {
        const key = "sem-responsavel";

        const current = developers.get(key) || {
          name: "Sem responsável",
          tasks: [],
        };

        current.tasks.push(task);
        developers.set(key, current);
        return;
      }

      task.responsible.forEach((name: string) => {
        const current = developers.get(name) || {
          name,
          tasks: [],
        };

        current.tasks.push(task);
        developers.set(name, current);
      });
    });

    return {
      nextWeekStart,
      nextWeekEnd,
      tasks: weeklyTasks,
      developers: Array.from(developers.values()).sort(
        (a, b) => b.tasks.length - a.tasks.length
      ),
    };
  }, [tasks]);

  const developerGroups = useMemo(() => {
    const developers = new Map<string, any>();

    planning.tasks
      .filter((task: any) => task.planningStatus !== "Sem prazo")
      .forEach((task: any) => {
        const responsible =
          Array.isArray(task.responsible) && task.responsible.length > 0
            ? task.responsible
            : ["Sem responsável"];

        responsible.forEach((name: any) => {
          const developerName =
            typeof name === "string"
              ? name.trim()
              : String(
                  name?.name ||
                  name?.username ||
                  name?.email ||
                  "Sem responsável"
                ).trim();

          if (!developers.has(developerName)) {
            developers.set(developerName, {
              name: developerName,
              tasks: [],
            });
          }

          developers.get(developerName).tasks.push(task);
        });
      });

    return Array.from(developers.values()).sort(
      (a, b) => b.tasks.length - a.tasks.length
    );
  }, [planning.tasks]);

  const totalPages = Math.max(
    1,
    Math.ceil(developerGroups.length / pageSize)
  );

  const paginatedDevelopers = developerGroups.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const calendarDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(planning.nextWeekStart);
      date.setDate(planning.nextWeekStart.getDate() + index);
      date.setHours(0, 0, 0, 0);

      const tasks = planning.tasks
        .filter((task: any) => {
          if (!task.dueDate) return false;

          const dueDate = new Date(task.dueDate);
          dueDate.setHours(0, 0, 0, 0);

          return dueDate.getTime() === date.getTime();
        })
        .sort(
          (a: any, b: any) =>
            String(a.planningPriority || "").localeCompare(
              String(b.planningPriority || "")
            )
        );

      return {
        date,
        tasks,
      };
    });
  }, [planning.tasks, planning.nextWeekStart]);
  const getDayLoad = (count: number) => {
    if (count === 0) {
      return {
        label: "Sem entregas",
        className: "bg-zinc-100 text-zinc-500",
      };
    }

    if (count >= 15) {
      return {
        label: "Alta concentração",
        className: "bg-red-100 text-red-700",
      };
    }

    if (count >= 8) {
      return {
        label: "Atenção",
        className: "bg-amber-100 text-amber-700",
      };
    }

    return {
      label: "Carga normal",
      className: "bg-emerald-100 text-emerald-700",
    };
  };
  const formatDate = (date: Date | null) =>
    date
      ? date.toLocaleDateString("pt-BR")
      : "Sem prazo";

  const statusStyle = (status: string) => {
    if (status === "Replanejar") {
      return "bg-red-100 text-red-700";
    }

    if (status === "Atenção") {
      return "bg-amber-100 text-amber-700";
    }

    if (status === "Sem prazo") {
      return "bg-zinc-100 text-zinc-600";
    }

    return "bg-zinc-100 text-zinc-700";
  };

  const getCalendarSummary = (dayTasks: any[]) => {
    const developers = new Map<string, number>();
    const projects = new Map<string, number>();

    dayTasks.forEach((task: any) => {
      const responsibles = task.responsible?.length
        ? task.responsible
        : ["Sem responsável"];

      responsibles.forEach((name: string) => {
        developers.set(name, (developers.get(name) || 0) + 1);
      });

      const project =
        task.project?.name && task.project.name !== "hidden"
          ? task.project.name
          : task.list?.name || "Sem projeto";

      projects.set(project, (projects.get(project) || 0) + 1);
    });

    return {
      developers: Array.from(developers.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4),
      projects: Array.from(projects.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4),
      totalDevelopers: developers.size,
      totalProjects: projects.size,
    };
  };
  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <header className="flex min-h-20 items-center justify-between border-b border-zinc-200 bg-white px-5 lg:px-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
            Gestão
          </p>

          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            Planejamento Semanal
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Organização das demandas por desenvolvedor para a próxima semana.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
{/*
  <button
    onClick={() => exportPlanningPdf(planning)}
    className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
  >
    <FileDown className="h-4 w-4" />
    PDF
  </button>

  <button
    onClick={() => exportPlanningPptx(planning)}
    className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
  >
    <Presentation className="h-4 w-4" />
    PPTX
  </button>
*/}


</div>
      </header>

      <main className="space-y-6 p-5 lg:p-8">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-zinc-600" />

                <h2 className="font-semibold">
                  Próxima semana
                </h2>
              </div>

              <p className="mt-1 text-sm text-zinc-500">
                {formatDate(planning.nextWeekStart)} –{" "}
                {formatDate(planning.nextWeekEnd)}
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Clock3 className="h-4 w-4" />
              Dados sincronizados do ClickUp
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Demandas planejadas
              </p>

              <p className="mt-1.5 text-2xl font-semibold tracking-tight">
                {planning.tasks.filter(
                  (task: any) =>
                    task.planningStatus !== "Sem prazo"
                ).length}
              </p>

              <p className="mt-0.5 text-[11px] text-zinc-500">
                Com prazo definido para a semana
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Desenvolvedores
              </p>

              <p className="mt-1.5 text-2xl font-semibold tracking-tight">
                {planning.developers.filter(
                  (developer: any) =>
                    developer.name !== "Sem responsável"
                ).length}
              </p>

              <p className="mt-0.5 text-[11px] text-zinc-500">
                Com demandas planejadas
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Projetos envolvidos
              </p>

              <p className="mt-1.5 text-2xl font-semibold tracking-tight">
                {
                  new Set(
                    planning.tasks
                      .filter(
                        (task: any) =>
                          task.planningStatus !== "Sem prazo"
                      )
                      .map(
                        (task: any) =>
                          task.project?.name &&
                          task.project.name !== "hidden"
                            ? task.project.name
                            : task.list?.name || "Sem projeto"
                      )
                  ).size
                }
              </p>

              <p className="mt-0.5 text-[11px] text-zinc-500">
                Com entregas previstas
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Sem responsável
              </p>

              <p className="mt-1.5 text-2xl font-semibold tracking-tight">
                {
                  planning.tasks.filter(
                    (task: any) =>
                      task.responsible.length === 0
                  ).length
                }
              </p>

              <p className="mt-0.5 text-[11px] text-zinc-500">
                Demandas que precisam de definição
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                {viewMode === "lista"
                  ? "Organização por desenvolvedor"
                  : "Calendário de entregas"}
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                {viewMode === "lista"
                  ? "Demandas previstas para a próxima semana."
                  : "Entregas organizadas por dia conforme o prazo definido no ClickUp."}
              </p>
            </div>

            <div className="flex w-fit rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
              <button
                onClick={() => setViewMode("lista")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  viewMode === "lista"
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                Lista
              </button>

              <button
                onClick={() => setViewMode("calendario")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  viewMode === "calendario"
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                Calendário
              </button>
            </div>
          </div>

          {viewMode === "calendario" ? (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-7">
              {calendarDays.map((day: any) => (
                <div
                  key={day.date.toISOString()}
                  className="min-h-[250px] rounded-xl border border-zinc-200 bg-white shadow-sm"
                >
                  <div className="border-b border-zinc-200 px-3 py-2.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                      {day.date.toLocaleDateString("pt-BR", {
                        weekday: "short",
                      })}
                    </p>

                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-base font-semibold text-zinc-900">
                        {day.date.toLocaleDateString("pt-BR", {
                          day: "2-digit",
                        })}
                      </p>

                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">
                        {day.tasks.length}
                      </span>
                    </div>

                    <div className="mt-2">
                      {(() => {
                        const load = getDayLoad(day.tasks.length);

                        return (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${load.className}`}
                          >
                            {load.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="space-y-1.5 p-2">
                    {day.tasks.length === 0 ? (
                      <p className="py-8 text-center text-xs text-zinc-400">
                        Sem entregas
                      </p>
                    ) : (
                      (() => {
                        const projects = new Map<string, { count: number; developers: string[]; priority: string }>();

                        day.tasks.forEach((task: any) => {
                          const project =
                            task.project?.name && task.project.name !== "hidden"
                              ? task.project.name
                              : task.list?.name || "Sem projeto";

                          if (!projects.has(project)) {
                            projects.set(project, { count: 0, developers: [], priority: task.projectPriority || "Não definida" });
                          }

                          const item = projects.get(project)!;
                          item.count += 1;

                          if (
                            item.priority === "Não definida" &&
                            task.projectPriority
                          ) {
                            item.priority = task.projectPriority;
                          }

                          const developers = Array.isArray(task.responsible) &&
                            task.responsible.length > 0
                            ? task.responsible
                                .map((developer: any) =>
                                  typeof developer === "string"
                                    ? developer.trim()
                                    : String(
                                        developer?.name ||
                                        developer?.username ||
                                        developer?.email ||
                                        ""
                                      ).trim()
                                )
                                .filter(Boolean)
                            : ["Sem responsável"];

                          developers.forEach((developer: string) => {
                            if (!item.developers.includes(developer)) {
                              item.developers.push(developer);
                            }
                          });
                        });

                        return (
                          <div className="space-y-2">
                            {Array.from(projects.entries()).map(([project, data]) => (
                              <div
                                key={project}
                                className={`rounded-lg border p-2 shadow-sm ${
                                   data.priority === "Alta"
                                     ? "border-red-200 bg-red-50"
                                     : data.priority === "Média"
                                       ? "border-orange-200 bg-orange-50"
                                       : data.priority === "Baixa"
                                         ? "border-green-200 bg-green-50"
                                         : "border-zinc-200 bg-white"
                                 }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="line-clamp-2 text-xs font-semibold leading-4 text-zinc-900">
                                    {project}
                                  </p>

                                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white ${
                                     data.priority === "Alta"
                                       ? "bg-red-500"
                                       : data.priority === "Média"
                                         ? "bg-orange-500"
                                         : data.priority === "Baixa"
                                           ? "bg-green-500"
                                           : "bg-zinc-500"
                                   }`}>
                                    {data.count}
                                  </span>
                                </div>

                                <p className="mt-1.5 text-[8px] font-semibold uppercase tracking-wide text-zinc-400">
                                  Desenvolvedores
                                </p>

                                <p className="mt-0.5 line-clamp-2 text-[9px] leading-3.5 text-zinc-600">
                                  {data.developers.join(", ")}
                                </p>
                              </div>
                            ))}
                          </div>
                        );
                      })()                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : loading ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
              <p className="text-sm text-zinc-500">
                Carregando dados do ClickUp...
              </p>
            </div>
          ) : planning.developers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
              <p className="text-sm font-medium text-zinc-700">
                Nenhuma demanda encontrada para a próxima semana.
              </p>
            </div>
          ) : (
            paginatedDevelopers.map((developer: any) => {
              const priorityGroups = [
                {
                  key: "urgente",
                  label: "Urgente",
                  className: "bg-red-500",
                  textClass: "text-white",
                  match: (task: any) => task.priority === "Urgente",
                },
                {
                  key: "alta",
                  label: "Alta",
                  className: "bg-yellow-400",
                  textClass: "text-zinc-800",
                  match: (task: any) => task.priority === "Alta",
                },
                {
                  key: "normal",
                  label: "Normal",
                  className: "bg-blue-500",
                  textClass: "text-white",
                  match: (task: any) => task.priority === "Normal",
                },
                {
                  key: "baixa",
                  label: "Baixa",
                  className: "bg-zinc-300",
                  textClass: "text-zinc-700",
                  match: (task: any) => task.priority === "Baixa",
                },
              ];

              const counts = priorityGroups.map((group) =>
                developer.tasks.filter(group.match).length
              );

              const classified = counts.reduce((sum, value) => sum + value, 0);
              const completed = Math.max(
                0,
                developer.tasks.length - classified
              );

              const projectMap = new Map<
                string,
                {
                  count: number;
                  dates: number[];
                  priority: string;
                }
              >();

              developer.tasks.forEach((task: any) => {
                const project =
                  task.project?.name &&
                  task.project.name !== "hidden"
                    ? task.project.name
                    : task.list?.name || "Sem projeto";

                if (!projectMap.has(project)) {
                  projectMap.set(project, {
                    count: 0,
                    dates: [],
                    priority: task.projectPriority || "Não definida",
                  });
                }

                const item = projectMap.get(project)!;
                item.count += 1;

                if (
                  item.priority === "Não definida" &&
                  task.projectPriority
                ) {
                  item.priority = task.projectPriority;
                }

                if (task.dueDate) {
                  const timestamp = new Date(task.dueDate).getTime();

                  if (!Number.isNaN(timestamp)) {
                    item.dates.push(timestamp);
                  }
                }
              });

              const projects = Array.from(projectMap.entries())
                .map(([name, data]) => ({
                  name,
                  count: data.count,
                  priority: data.priority,
                  minDate:
                    data.dates.length > 0
                      ? Math.min(...data.dates)
                      : null,
                  maxDate:
                    data.dates.length > 0
                      ? Math.max(...data.dates)
                      : null,
                }))
                .sort((a, b) => b.count - a.count);

              const visibleProjects = projects.slice(0, 7);
              const remainingProjects = projects.slice(7);
              const remainingCount = remainingProjects.reduce(
                (sum, project) => sum + project.count,
                0
              );

              const total = developer.tasks.length || 1;

              return (
                <div
                  key={developer.name}
                  className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
                >
                  <div className="grid gap-4 px-4 py-3 lg:grid-cols-[240px_minmax(0,1fr)_130px] lg:items-center">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-zinc-900">
                        {developer.name}
                      </h3>

                      <p className="mt-1 text-[11px] text-zinc-500">
                        Principais projetos: {projects.length}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <div className="flex h-7 overflow-hidden rounded-md bg-zinc-100">
                        {priorityGroups.map((group, index) => {
                          const count = counts[index];

                          if (!count) return null;

                          return (
                            <div
                              key={group.key}
                              className={`${group.className} ${group.textClass} flex min-w-[34px] items-center justify-center text-[11px] font-semibold`}
                              style={{
                                width: `${(count / total) * 100}%`,
                              }}
                              title={`${group.label}: ${count}`}
                            >
                              {count}
                            </div>
                          );
                        })}

                      </div>

                      <div className="mt-1.5 hidden items-center gap-3 text-[9px] text-zinc-400 sm:flex">
                        {priorityGroups.map((group) => (
                          <span
                            key={group.key}
                            className="flex items-center gap-1"
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${group.className}`}
                            />
                            {group.label}
                          </span>
                        ))}

                      </div>
                    </div>

                    <div className="text-left lg:text-right">
                      <p className="text-xl font-semibold tracking-tight text-zinc-900">
                        {developer.tasks.length}
                      </p>

                      <p className="text-[11px] text-zinc-500">
                        demanda{developer.tasks.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-zinc-100 bg-zinc-50/60 px-4 py-3">
                    <div className="flex flex-wrap gap-2">

                      {visibleProjects.map((project) => {
                        const projectStyle =
                          project.priority === "Alta"
                            ? {
                                card: "border-red-200 bg-red-50",
                                badge: "bg-red-500",
                              }
                            : project.priority === "Média"
                              ? {
                                  card: "border-orange-200 bg-orange-50",
                                  badge: "bg-orange-500",
                                }
                              : project.priority === "Baixa"
                                ? {
                                    card: "border-green-200 bg-green-50",
                                    badge: "bg-green-500",
                                  }
                                : {
                                    card: "border-zinc-200 bg-white",
                                    badge: "bg-zinc-500",
                                  };

                        return (
                          <div
                            key={project.name}
                            title={`Prioridade do projeto: ${project.priority}`}
                            className={`min-w-[180px] flex-1 rounded-lg border px-3 py-2 shadow-sm ${projectStyle.card}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="line-clamp-2 text-xs font-semibold leading-4 text-zinc-900">
                                {project.name}
                              </p>

                              <span
                                className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-white ${projectStyle.badge}`}
                              >
                                {project.count}
                              </span>
                            </div>

                            <p className="mt-1 text-[10px] text-zinc-500">
                              {project.minDate && project.maxDate
                                ? `${formatDate(
                                    new Date(project.minDate)
                                  )} – ${formatDate(
                                    new Date(project.maxDate)
                                  )}`
                                : "Sem prazo definido"}
                            </p>
                          </div>
                        );
                      })}

                      {remainingProjects.length > 0 && (
                        <div className="group relative min-w-[150px] flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold leading-4 text-zinc-900">
                              Demais projetos
                            </p>

                            <span className="shrink-0 rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                              {remainingCount}
                            </span>
                          </div>

                          <p className="mt-1 text-[10px] text-zinc-500">
                            {remainingProjects.length} projeto
                            {remainingProjects.length === 1 ? "" : "s"}
                          </p>

                          <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-72 -translate-x-1/2 rounded-lg bg-zinc-900 px-3 py-2 text-left text-[11px] text-white shadow-xl group-hover:block">
                            <p className="mb-2 font-semibold text-white">
                              Projetos restantes
                            </p>

                            <div className="space-y-1.5">
                              {remainingProjects.map((project) => (
                                <div
                                  key={project.name}
                                  className="flex items-center justify-between gap-3"
                                >
                                  <span className="min-w-0 truncate">
                                    {project.name}
                                  </span>

                                  <span className="shrink-0 text-zinc-300">
                                    {project.count}{" "}
                                    {project.count === 1
                                      ? "demanda"
                                      : "demandas"}
                                  </span>
                                </div>
                              ))}
                            </div>

                          </div>
                        </div>
                      )}
                    </div>


                    <div className="mt-3 flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-zinc-100 pt-3 text-[10px] text-zinc-500">
                      <span className="font-medium text-zinc-600">
                        Prioridade dos projetos:
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        Alta
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                        Média
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        Baixa
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-zinc-300" />
                        Não definida
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>

        {viewMode === "lista" && (
        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-500">
            Mostrando{" "}
            {planning.tasks.filter(
              (task: any) => task.planningStatus !== "Sem prazo"
            ).length === 0
              ? 0
              : (currentPage - 1) * pageSize + 1}{" "}
            –{" "}
            {Math.min(
              currentPage * pageSize,
              planning.tasks.filter(
                (task: any) => task.planningStatus !== "Sem prazo"
              ).length
            )}{" "}
            de{" "}
            {
              planning.tasks.filter(
                (task: any) => task.planningStatus !== "Sem prazo"
              ).length
            }{" "}
            demandas
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setCurrentPage((page) => Math.max(1, page - 1))
              }
              disabled={currentPage === 1}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Anterior
            </button>

            <span className="px-2 text-sm font-medium text-zinc-700">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() =>
                setCurrentPage((page) =>
                  Math.min(totalPages, page + 1)
                )
              }
              disabled={currentPage === totalPages}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próxima →
            </button>
          </div>
        </div>
        )}
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Clock3 className="h-3.5 w-3.5" />
          O planejamento é uma camada de gestão e não altera o ClickUp automaticamente.
        </div>
      </main>
    </div>
  );
}








