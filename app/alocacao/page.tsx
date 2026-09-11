"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  FolderKanban,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Responsible = {
  id?: string;
  name?: string;
  email?: string;
};

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
  responsible?: Responsible[] | Responsible | null;
  dates?: {
    dueDate?: string | null;
  };
};

type DeveloperAllocation = {
  id: string;
  name: string;
  initials: string;
  activeDemands: number;
  projects: number;
  delayed: number;
  participation: number;
  status: string;
};

type ProjectAllocationData = {
  name: string;
  developers: number;
  demands: number;
  percentage: number;
  delayed: number;
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

function isBlocked(task: Task) {
  const statusName = String(task.status?.name || "").toLowerCase().trim();

  return statusName === "blocked" || statusName === "bloqueado";
}

function getProject(task: Task) {
  const project = String(task.project?.name || "").trim();
  const list = String(task.list?.name || "").trim();

  if (!project || project.toLowerCase() === "hidden") {
    return list || "Sem projeto";
  }

  return project;
}

function getResponsibles(task: Task): Responsible[] {
  if (Array.isArray(task.responsible)) {
    return task.responsible.filter(
      (person) => person && (person.id || person.name)
    );
  }

  if (task.responsible && typeof task.responsible === "object") {
    return [task.responsible];
  }

  return [];
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function AlocacaoPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAllocation() {
      try {
        const response = await fetch("/api/clickup/cache", {
          cache: "no-store",
        });

        const data = await response.json();

        if (data.success && Array.isArray(data.tasks)) {
          setTasks(data.tasks);
        }
      } catch (error) {
        console.error("Erro ao carregar alocação:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAllocation();
  }, []);

  const activeTasks = useMemo(
    () => tasks.filter((task) => !isDone(task)),
    [tasks]
  );

  const developerAllocations = useMemo<DeveloperAllocation[]>(() => {
    const people = new Map<
      string,
      {
        id: string;
        name: string;
        demands: number;
        delayed: number;
        projects: Set<string>;
      }
    >();

    for (const task of activeTasks) {
      const responsibles = getResponsibles(task);

      for (const person of responsibles) {
        const id = String(
          person.id || person.email || person.name || ""
        ).trim();

        const name = String(person.name || "Sem nome").trim();

        if (!id || !name) {
          continue;
        }

        if (!people.has(id)) {
          people.set(id, {
            id,
            name,
            demands: 0,
            delayed: 0,
            projects: new Set<string>(),
          });
        }

        const developer = people.get(id)!;

        developer.demands += 1;
        developer.projects.add(getProject(task));

        if (isOverdue(task)) {
          developer.delayed += 1;
        }
      }
    }

    const totalDemands = Array.from(people.values()).reduce(
      (total, person) => total + person.demands,
      0
    );

    const averageDemands =
      people.size > 0 ? totalDemands / people.size : 0;

    return Array.from(people.values())
      .map((person) => {
        const participation =
          totalDemands > 0
            ? Math.round((person.demands / totalDemands) * 100)
            : 0;

        let status = "Normal";

        if (person.demands === 0) {
          status = "Disponível";
        } else if (
          averageDemands > 0 &&
          person.demands >= averageDemands * 1.5
        ) {
          status = "Alta";
        }

        return {
          id: person.id,
          name: person.name,
          initials: getInitials(person.name),
          activeDemands: person.demands,
          projects: person.projects.size,
          delayed: person.delayed,
          participation,
          status,
        };
      })
      .sort((a, b) => b.activeDemands - a.activeDemands);
  }, [activeTasks]);

  const projectAllocations = useMemo<ProjectAllocationData[]>(() => {
    const projects = new Map<
      string,
      {
        demands: number;
        developers: Set<string>;
        delayed: number;
      }
    >();

    for (const task of activeTasks) {
      const project = getProject(task);
      const responsibles = getResponsibles(task);

      if (!projects.has(project)) {
        projects.set(project, {
          demands: 0,
          developers: new Set<string>(),
          delayed: 0,
        });
      }

      const allocation = projects.get(project)!;

      allocation.demands += 1;

      for (const person of responsibles) {
        const id = String(
          person.id || person.email || person.name || ""
        ).trim();

        if (id) {
          allocation.developers.add(id);
        }
      }

      if (isOverdue(task)) {
        allocation.delayed += 1;
      }
    }

    const totalActive = activeTasks.length;

    return Array.from(projects.entries())
      .map(([name, allocation]) => ({
        name,
        developers: allocation.developers.size,
        demands: allocation.demands,
        percentage:
          totalActive > 0
            ? Math.round((allocation.demands / totalActive) * 100)
            : 0,
        delayed: allocation.delayed,
      }))
      .sort((a, b) => b.demands - a.demands);
  }, [activeTasks]);

  const activeDevelopers = developerAllocations.filter(
    (developer) => developer.activeDemands > 0
  );

  const totalActiveDemands = activeTasks.length;

  const highLoad = developerAllocations.filter(
    (developer) => developer.status === "Alta"
  ).length;

  const activeProjects = projectAllocations.length;

  const topProject = projectAllocations[0];

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <header className="border-b border-zinc-200 bg-white px-5 py-6 lg:px-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
            Gestão
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Alocação
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Visualize a distribuição da equipe entre projetos e demandas.
          </p>
        </div>
      </header>

      <div className="space-y-6 p-5 lg:p-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            title="Equipe"
            value={
              loading
                ? "—"
                : activeDevelopers.length.toLocaleString("pt-BR")
            }
            description="desenvolvedores com demandas ativas"
            icon={<Users className="h-4 w-4" />}
          />

          <Metric
            title="Demandas ativas"
            value={
              loading
                ? "—"
                : totalActiveDemands.toLocaleString("pt-BR")
            }
            description="demandas atualmente em aberto"
            icon={<BarChart3 className="h-4 w-4" />}
          />

          <Metric
            title="Alta concentração"
            value={
              loading
                ? "—"
                : highLoad.toLocaleString("pt-BR")
            }
            description="acima da média da equipe"
            icon={<AlertTriangle className="h-4 w-4" />}
          />

          <Metric
            title="Projetos acompanhados"
            value={
              loading
                ? "—"
                : activeProjects.toLocaleString("pt-BR")
            }
            description="com demandas ativas"
            icon={<FolderKanban className="h-4 w-4" />}
          />
        </section>

        {topProject && topProject.percentage >= 15 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />

              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Atenção na distribuição da equipe
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  O projeto <strong>{topProject.name}</strong> concentra{" "}
                  <strong>{topProject.percentage}%</strong> das demandas
                  ativas da equipe.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 p-6">
            <h2 className="font-semibold">
              Distribuição por desenvolvedor
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Visão consolidada da carga atual da equipe
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-zinc-500">
              Carregando alocação...
            </div>
          ) : developerAllocations.length === 0 ? (
            <div className="p-10 text-center text-sm text-zinc-500">
              Nenhum desenvolvedor com demandas atribuídas.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {developerAllocations.map((developer) => (
                <DeveloperRow
                  key={developer.id}
                  developer={developer}
                />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 p-6">
            <h2 className="font-semibold">
              Distribuição por projeto
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Projetos que concentram maior parte das demandas ativas
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-zinc-500">
              Carregando projetos...
            </div>
          ) : projectAllocations.length === 0 ? (
            <div className="p-10 text-center text-sm text-zinc-500">
              Nenhum projeto com demandas ativas.
            </div>
          ) : (
            <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
              {projectAllocations.map((project) => (
                <ProjectAllocation
                  key={project.name}
                  project={project}
                />
              ))}
            </div>
          )}
        </section>

        <div className="border-t border-zinc-200 pt-5 text-xs text-zinc-400">
          Dados sincronizados a partir do ClickUp. A distribuição é baseada
          na quantidade de demandas ativas atribuídas aos responsáveis.
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

function DeveloperRow({
  developer,
}: {
  developer: DeveloperAllocation;
}) {
  const bar =
    developer.status === "Alta"
      ? "bg-amber-500"
      : developer.activeDemands === 0
        ? "bg-zinc-300"
        : "bg-zinc-900";

  const statusStyle =
    developer.status === "Alta"
      ? "bg-amber-50 text-amber-700"
      : "bg-zinc-100 text-zinc-600";

  return (
    <div className="p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
        <div className="flex w-64 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold">
            {developer.initials}
          </div>

          <div>
            <p className="text-sm font-semibold">
              {developer.name}
            </p>

            <p className="text-xs text-zinc-400">
              {developer.projects} projetos
            </p>
          </div>
        </div>

        <div className="flex-1">
          <div className="mb-2 flex justify-between">
            <span className="text-xs text-zinc-500">
              Participação nas demandas
            </span>

            <span className="text-xs font-semibold">
              {developer.participation}%
            </span>
          </div>

          <div className="h-2 rounded-full bg-zinc-100">
            <div
              className={`h-full rounded-full ${bar}`}
              style={{
                width: `${Math.min(developer.participation, 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-8 xl:w-[420px] xl:justify-end">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-400">
              Demandas
            </p>

            <p className="mt-1 text-sm font-semibold">
              {developer.activeDemands}
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-400">
              Atrasadas
            </p>

            <p
              className={`mt-1 text-sm font-semibold ${
                developer.delayed > 0
                  ? "text-red-600"
                  : "text-zinc-700"
              }`}
            >
              {developer.delayed}
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${statusStyle}`}
          >
            {developer.status}
          </span>

          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-100"
            title="Ver demandas"
          >
            <ArrowUpRight className="h-4 w-4 text-zinc-500" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectAllocation({
  project,
}: {
  project: ProjectAllocationData;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
          <FolderKanban className="h-5 w-5 text-zinc-600" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {project.name}
          </p>

          <p className="mt-1 text-xs text-zinc-400">
            {project.developers} desenvolvedor
            {project.developers !== 1 ? "es" : ""} ·{" "}
            {project.demands} demandas
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex justify-between text-xs">
          <span className="text-zinc-500">
            Participação nas demandas
          </span>

          <span className="font-semibold">
            {project.percentage}%
          </span>
        </div>

        <div className="h-2 rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-zinc-900"
            style={{
              width: `${Math.min(project.percentage, 100)}%`,
            }}
          />
        </div>
      </div>

      {project.delayed > 0 && (
        <p className="mt-4 text-xs font-medium text-red-600">
          {project.delayed} demanda
          {project.delayed !== 1 ? "s" : ""} atrasada
          {project.delayed !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}



