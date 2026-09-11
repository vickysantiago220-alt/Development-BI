"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ListTodo,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Task = {
  id?: string;
  name?: string;
  project?: {
    id?: string;
    name?: string;
  } | null;
  list?: {
    id?: string;
    name?: string;
    color?: string | null;
    colorStatus?: string | null;
  } | null;
  responsible?: Array<{
    id?: string;
    name?: string;
    initials?: string;
  }>;
  status?: {
    id?: string;
    name?: string;
    type?: string;
  } | null;
  priority?: {
    id?: string;
    name?: string;
    color?: string | null;
    colorStatus?: string | null;
  } | null;
  dates?: {
    dueDate?: string | number | null;
    createdAt?: string | number | null;
    dateDone?: string | number | null;
  } | null;
};

const ITEMS_PER_PAGE = 10;

function isDone(task: Task) {
  const type = String(
    task.status?.type || ""
  ).toLowerCase();

  const status = String(
    task.status?.name || ""
  )
    .trim()
    .toLowerCase();

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
    ].includes(status)
  );
}

function classifyStatus(task: Task) {
  const status = String(
    task.status?.name || ""
  )
    .trim()
    .toLowerCase();

  if (isDone(task)) {
    return "Concluídas";
  }

  if (status === "in progress") {
    return "Em desenvolvimento";
  }

  if (
    status === "in review" ||
    status === "qa bug" ||
    status === "qa melhoria"
  ) {
    return "Em revisão";
  }

  if (status === "blocked") {
    return "Bloqueada";
  }

  return "Aguardando";
}

