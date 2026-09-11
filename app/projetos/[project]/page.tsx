"use client";

import { ArrowLeft, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
    color?: string | null;
    colorStatus?: string | null;
  };
  status?: {
    name?: string;
    color?: string;
    type?: string;
  } | null;
  priority?: {
    id?: string;
    name?: string;
  } | null;
  assignees?: Array<{
    id?: string;
    username?: string;
    email?: string;
  }>;
  dates?: {
    dueDate?: string | null;
    dateDone?: string | null;
    createdAt?: string | null;
  };
};

function isDone(task: Task) {
  const name = String(task.status?.name || "").trim().toLowerCase();
  const type = String(task.status?.type || "").trim().toLowerCase();

  return (
    ["done", "closed", "complete"].includes(type) ||
    [
      "closed",
      "complete",
      "completed",
      "histories",
      "história",
      "historia",
      "concluído",
      "concluída",
      "concluidas",
      "concluídas",
    ].includes(name)
  );
}

function getPriority(task: Task) {
  const priority = String(task.priority?.name || "").trim().toLowerCase();

  if (["urgent", "high", "alta", "urgente"].includes(priority)) {
    return "Alta";
  }

  if (["normal", "medium", "média", "media"].includes(priority)) {
    return "Média";
  }

  if (["low", "baixa"].includes(priority)) {
    return "Baixa";
  }

  return "Não definida";
}

function getPriorityClass(priority: string) {
  if (priority === "Alta") {
    return "bg-red-50 text-red-700";
  }

  if (priority === "Média") {
    return "bg-amber-50 text-amber-700";
  }

  if (priority === "Baixa") {
    return "bg-emerald-50 text-emerald-700";
  }

  return "bg-zinc-100 text-zinc-500";
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("pt-BR");
}

