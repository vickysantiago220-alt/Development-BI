"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Search,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Responsible = {
  id?: string;
  name?: string;
  email?: string;
  initials?: string;
  profilePicture?: string | null;
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

type Developer = {
  id: string;
  name: string;
  initials: string;
  role: string;
  projects: number;
  demands: number;
  completed: number;
  delayed: number;
  loadPercentage: number;
  status: string;
  mainProjects: string[];
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

export default function EquipePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadTeam() {
      try {
        const response = await fetch("/api/clickup/cache", {
          cache: "no-store",
        });

        const data = await response.json();

        if (data.success && Array.isArray(data.tasks)) {
          setTasks(data.tasks);
        }
      } catch (error) {
        console.error("Erro ao carregar equipe:", error);
      } finally {
        setLoading(false);
      }
    }

    loadTeam();
  }, []);

  const developers = useMemo<Developer[]>(() => {
    const people = new Map<
      string,
      {
        id: string;
        name: string;
        completed: number;
        active: number;
        delayed: number;
        projects: Set<string>;
      }
    >();

    for (const task of tasks) {
      const responsibles = getResponsibles(task);

      for (const person of responsibles) {
        const id = String(person.id || person.email || person.name || "").trim();
        const name = String(person.name || "Sem nome").trim();

        if (!id || !name) {
          continue;
        }

        if (!people.has(id)) {
          people.set(id, {
            id,
            name,
            completed: 0,
            active: 0,
            delayed: 0,
            projects: new Set<string>(),
          });
        }

        const developer = people.get(id)!;

        if (isDone(task)) {
          developer.completed += 1;
        } else {
          developer.active += 1;

          if (isOverdue(task)) {
            developer.delayed += 1;
          }

          developer.projects.add(getProject(task));
        }
      }
    }

    const activeDevelopers = Array.from(people.values()).filter(
      (developer) => developer.active > 0
    );

    const totalActive = activeDevelopers.reduce(
      (total, developer) => total + developer.active,
      0
    );

    const averageActive =
      activeDevelopers.length > 0
        ? totalActive / activeDevelopers.length
        : 0;

    return Array.from(people.values())
      .filter((developer) => developer.active > 0)
      .map((developer) => {
        const loadPercentage =
          totalActive > 0
            ? Math.round((developer.active / totalActive) * 100)
            : 0;

        let status = "Disponível";

        if (developer.active > 0) {
          if (
            averageActive > 0 &&
            developer.active >= averageActive * 1.5
          ) {
            status = "Alta";
          } else {
            status = "Normal";
          }
        }

        return {
          id: developer.id,
          name: developer.name,
          initials: getInitials(developer.name),
          role: "Desenvolvedor",
          projects: developer.projects.size,
          demands: developer.active,
          completed: developer.completed,
          delayed: developer.delayed,
          loadPercentage,
          status,
          mainProjects: Array.from(developer.projects).slice(0, 4),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [tasks]);

  const filteredDevelopers = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) {
      return developers;
    }

    return developers.filter((developer) =>
      developer.name.toLowerCase().includes(term)
    );
  }, [developers, search]);

  const activeDevelopers = developers.filter(
    (developer) => developer.demands > 0
  );

  const assignedDemands = activeDevelopers.reduce(
    (total, developer) => total + developer.demands,
    0
  );

  const highLoad = developers.filter(
    (developer) => developer.status === "Alta"
  ).length;

  const available = developers.filter(
    (developer) => developer.demands === 0
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
              Equipe
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Acompanhe a distribuição de demandas e a carga da equipe.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 shadow-sm">
              <Search className="h-4 w-4 text-zinc-400" />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar desenvolvedor..."
                className="w-48 bg-transparent text-sm outline-none placeholder:text-zinc-400"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-6 p-5 lg:p-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            title="Desenvolvedores ativos"
            value={
              loading
                ? "—"
                : activeDevelopers.length.toLocaleString("pt-BR")
            }
            icon={<Users className="h-4 w-4" />}
          />

          <Metric
            title="Demandas atribuídas"
            value={
              loading
                ? "—"
                : assignedDemands.toLocaleString("pt-BR")
            }
            icon={<CheckCircle2 className="h-4 w-4" />}
          />

          <Metric
            title="Alta carga"
            value={
              loading
                ? "—"
                : highLoad.toLocaleString("pt-BR")
            }
            icon={<AlertTriangle className="h-4 w-4" />}
          />

          <Metric
            title="Disponíveis"
            value={
              loading
                ? "—"
                : available.toLocaleString("pt-BR")
            }
            icon={<Clock3 className="h-4 w-4" />}
          />
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 p-6">
            <div>
              <h2 className="font-semibold">Desenvolvedores</h2>

              <p className="mt-1 text-sm text-zinc-500">
                Visão consolidada da equipe de desenvolvimento
              </p>
            </div>

            <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600">
              {loading
                ? "Carregando..."
                : `${developers.length} pessoas`}
            </span>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-zinc-500">
              Carregando equipe...
            </div>
          ) : filteredDevelopers.length === 0 ? (
            <div className="p-10 text-center text-sm text-zinc-500">
              Nenhum desenvolvedor encontrado.
            </div>
          ) : (
            <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredDevelopers.map((developer) => (
                <DeveloperCard
                  key={developer.id}
                  developer={developer}
                />
              ))}
            </div>
          )}
        </section>

        <div className="border-t border-zinc-200 pt-5 text-xs text-zinc-400">
          Dados sincronizados a partir do ClickUp. A carga é calculada pela
          quantidade de demandas ativas atribuídas a cada desenvolvedor.
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
        <p className="text-sm text-zinc-500">{title}</p>

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