function parseDate(
  value: string | number | null | undefined
) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatDate(
  value: string | number | null | undefined
) {
  const date = parseDate(value);

  if (!date) {
    return "Sem prazo";
  }

  return date.toLocaleDateString(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
}

function isOverdue(task: Task) {
  if (isDone(task)) {
    return false;
  }

  const dueDate = parseDate(
    task.dates?.dueDate
  );

  if (!dueDate) {
    return false;
  }

  const today = new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  return (
    dueDate.getTime() <
    today.getTime()
  );
}

function getProject(task: Task) {
  const projectName =
    task.project?.name;

  if (
    projectName &&
    projectName !== "hidden"
  ) {
    return projectName;
  }

  return (
    task.list?.name ||
    "Sem projeto"
  );
}

function getResponsible(task: Task) {
  const person =
    task.responsible?.[0];

  return (
    person?.name ||
    "Não atribuído"
  );
}

function getPriority(task: Task) {
  const priority = String(
    task.priority?.name || ""
  )
    .trim()
    .toLowerCase();

  if (
    [
      "urgent",
      "high",
      "alta",
      "urgente",
    ].includes(priority)
  ) {
    return "Alta";
  }

  if (
    [
      "normal",
      "medium",
      "média",
      "media",
    ].includes(priority)
  ) {
    return "Normal";
  }

  if (
    [
      "low",
      "baixa",
    ].includes(priority)
  ) {
    return "Baixa";
  }

  return "Não definida";
}
export default function DemandasPage() {
  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [projectFilter, setProjectFilter] =
    useState("Todos os projetos");

  const [responsibleFilter, setResponsibleFilter] =
    useState("Todos os responsáveis");

  const [statusFilter, setStatusFilter] =
    useState("Todos os status");

  const [periodFilter, setPeriodFilter] =
    useState("week");
  const [page, setPage] =
    useState(1);

  useEffect(() => {
    const responsibleFromUrl =
      new URLSearchParams(window.location.search).get(
        "responsavel"
      );

    if (responsibleFromUrl) {
      setResponsibleFilter(
        responsibleFromUrl
      );
    }
  }, []);

  useEffect(() => {
    fetch("/api/clickup/cache", {
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Não foi possível carregar o cache do ClickUp."
          );
        }

        return response.json();
      })
      .then((data) => {
        setTasks(
          Array.isArray(data?.tasks)
            ? data.tasks
            : []
        );
      })
      .catch((error) => {
        console.error(
          "Erro ao carregar demandas:",
          error
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const projects =
    useMemo(() => {
      return Array.from(
        new Set(
          tasks.map(getProject)
        )
      ).sort((a, b) =>
        a.localeCompare(b)
      );
    }, [tasks]);

  const responsibles =
    useMemo(() => {
      return Array.from(
        new Set(
          tasks.map(getResponsible)
        )
      ).sort((a, b) =>
        a.localeCompare(b)
      );
    }, [tasks]);

  const statuses = useMemo(() => {
    const uniqueStatuses = new Set<string>();

    for (const task of tasks) {
      const statusName = String(
        task.status?.name || ""
      ).trim();

      if (statusName) {
        uniqueStatuses.add(statusName);
      }
    }

    return [
      ...Array.from(uniqueStatuses).sort(
        (a, b) => a.localeCompare(b, "pt-BR")
      ),
      "Concluídas",
    ];
  }, [tasks]);

  const metrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const periodRanges: Record<string, { start: Date; end: Date }> = {
      day: (() => {
        const start = new Date(today);
        const end = new Date(today);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      })(),
      week: (() => {
        const start = new Date(today);
        const day = start.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        start.setDate(start.getDate() + diff);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        return { start, end };
      })(),
      month: (() => {
        const start = new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        );

        const end = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0
        );
        end.setHours(23, 59, 59, 999);

        return { start, end };
      })(),
      year: (() => {
        const start = new Date(
          today.getFullYear(),
          0,
          1
        );

        const end = new Date(
          today.getFullYear(),
          11,
          31
        );
        end.setHours(23, 59, 59, 999);

        return { start, end };
      })(),
      all: {
        start: new Date(0),
        end: new Date(8640000000000000),
      },
    };

    const range =
      periodRanges[periodFilter] ||
      periodRanges.week;

    const activeTasks =
      tasks.filter((task) => {
        if (isDone(task)) {
          return false;
        }

        if (periodFilter === "all") {
          return true;
        }

        const dueDate = parseDate(task.dates?.dueDate);

        return (
          isOverdue(task) ||
          (!!dueDate &&
            dueDate >= range.start &&
            dueDate <= range.end)
        );
      });

    const completedInPeriod =
      tasks.filter((task) => {
        if (!isDone(task)) {
          return false;
        }

        const dateDone = parseDate(
          task.dates?.dateDone
        );

        if (!dateDone) {
          return false;
        }

        return (
          dateDone >= range.start &&
          dateDone <= range.end
        );
      });

    const development =
      activeTasks.filter(
        (task) =>
          classifyStatus(task) ===
          "Em desenvolvimento"
      );

    const blocked =
      activeTasks.filter(
        (task) =>
          classifyStatus(task) ===
          "Bloqueada"
      );

    const visibleActiveTasks =
      activeTasks.filter(
        (task) =>
          String(task.status?.name || "")
            .trim()
            .toLowerCase() !== "blocked"
      );

    const overdue =
      visibleActiveTasks.filter(isOverdue);

    return {
      total: visibleActiveTasks.length,
      development: development.length,
      completed: completedInPeriod.length,
      overdue: overdue.length,
      blocked: blocked.length,
    };
  }, [tasks, periodFilter]);
  const filteredTasks =
    useMemo(() => {
      const normalizedSearch =
        search.trim().toLowerCase();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const periodRanges: Record<string, { start: Date; end: Date }> = {
        day: (() => {
          const start = new Date(today);
          const end = new Date(today);
          end.setHours(23, 59, 59, 999);
          return { start, end };
        })(),
        week: (() => {
          const start = new Date(today);
          const day = start.getDay();
          const diff = day === 0 ? -6 : 1 - day;
          start.setDate(start.getDate() + diff);
          start.setHours(0, 0, 0, 0);

          const end = new Date(start);
          end.setDate(end.getDate() + 6);
          end.setHours(23, 59, 59, 999);

          return { start, end };
        })(),
        month: (() => {
          const start = new Date(
            today.getFullYear(),
            today.getMonth(),
            1
          );

          const end = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            0
          );
          end.setHours(23, 59, 59, 999);

          return { start, end };
        })(),
        year: (() => {
          const start = new Date(
            today.getFullYear(),
            0,
            1
          );

          const end = new Date(
            today.getFullYear(),
            11,
            31
          );
          end.setHours(23, 59, 59, 999);

          return { start, end };
        })(),
        all: {
          start: new Date(0),
          end: new Date(8640000000000000),
        },
      };

      const range =
        periodRanges[periodFilter] ||
        periodRanges.week;

      const result = tasks.filter(
        (task) => {
          const matchesSearch =
            !normalizedSearch ||
            String(task.name || "")
              .toLowerCase()
              .includes(normalizedSearch);

          const matchesProject =
            projectFilter ===
              "Todos os projetos" ||
            getProject(task) ===
              projectFilter;

          const matchesResponsible =
            responsibleFilter ===
              "Todos os responsáveis" ||
            getResponsible(task) ===
              responsibleFilter;

          const realStatus =
            String(task.status?.name || "").trim();

          const matchesStatus =
            statusFilter === "Todos os status"
              ? true
              : statusFilter === "Concluídas"
                ? isDone(task)
                : realStatus === statusFilter;

          const activeTask =
            !isDone(task);

          const dateCreated =
            parseDate(
              task.dates?.createdAt
            );

          const dateDone =
            parseDate(
              task.dates?.dateDone
            );

          const dueDate = parseDate(task.dates?.dueDate);
          const isOverdueTask = activeTask && isOverdue(task);

          const matchesPeriod =
            periodFilter === "all"
              ? true
              : statusFilter === "Concluídas"
                ? !!dateDone &&
                  dateDone >= range.start &&
                  dateDone <= range.end
                : activeTask
                  ? isOverdueTask ||
                    (!!dueDate &&
                      dueDate >= range.start &&
                      dueDate <= range.end)
                  : !!dateDone &&
                    dateDone >= range.start &&
                    dateDone <= range.end;

          const matchesDefaultStatus =
            statusFilter !==
              "Todos os status" ||
            (activeTask &&
              String(task.status?.name || "")
                .trim()
                .toLowerCase() !== "blocked");

          return (
            matchesSearch &&
            matchesProject &&
            matchesResponsible &&
            matchesStatus &&
            matchesPeriod &&
            matchesDefaultStatus
          );
        }
      );

      return result.sort((a, b) => {
        const aDue = parseDate(
          a.dates?.dueDate
        );

        const bDue = parseDate(
          b.dates?.dueDate
        );

        if (!aDue && !bDue) {
          return String(a.name || "").localeCompare(
            String(b.name || "")
          );
        }

        if (!aDue) {
          return 1;
        }

        if (!bDue) {
          return -1;
        }

        return (
          aDue.getTime() -
          bDue.getTime()
        );
      });
    }, [
      tasks,
      search,
      projectFilter,
      responsibleFilter,
      statusFilter,
      periodFilter,
    ]);
  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredTasks.length /
          ITEMS_PER_PAGE
      )
    );

  const currentPage =
    Math.min(
      page,
      totalPages
    );

  const paginatedTasks =
    filteredTasks.slice(
      (currentPage - 1) *
        ITEMS_PER_PAGE,
      currentPage *
        ITEMS_PER_PAGE
    );

  useEffect(() => {
    setPage(1);
  }, [
    search,
    projectFilter,
    responsibleFilter,
    statusFilter,
  ]);

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <header className="border-b border-zinc-200 bg-white px-5 py-6 lg:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
              Gestão
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Demandas
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Acompanhe as demandas de desenvolvimento e seus responsáveis.
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-6 p-5 lg:p-8">
        {/* INDICADORES */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric
            title="Demandas em acompanhamento"
            value={
              loading
                ? "..."
                : metrics.total.toLocaleString(
                    "pt-BR"
                  )
            }
            icon={
              <ListTodo className="h-4 w-4" />
            }
          />

          <Metric
            title="Em desenvolvimento"
            value={
              loading
                ? "..."
                : metrics.development.toLocaleString(
                    "pt-BR"
                  )
            }
            icon={
              <Clock3 className="h-4 w-4" />
            }
          />

          <Metric
            title="Concluídas"
            value={
              loading
                ? "..."
                : metrics.completed.toLocaleString(
                    "pt-BR"
                  )
            }
            icon={
              <CheckCircle2 className="h-4 w-4" />
            }
          />

          <Metric
            title="Em atraso"
            value={
              loading
                ? "..."
                : metrics.overdue.toLocaleString(
                    "pt-BR"
                  )
            }
            icon={
              <AlertTriangle className="h-4 w-4" />
            }
          />

          <Metric
            title="Bloqueadas"
            value={
              loading
                ? "..."
                : metrics.blocked.toLocaleString(
                    "pt-BR"
                  )
            }
            icon={
              <AlertTriangle className="h-4 w-4" />
            }
          />
        </section>

        {/* FILTROS */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-4">
            <div className="flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2.5">
              <Search className="h-4 w-4 text-zinc-400" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Buscar demanda..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
              />
            </div>

            <select
              value={periodFilter}
              onChange={(event) =>
                setPeriodFilter(event.target.value)
              }
              className="w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-600 outline-none hover:bg-zinc-50"
            >
              <option value="day">Diário</option>
              <option value="week">Semanal</option>
              <option value="month">Mensal</option>
              <option value="year">Anual</option>
              <option value="all">Todos os períodos</option>
            </select>            <SelectFilter
              value={projectFilter}
              options={[
                "Todos os projetos",
                ...projects,
              ]}
              onChange={setProjectFilter}
            />

            <SelectFilter
              value={responsibleFilter}
              options={[
                "Todos os responsáveis",
                ...responsibles,
              ]}
              onChange={
                setResponsibleFilter
              }
            />

            <SelectFilter
              value={statusFilter}
              options={[
                "Todos os status",
                ...statuses,
              ]}
              onChange={setStatusFilter}
            />
          </div>
        </section>

        {/* TABELA */}
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 p-6">
            <div>
              <h2 className="font-semibold">
                Demandas ativas
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Demandas em andamento sincronizadas com o ClickUp
              </p>
            </div>

            <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600">
              {filteredTasks.length.toLocaleString(
                "pt-BR"
              )}{" "}
              demandas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/70 text-left">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Demanda
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Projeto
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Responsável
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Status
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Prioridade
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Prazo
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-sm text-zinc-400"
                    >
                      Carregando demandas...
                    </td>
                  </tr>
                ) : paginatedTasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-sm text-zinc-400"
                    >
                      Nenhuma demanda encontrada.
                    </td>
                  </tr>
                ) : (
                  paginatedTasks.map(
                    (demand) => {
                      const responsible =
                        getResponsible(
                          demand
                        );

                      return (
                        <tr
                          key={
                            demand.id ||
                            demand.name
                          }
                          className="transition-colors hover:bg-zinc-50"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
                                <ListTodo className="h-4 w-4 text-zinc-600" />
                              </div>

                              <span className="max-w-[360px] text-sm font-semibold text-zinc-800">
                                {demand.name ||
                                  "Sem nome"}
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-sm text-zinc-600">
                            {getProject(
                              demand
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-700">
                                {getInitials(
                                  responsible
                                )}
                              </div>

                              <span className="text-sm text-zinc-600">
                                {responsible}
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <StatusBadge
                              status={String(
                                demand.status?.name || "Sem status"
                              )}
                            />
                          </td>

                          <td className="px-6 py-4">
                            <PriorityBadge
                              priority={getPriority(
                                demand
                              )}
                            />
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`text-sm font-medium ${
                                isOverdue(
                                  demand
                                )
                                  ? "text-red-600"
                                  : "text-zinc-700"
                              }`}
                            >
                              {formatDate(
                                demand
                                  .dates
                                  ?.dueDate
                              )}
                            </span>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-4">
            <p className="text-xs text-zinc-400">
              {filteredTasks.length ===
              0
                ? "Nenhuma demanda"
                : `Exibindo ${
                    (currentPage - 1) *
                      ITEMS_PER_PAGE +
                    1
                  }–${Math.min(
                    currentPage *
                      ITEMS_PER_PAGE,
                    filteredTasks.length
                  )} de ${filteredTasks.length.toLocaleString(
                    "pt-BR"
                  )} demandas`}
            </p>

            <div className="flex items-center gap-2">
              <button
                disabled={
                  currentPage === 1
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.max(
                        1,
                        current - 1
                      )
                  )
                }
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>

              <span className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white">
                {currentPage}
              </span>

              <button
                disabled={
                  currentPage ===
                  totalPages
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.min(
                        totalPages,
                        current + 1
                      )
                  )
                }
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        </section>

        <div className="border-t border-zinc-200 pt-5 text-xs text-zinc-400">
          Dados exibidos nesta tela são sincronizados com o ClickUp.
        </div>
      </div>
    </div>
  );
}

function Metric({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {title}
        </p>

        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-3xl font-semibold tracking-tight">
        {value}
      </p>
    </div>
  );
}

function SelectFilter({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (
    value: string
  ) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 pr-9 text-sm text-zinc-600 outline-none hover:bg-zinc-50"
      >
        {options.map(
          (option) => (
            <option
              key={option}
              value={option}
            >
              {option}
            </option>
          )
        )}
      </select>

      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const styles: Record<
    string,
    string
  > = {
    "Em desenvolvimento":
      "bg-blue-50 text-blue-700",
    "Em revisão":
      "bg-violet-50 text-violet-700",
    Aguardando:
      "bg-zinc-100 text-zinc-600",
    Bloqueada:
      "bg-red-50 text-red-700",
    Concluídas:
      "bg-emerald-50 text-emerald-700",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        styles[status] ??
        "bg-zinc-100 text-zinc-600"
      }`}
    >
      {status}
    </span>
  );
}

function PriorityBadge({
  priority,
}: {
  priority: string;
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        priority === "Alta"
          ? "bg-red-50 text-red-700"
          : priority === "Média"
            ? "bg-amber-50 text-amber-700"
            : priority === "Baixa"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-zinc-100 text-zinc-500"
      }`}
    >
      {priority}
    </span>
  );
}

function getInitials(
  name: string
) {
  if (
    !name ||
    name === "Não atribuído"
  ) {
    return "--";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part[0]
    )
    .join("")
    .toUpperCase();
}



























