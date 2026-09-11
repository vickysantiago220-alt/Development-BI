"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  RefreshCw,
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

    if (
      ["urgent", "high", "alta", "urgente"].includes(priority)
    ) {
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

  const totalPages = Math.max(
    1,
    Math.ceil(
      planning.tasks.filter(
        (task: any) => task.planningStatus !== "Sem prazo"
      ).length / pageSize
    )
  );

  const paginatedTasks = planning.tasks
    .filter(
      (task: any) => task.planningStatus !== "Sem prazo"
    )
    .slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  const paginatedDevelopers = useMemo(() => {
    const developers = new Map<string, any>();

    paginatedTasks.forEach((task: any) => {
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

    return Array.from(developers.values()).sort(
      (a, b) => b.tasks.length - a.tasks.length
    );
  }, [paginatedTasks]);
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

        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
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

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Demandas planejadas
              </p>

              <p className="mt-2 text-3xl font-semibold">
                {planning.tasks.filter(
                  (task: any) =>
                    task.planningStatus !== "Sem prazo"
                ).length}
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Com prazo definido para a semana
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Desenvolvedores
              </p>

              <p className="mt-2 text-3xl font-semibold">
                {planning.developers.filter(
                  (developer: any) =>
                    developer.name !== "Sem responsável"
                ).length}
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Com demandas planejadas
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Projetos envolvidos
              </p>

              <p className="mt-2 text-3xl font-semibold">
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

              <p className="mt-1 text-xs text-zinc-500">
                Com entregas previstas
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Sem responsável
              </p>

              <p className="mt-2 text-3xl font-semibold">
                {
                  planning.tasks.filter(
                    (task: any) =>
                      task.responsible.length === 0
                  ).length
                }
              </p>

              <p className="mt-1 text-xs text-zinc-500">
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
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
              {calendarDays.map((day: any) => (
                <div
                  key={day.date.toISOString()}
                  className="min-h-[280px] rounded-2xl border border-zinc-200 bg-white shadow-sm"
                >
                  <div className="border-b border-zinc-200 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                      {day.date.toLocaleDateString("pt-BR", {
                        weekday: "short",
                      })}
                    </p>

                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-lg font-semibold text-zinc-900">
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

                  <div className="space-y-2 p-3">
                    {day.tasks.length === 0 ? (
                      <p className="py-8 text-center text-xs text-zinc-400">
                        Sem entregas
                      </p>
                    ) : (
                      day.tasks.map((task: any) => (
                        <div
                          key={task.id}
                          className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5"
                        >
                          <p className="line-clamp-2 text-xs font-semibold leading-4 text-zinc-900">
                            {task.name || "Sem nome"}
                          </p>

                          <p className="mt-1 line-clamp-1 text-[10px] text-zinc-500">
                            {task.project?.name &&
                            task.project.name !== "hidden"
                              ? task.project.name
                              : task.list?.name || "Sem projeto"}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-1">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                task.projectPriority === "Alta"
                                  ? "bg-red-100 text-red-700"
                                  : task.projectPriority === "Média"
                                    ? "bg-amber-100 text-amber-700"
                                    : task.projectPriority === "Baixa"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-zinc-200 text-zinc-600"
                              }`}
                            >
                              Projeto: {task.projectPriority}
                            </span>

                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                task.priority === "Alta" ||
                                task.priority === "Urgente"
                                  ? "bg-red-100 text-red-700"
                                  : task.priority === "Normal"
                                    ? "bg-amber-100 text-amber-700"
                                    : task.priority === "Baixa"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-zinc-200 text-zinc-600"
                              }`}
                            >
                              Demanda: {task.priority}
                            </span>
                          </div>

                          <p className="mt-1.5 line-clamp-1 text-[10px] font-medium text-zinc-700">
                            {task.responsible?.length
                              ? task.responsible.join(", ")
                              : "Sem responsável"}
                          </p>
                        </div>
                      ))
                    )}
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
            paginatedDevelopers.map((developer: any) => (
              <div
                key={developer.name}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
                  <div>
                    <h3 className="font-semibold">
                      {developer.name}
                    </h3>

                    <p className="mt-1 text-xs text-zinc-500">
                      {developer.tasks.length} demanda
                      {developer.tasks.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100">
                    {developer.name === "Sem responsável" ? (
                      <AlertTriangle className="h-4 w-4 text-zinc-500" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-zinc-600" />
                    )}
                  </div>
                </div>

                <div className="divide-y divide-zinc-100">
                  {developer.tasks.map((task: any) => (
                    <div
                      key={`${developer.name}-${task.id}`}
                      className="grid gap-4 px-5 py-4 lg:grid-cols-[1.8fr_1fr_1fr_1fr_1fr]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {task.name || "Sem nome"}
                        </p>

                        <p className="mt-1 truncate text-xs text-zinc-500">
                          {task.project?.name &&
                          task.project.name !== "hidden"
                            ? task.project.name
                            : task.list?.name || "Sem projeto"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-zinc-400">
                          Status
                        </p>

                        <span
                          className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle(
                            task.planningStatus
                          )}`}
                        >
                          {task.planningStatus}
                        </span>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-zinc-400">
                          Prazo
                        </p>

                        <p className="mt-1 text-sm text-zinc-700">
                          {formatDate(task.dueDate)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-zinc-400">
                          Projeto
                        </p>

                        <p className="mt-1 text-sm text-zinc-700">
                          {task.projectPriority}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-zinc-400">
                          Demanda
                        </p>

                        <p className="mt-1 text-sm text-zinc-700">
                          {task.priority}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-zinc-400">
                          Planejamento
                        </p>

                        <p className="mt-1 text-sm font-medium text-zinc-900">
                          {task.planningPriority}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-zinc-400">
                          Ação
                        </p>

                        <button className="mt-1 text-sm font-medium text-zinc-700 hover:text-zinc-950">
                          Analisar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>

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
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Clock3 className="h-3.5 w-3.5" />
          O planejamento é uma camada de gestão e não altera o ClickUp automaticamente.
        </div>
      </main>
    </div>
  );
}



