function DeveloperCard({
  developer,
}: {
  developer: Developer;
}) {
  const occupancyColor =
    developer.status === "Alta"
      ? "bg-amber-500"
      : developer.demands === 0
        ? "bg-zinc-300"
        : "bg-zinc-900";

  const statusStyle =
    developer.status === "Alta"
      ? "bg-amber-50 text-amber-700"
      : developer.status === "Disponível"
        ? "bg-zinc-100 text-zinc-600"
        : "bg-zinc-100 text-zinc-600";

  return (
    <div className="rounded-2xl border border-zinc-200 p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700">
            {developer.initials}
          </div>

          <div>
            <p className="text-sm font-semibold">
              {developer.name}
            </p>

            <p className="mt-1 text-xs text-zinc-400">
              {developer.role}
            </p>
          </div>
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle}`}
        >
          {developer.status}
        </span>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            Participação na carga
          </span>

          <span className="text-xs font-semibold">
            {developer.loadPercentage}%
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
          <div
            className={`h-full rounded-full ${occupancyColor}`}
            style={{ width: `${developer.loadPercentage}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <MiniMetric
          label="Ativas"
          value={developer.demands}
        />

        <MiniMetric
          label="Concluídas"
          value={developer.completed}
        />

        <MiniMetric
          label="Atrasadas"
          value={developer.delayed}
        />
      </div>

      <div className="mt-5 border-t border-zinc-100 pt-4">
        <p className="mb-3 text-xs font-medium text-zinc-500">
          Principais projetos
        </p>

        <div className="space-y-2">
          {developer.mainProjects.length === 0 ? (
            <p className="text-xs text-zinc-400">
              Nenhum projeto ativo
            </p>
          ) : (
            developer.mainProjects.map((project) => (
              <div
                key={project}
                className="flex items-center gap-2 text-xs text-zinc-600"
              >
                <FolderKanban className="h-3.5 w-3.5 text-zinc-400" />
                {project}
              </div>
            ))
          )}
        </div>
      </div>

      <button
        onClick={() =>
          (window.location.href = `/demandas?responsavel=${encodeURIComponent(developer.name)}`)
        }
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 py-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
      >
        Ver demandas
        <ArrowUpRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-zinc-50 p-3">
      <p className="text-[10px] uppercase tracking-wide text-zinc-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-semibold">
        {value.toLocaleString("pt-BR")}
      </p>
    </div>
  );
}




