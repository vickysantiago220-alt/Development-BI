"use client";

import {
  ArrowUpRight,
  FolderKanban,
  Search,
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
    color?: string | null;
    colorStatus?: string | null;
  };
  status?: {
    name?: string;
    type?: string;
  };
  dates?: {
    dueDate?: string | null;
  };
};

type Project = {
  name: string;
  total: number;
  completed: number;
  active: number;
  overdue: number;
  blocked: number;
  progress: number;
  status: string;
  attention: boolean;
  priority: string;
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
    ].includes(statusName)
  );
}

function isBlocked(task: Task) {
  const statusName = String(task.status?.name || "").toLowerCase().trim();

  return statusName === "blocked" || statusName === "bloqueado";
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

function isDevelopment(task: Task) {
  const statusName = String(task.status?.name || "").toLowerCase().trim();

  return statusName === "in progress" || statusName === "em desenvolvimento";
}

function getProjectPriority(tasks: Task[]) {
  const counts: Record<string, number> = {
    Alta: 0,
    Média: 0,
    Baixa: 0,
    "Não definida": 0,
  };

  for (const task of tasks) {
    const colorStatus = String(
      task.list?.colorStatus || ""
    )
      .trim()
      .toLowerCase();

    const color = String(
      task.list?.color || ""
    )
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

  const priorityOrder = [
    "Alta",
    "Média",
    "Baixa",
    "Não definida",
  ];

  return priorityOrder.reduce((best, priority) => {
    if (counts[priority] > counts[best]) {
      return priority;
    }

    return best;
  }, "Não definida");
}
function getProject(task: Task) {
  const project = String(task.project?.name || "").trim();
  const list = String(task.list?.name || "").trim();

  if (!project || project.toLowerCase() === "hidden") {
    return list || "Sem projeto";
  }

  return project;
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

function getProjectStatus(tasks: Task[]) {
  const activeTasks = tasks.filter((task) => !isDone(task));

  if (activeTasks.length === 0) {
    return "Concluído";
  }

  if (activeTasks.some(isBlocked)) {
    return "Bloqueado";
  }

  if (activeTasks.some(isReview)) {
    return "Homologação";
  }

  if (activeTasks.some(isDevelopment)) {
    return "Em desenvolvimento";
  }

  return "Aguardando";
}

export default function ProjetosPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadProjects() {
      try {
        const response = await fetch("/api/clickup/cache", {
          cache: "no-store",
        });

        const data = await response.json();

        if (data.success && Array.isArray(data.tasks)) {
          setTasks(data.tasks);
        }
      } catch (error) {
        console.error("Erro ao carregar projetos:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, []);

  const projects = useMemo<Project[]>(() => {
    const grouped = new Map<string, Task[]>();

    for (const task of tasks) {
      const projectName = getProject(task);

      if (!grouped.has(projectName)) {
        grouped.set(projectName, []);
      }

      grouped.get(projectName)!.push(task);
    }

    return Array.from(grouped.entries())
      .map(([name, projectTasks]) => {
        const total = projectTasks.length;
        const completed = projectTasks.filter(isDone).length;
        const active = total - completed;
        const overdue = projectTasks.filter(isOverdue).length;
        const blocked = projectTasks.filter(isBlocked).length;

        const progress =
          total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          name,
          total,
          completed,
          active,
          overdue,
          blocked,
          progress,
          status: getProjectStatus(projectTasks),
          attention: overdue > 0 || blocked > 0,
          priority: getProjectPriority(projectTasks),
        };
      })
      .sort((a, b) => {
        if (a.attention !== b.attention) {
          return a.attention ? -1 : 1;
        }

        return b.active - a.active;
      });
  }, [tasks]);

  const filteredProjects = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) {
      return projects;
    }

    return projects.filter((project) =>
      project.name.toLowerCase().includes(term)
    );
  }, [projects, search]);

  const priorityOrder: Record<string, number> = {
    Alta: 1,
    Média: 2,
    Baixa: 3,
    "Não definida": 4,
  };

  const orderedProjects = [...filteredProjects].sort((a, b) => {
    const priorityA = priorityOrder[a.priority] || 4;
    const priorityB = priorityOrder[b.priority] || 4;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    return a.name.localeCompare(b.name, "pt-BR");
  });

  const activeProjects = projects.filter((project) => project.active > 0);
  const developmentProjects = projects.filter(
    (project) => project.status === "Em desenvolvimento"
  );
  const reviewProjects = projects.filter(
    (project) => project.status === "Homologação"
  );
  const attentionProjects = projects.filter((project) => project.attention);

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <header className="border-b border-zinc-200 bg-white px-5 py-6 lg:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
              Gestão
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Projetos
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Acompanhe o andamento dos projetos e suas demandas.
            </p>
          </div>

          <div className="flex items-center rounded-xl border border-zinc-200 bg-white px-3 py-2.5 shadow-sm">
            <Search className="h-4 w-4 text-zinc-400" />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar projeto..."
              className="ml-2 w-full bg-transparent text-sm outline-none placeholder:text-zinc-400 sm:w-52"
            />
          </div>
        </div>
      </header>

      <div className="space-y-6 p-5 lg:p-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            title="Projetos ativos"
            value={loading ? "—" : activeProjects.length.toLocaleString("pt-BR")}
          />

          <Metric
            title="Em desenvolvimento"
            value={
              loading
                ? "—"
                : developmentProjects.length.toLocaleString("pt-BR")
            }
          />

          <Metric
            title="Em homologação"
            value={
              loading ? "—" : reviewProjects.length.toLocaleString("pt-BR")
            }
          />

          <Metric
            title="Precisam de atenção"
            value={
              loading ? "—" : attentionProjects.length.toLocaleString("pt-BR")
            }
          />
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 p-6">
            <div>
              <h2 className="font-semibold">Todos os projetos</h2>

              <p className="mt-1 text-sm text-zinc-500">
                Projetos sincronizados com o ClickUp
              </p>
            </div>

            <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600">
              {loading ? "Carregando..." : `${projects.length} projetos`}
            </span>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-zinc-500">
              Carregando projetos...
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-10 text-center text-sm text-zinc-500">
              Nenhum projeto encontrado.
            </div>
          ) : (
            <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
              {orderedProjects.map((project) => (
                <div
                  key={project.name}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    window.location.href = `/projetos/${encodeURIComponent(project.name)}`
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      window.location.href = `/projetos/${encodeURIComponent(project.name)}`;
                    }
                  }}
                  className="cursor-pointer rounded-2xl border border-zinc-200 p-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
                        <FolderKanban className="h-5 w-5 text-zinc-700" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold">
                          {project.name}
                        </h3>

                        <p className="mt-1 text-xs text-zinc-400">
                          {project.total.toLocaleString("pt-BR")} demandas
                        </p>

                        <div className="mt-2">
                          <ProjectPriorityBadge
                            priority={project.priority}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-100"
                      title="Detalhes do projeto"
                    >
                      <ArrowUpRight className="h-4 w-4 text-zinc-500" />
                    </button>
                  </div>

                  <div className="mt-6">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs text-zinc-500">
                        Progresso
                      </span>

                      <span className="text-xs font-semibold">
                        {project.progress}%
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-zinc-900"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                      {project.status}
                    </span>

                    {project.attention && (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Atenção
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex gap-4 border-t border-zinc-100 pt-4 text-xs text-zinc-500">
                    <span>
                      <strong className="font-semibold text-zinc-700">
                        {project.active}
                      </strong>{" "}
                      ativas
                    </span>

                    <span>
                      <strong className="font-semibold text-zinc-700">
                        {project.completed}
                      </strong>{" "}
                      concluídas
                    </span>

                    {project.overdue > 0 && (
                      <span className="text-red-500">
                        <strong className="font-semibold">
                          {project.overdue}
                        </strong>{" "}
                        atrasadas
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="border-t border-zinc-200 pt-5 text-xs text-zinc-400">
          Dados sincronizados a partir do ClickUp.
        </div>
      </div>
    </div>
  );
}

function ProjectPriorityBadge({
  priority,
}: {
  priority: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        priority === "Alta"
          ? "bg-red-50 text-red-700"
          : priority === "Média"
            ? "bg-amber-50 text-amber-700"
            : priority === "Baixa"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-zinc-100 text-zinc-500"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          priority === "Alta"
            ? "bg-red-500"
            : priority === "Média"
              ? "bg-amber-500"
              : priority === "Baixa"
                ? "bg-emerald-500"
                : "bg-zinc-400"
        }`}
      />
      Prioridade do projeto: {priority}
    </span>
  );
}
function Metric({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-zinc-500">{title}</p>

      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}