export default function ProjetoDetalhesPage() {
  const params = useParams();
  const router = useRouter();

  const projectName = decodeURIComponent(String(params.project || ""));

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos os status");
  const [priorityFilter, setPriorityFilter] = useState("Todas as prioridades");

  useEffect(() => {
    async function loadTasks() {
      try {
        const response = await fetch("/api/clickup/cache", {
          cache: "no-store",
        });

        const data = await response.json();

        if (data.success && Array.isArray(data.tasks)) {
          setTasks(data.tasks);
        }
      } catch (error) {
        console.error("Erro ao carregar demandas do projeto:", error);
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, []);

  const projectTasks = useMemo(() => {
    return tasks.filter(
      (task) =>
        String(task.project?.name || "").trim().toLowerCase() ===
        projectName.trim().toLowerCase()
    );
  }, [tasks, projectName]);

  const statuses = useMemo(() => {
    return Array.from(
      new Set(
        projectTasks
          .map((task) => String(task.status?.name || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [projectTasks]);

  const filteredTasks = useMemo(() => {
    const term = search.trim().toLowerCase();

    return projectTasks.filter((task) => {
      const matchesSearch =
        !term || task.name.toLowerCase().includes(term);

      const taskStatus = String(task.status?.name || "").trim();

      const matchesStatus =
        statusFilter === "Todos os status" ||
        taskStatus === statusFilter;

      const matchesPriority =
        priorityFilter === "Todas as prioridades" ||
        getPriority(task) === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    })
    .sort((a, b) => {
      const dueA = a.dates?.dueDate
        ? new Date(a.dates.dueDate).getTime()
        : null;

      const dueB = b.dates?.dueDate
        ? new Date(b.dates.dueDate).getTime()
        : null;

      if (dueA === null && dueB === null) return 0;
      if (dueA === null) return 1;
      if (dueB === null) return -1;

      return dueB - dueA;
    });
  }, [
    projectTasks,
    search,
    statusFilter,
    priorityFilter,
  ]);

  const completed = projectTasks.filter(isDone).length;
  const active = projectTasks.length - completed;

  const overdue = projectTasks.filter((task) => {
    if (isDone(task) || !task.dates?.dueDate) return false;

    return new Date(task.dates.dueDate).getTime() < Date.now();
  }).length;

  const blocked = projectTasks.filter((task) => {
    const status = String(task.status?.name || "").trim().toLowerCase();
    return ["blocked", "bloqueado"].includes(status);
  }).length;

  const progress =
    projectTasks.length > 0
      ? Math.round((completed / projectTasks.length) * 100)
      : 0;

  const projectPriority = useMemo(() => {
    const counts: Record<string, number> = {
      Alta: 0,
      Média: 0,
      Baixa: 0,
      "Não definida": 0,
    };

    for (const task of projectTasks) {
      const colorStatus = String(task.list?.colorStatus || "")
        .trim()
        .toLowerCase();

      const color = String(task.list?.color || "")
        .trim()
        .toLowerCase();

      if (
        colorStatus === "red" ||
        colorStatus === "vermelho" ||
        color === "#d33d44" ||
        color === "#e2445c"
      ) {
        counts.Alta++;
      } else if (
        colorStatus === "yellow" ||
        colorStatus === "amarelo" ||
        color === "#f9d900" ||
        color === "#ffcc00"
      ) {
        counts.Média++;
      } else if (
        colorStatus === "green" ||
        colorStatus === "verde" ||
        color === "#008844" ||
        color === "#00a359"
      ) {
        counts.Baixa++;
      } else {
        counts["Não definida"]++;
      }
    }

    return ["Alta", "Média", "Baixa", "Não definida"].reduce(
      (best, priority) =>
        counts[priority] > counts[best] ? priority : best,
      "Não definida"
    );
  }, [projectTasks]);

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-6 py-6">
        <div className="mx-auto max-w-[1400px]">
          <button
            onClick={() => router.push("/projetos")}
            className="mb-5 inline-flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para projetos
          </button>

          <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
            Projeto
          </p>

          <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-zinc-950">
                {projectName}
              </h1>

              <p className="mt-1 text-sm text-zinc-500">
                Todas as demandas sincronizadas deste projeto.
              </p>
            </div>

            <span
              className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${getPriorityClass(
                projectPriority
              )}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              Prioridade do projeto: {projectPriority}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] space-y-5 p-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <p className="text-xs text-zinc-500">Demandas</p>
            <p className="mt-2 text-2xl font-semibold">{projectTasks.length}</p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <p className="text-xs text-zinc-500">Ativas</p>
            <p className="mt-2 text-2xl font-semibold">{active}</p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <p className="text-xs text-zinc-500">Concluídas</p>
            <p className="mt-2 text-2xl font-semibold">{completed}</p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <p className="text-xs text-zinc-500">Atrasadas</p>
            <p className="mt-2 text-2xl font-semibold text-red-600">
              {overdue}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <p className="text-xs text-zinc-500">Bloqueadas</p>
            <p className="mt-2 text-2xl font-semibold text-amber-600">
              {blocked}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-950">
                Demandas do projeto
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                {filteredTasks.length} demandas encontradas
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar demanda..."
                  className="h-10 w-full rounded-xl border border-zinc-200 pl-9 pr-3 text-sm outline-none focus:border-zinc-400 md:w-64"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none"
              >
                <option>Todos os status</option>

                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none"
              >
                <option>Todas as prioridades</option>
                <option>Alta</option>
                <option>Média</option>
                <option>Baixa</option>
                <option>Não definida</option>
              </select>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-[11px] uppercase tracking-wide text-zinc-400">
                  <th className="pb-3 pr-6">Demanda</th>
                  <th className="pb-3 pr-6">Responsável</th>
                  <th className="pb-3 pr-6">Status</th>
                  <th className="pb-3 pr-6">Prioridade da demanda</th>
                  <th className="pb-3">Prazo</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-12 text-center text-sm text-zinc-500"
                    >
                      Carregando demandas...
                    </td>
                  </tr>
                ) : filteredTasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-12 text-center text-sm text-zinc-500"
                    >
                      Nenhuma demanda encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const responsible =
                      task.assignees
                        ?.map(
                          (assignee) =>
                            assignee.username || assignee.email
                        )
                        .filter(Boolean)
                        .join(", ") || "Não definido";

                    const priority = getPriority(task);

                    return (
                      <tr
                        key={task.id}
                        className="border-b border-zinc-100 last:border-0"
                      >
                        <td className="py-4 pr-6">
                          <p className="max-w-[500px] text-sm font-medium text-zinc-900">
                            {task.name}
                          </p>
                        </td>

                        <td className="py-4 pr-6 text-sm text-zinc-600">
                          {responsible}
                        </td>

                        <td className="py-4 pr-6">
                          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600">
                            {task.status?.name || "Sem status"}
                          </span>
                        </td>

                        <td className="py-4 pr-6">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${getPriorityClass(
                              priority
                            )}`}
                          >
                            {priority}
                          </span>
                        </td>

                        <td className="py-4 text-sm text-zinc-600">
                          {formatDate(task.dates?.dueDate)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-xs text-zinc-400">
          Progresso atual do projeto: {progress}%
        </p>
      </div>
    </main>
  );
}

