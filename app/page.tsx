"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPeriodRange, isDateInPeriod } from "@/lib/period";

import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FolderKanban,
  ListTodo,
  RefreshCw,
} from "lucide-react";

const metrics = [
  {
    title: "Projetos ativos",
    value: "18",
    description: "+2 nesta semana",
    icon: FolderKanban,
  },
  {
    title: "Demandas ativas",
    value: "127",
    description: "42 em desenvolvimento",
    icon: ListTodo,
  },
  {
    title: "Entregues",
    value: "31",
    description: "Nesta semana",
    icon: CheckCircle2,
  },
  {
    title: "Em atraso",
    value: "9",
    description: "Precisam de atenção",
    icon: AlertTriangle,
  },
];

const developers = [
  {
    name: "Gabriel Klein",
    initials: "GK",
    demands: 12,
    projects: 3,
    percentage: 78,
    status: "Normal",
  },
  {
    name: "Vitor Kravszenko",
    initials: "VK",
    demands: 18,
    projects: 4,
    percentage: 94,
    status: "Alta",
  },
  {
    name: "Lucas V.",
    initials: "LV",
    demands: 15,
    projects: 3,
    percentage: 82,
    status: "Normal",
  },
  {
    name: "Amanda Marino",
    initials: "AM",
    demands: 11,
    projects: 2,
    percentage: 68,
    status: "Normal",
  },
];

const deliveries = [
  {
    project: "Neto Veículos",
    demand: "Vínculo de clientes por lojista",
    date: "10/09",
    priority: "Alta",
  },
  {
    project: "GDBR",
    demand: "API Manual - GDBR",
    date: "10/09",
    priority: "Alta",
  },
  {
    project: "Correio",
    demand: "Ajustes no aplicativo",
    date: "11/09",
    priority: "Normal",
  },
  {
    project: "Datawake",
    demand: "Homologação e Go Live",
    date: "12/09",
    priority: "Normal",
  },
];

const statusData = [
  { label: "Em desenvolvimento", value: 42, percentage: 72 },
  { label: "Aguardando", value: 24, percentage: 48 },
  { label: "Em revisão", value: 18, percentage: 36 },
  { label: "Bloqueadas", value: 7, percentage: 14 },
  { label: "Concluídas", value: 31, percentage: 62 },
];

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">{title}</p>

          <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
          <Icon className="h-5 w-5 text-zinc-700" />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
        <ArrowUpRight className="h-3.5 w-3.5" />
        {description}
      </div>
    </div>
  );
}

function Attention({
  color,
  title,
  description,
}: {
  color: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="flex gap-3">
        <div className={`mt-1 h-2.5 w-2.5 rounded-full ${color}`} />

        <div>
          <p className="text-sm font-semibold">{title}</p>

          <p className="mt-1 text-xs leading-5 text-zinc-500">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const [periodType, setPeriodType] = useState<"day" | "week" | "next-week" | "month" | "next-month" | "custom">("week");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const period =
    periodType === "custom" && customStart && customEnd
      ? {
          type: "custom" as const,
          start: new Date(`${customStart}T00:00:00`),
          end: new Date(`${customEnd}T23:59:59.999`),
          label: `${customStart.split("-").reverse().join("/")} — ${customEnd.split("-").reverse().join("/")}`,
        }
      : getPeriodRange(periodType === "custom" ? "week" : periodType);

  const changePeriod = (value: string) => {
    setPeriodType(value as "day" | "week" | "next-week" | "month" | "next-month" | "custom");
  };

  const [cacheData, setCacheData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [metricsData, setMetricsData] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/clickup/cache", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Não foi possível carregar o cache do ClickUp.");
        }

        return response.json();
      })
      .then((data) => {
        setCacheData(data);
        setLastSyncedAt(data.lastSyncedAt || null);
      })
      .catch((error) =>
        console.error("Erro ao carregar cache:", error)
      )
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const start = period.start.toISOString();
    const end = period.end.toISOString();

    setMetricsLoading(true);

    fetch(
      `/api/clickup/metrics?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      { cache: "no-store" }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Não foi possível carregar as métricas.");
        }

        return response.json();
      })
      .then((data) => setMetricsData(data))
      .catch((error) =>
        console.error("Erro ao carregar métricas:", error)
      )
      .finally(() => setMetricsLoading(false));
  }, [period.start.getTime(), period.end.getTime()]);

  const tasks = Array.isArray(cacheData?.tasks)
    ? cacheData.tasks
    : [];

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
      ].includes(name)
    );
  };

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

  const activeTasks = tasks.filter((task: any) => {
    if (isDone(task)) return false

    const createdDate = parseDate(task.dates?.createdAt)
    const dueDate = parseDate(task.dates?.dueDate)

    return (
      isDateInPeriod(createdDate, period) ||
      isDateInPeriod(dueDate, period)
    )
  })
  const completedTasks = tasks.filter((task: any) => {
    if (!isDone(task)) return false;

    const completedDate = parseDate(task.dates?.dateDone);
    return isDateInPeriod(completedDate, period);
  });

  const periodTasks = tasks.filter((task: any) => {
    const createdDate = parseDate(task.dates?.createdAt);
    const completedDate = parseDate(task.dates?.dateDone);

    return (
      isDateInPeriod(createdDate, period) ||
      isDateInPeriod(completedDate, period)
    );
  });
  const createdInPeriod = tasks.filter((task: any) => {
    const createdDate = parseDate(task.dates?.createdAt)
    return isDateInPeriod(createdDate, period)
  })

  const getTaskTags = (task: any) =>
    Array.isArray(task.tags)
      ? task.tags.map((tag: any) =>
          String(typeof tag === "string" ? tag : tag?.name || "").toLowerCase().trim()
        )
      : []

  const hasTag = (task: any, keywords: string[]) => {
    const tags = getTaskTags(task)
    return tags.some((tag: string) =>
      keywords.some((keyword) => tag.includes(keyword))
    )
  }

  const bugsInPeriod = periodTasks.filter((task: any) => {
    const status = String(task.status?.name || "").toLowerCase()

    return (
      hasTag(task, ["bug", "bugs", "qa-bug"]) ||
      status.includes("bug")
    )
  })

  const improvementsInPeriod = periodTasks.filter((task: any) => {
    const status = String(task.status?.name || "").toLowerCase()

    return (
      hasTag(task, ["melhoria", "improvement"]) ||
      status.includes("melhoria")
    )
  })

  const creatorTotals = new Map<string, number>()

  createdInPeriod.forEach((task: any) => {
    const creatorName = String(
      task.creator?.name || "Sem criador"
    ).trim()

    creatorTotals.set(
      creatorName,
      (creatorTotals.get(creatorName) || 0) + 1
    )
  })

  const projectTotals = new Map<string, number>()

  periodTasks.forEach((task: any) => {
    const projectName = String(
      task.project?.name || "Sem projeto"
    ).trim()

    projectTotals.set(
      projectName,
      (projectTotals.get(projectName) || 0) + 1
    )
  })

  const priorityTotals = new Map<string, number>()

  periodTasks.forEach((task: any) => {
    const priority = String(
      task.priority?.name || "Não definida"
    ).trim()

    priorityTotals.set(
      priority,
      (priorityTotals.get(priority) || 0) + 1
    )
  })
  const creatorData = Array.from(creatorTotals.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const projectData = Array.from(projectTotals.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const priorityData = Array.from(priorityTotals.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
  const startOfToday = new Date();

  startOfToday.setHours(
    0,
    0,
    0,
    0
  );

  const overdueTasks = activeTasks.filter((task: any) => {
    const dueDate = parseDate(task.dates?.dueDate);

    return (
      dueDate !== null &&
      dueDate.getTime() <
        startOfToday.getTime()
    );
  });

  const activeProjects = new Set(
    activeTasks
      .map(
        (task: any) =>
          task.project?.id ||
          task.project?.name
      )
      .filter(Boolean)
  ).size;

  const nextWeekStart = new Date(period.end);
  nextWeekStart.setDate(nextWeekStart.getDate() + 1);
  nextWeekStart.setHours(0, 0, 0, 0);

  const nextWeekEnd = new Date(nextWeekStart);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
  nextWeekEnd.setHours(23, 59, 59, 999);

  const activeDeveloperDemandMap = new Map<string, number>();

  activeTasks.forEach((task: any) => {
    const dueDate = parseDate(task.dates?.dueDate);

    const dueNextWeek =
      dueDate !== null &&
      dueDate.getTime() >= nextWeekStart.getTime() &&
      dueDate.getTime() <= nextWeekEnd.getTime();

    if (!dueNextWeek) return;

    (task.responsible || []).forEach((person: any) => {
      const name = String(person.name || "").trim();

      if (name) {
        activeDeveloperDemandMap.set(
          name,
          (activeDeveloperDemandMap.get(name) || 0) + 1
        );
      }
    });
  });

  const getDemandPriority = (task: any) => {
    const priority = String(
      task.priority?.name || ""
    ).trim().toLowerCase();

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

  const planningTasks = activeTasks
    .map((task: any) => {
      const dueDate = parseDate(task.dates?.dueDate);
      const responsible = (task.responsible || [])
        .map((person: any) => String(person.name || "").trim())
        .filter(Boolean);

      const responsibleLoad = responsible.length
        ? Math.max(
            ...responsible.map(
              (name: string) =>
                activeDeveloperDemandMap.get(name) || 0
            )
          )
        : 0;

      const priority = getDemandPriority(task);
      const overdue =
        dueDate !== null &&
        dueDate.getTime() < startOfToday.getTime();

      const dueNextWeek =
        dueDate !== null &&
        dueDate.getTime() >= nextWeekStart.getTime() &&
        dueDate.getTime() <= nextWeekEnd.getTime();

      let planningStatus = "Planejada";

      if (overdue) {
        planningStatus = "Replanejar";
      } else if (
        priority === "Alta" &&
        dueNextWeek &&
        responsibleLoad >= 10
      ) {
        planningStatus = "Replanejar";
      } else if (
        dueNextWeek &&
        responsibleLoad >= 8
      ) {
        planningStatus = "Atenção";
      } else if (!dueDate) {
        planningStatus = "Sem prazo";
      }

      return {
        ...task,
        dueDate,
        responsible,
        responsibleLoad,
        priority,
        planningStatus,
      };
    })
    .filter(
      (task: any) =>
        (task.dueDate !== null &&
          task.dueDate.getTime() >= nextWeekStart.getTime() &&
          task.dueDate.getTime() <= nextWeekEnd.getTime()) ||
        task.planningStatus === "Sem prazo"
    )
    .sort((a: any, b: any) => {
      const order: Record<string, number> = {
        Replanejar: 0,
        Atenção: 1,
        Planejada: 2,
        "Sem prazo": 3,
      };

      const statusDifference =
        order[a.planningStatus] - order[b.planningStatus];

      if (statusDifference !== 0) {
        return statusDifference;
      }

      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;

      return a.dueDate.getTime() - b.dueDate.getTime();
    });

  const planningSummary = {
    total: planningTasks.length,
    planned: planningTasks.filter(
      (task: any) => task.planningStatus === "Planejada"
    ).length,
    attention: planningTasks.filter(
      (task: any) => task.planningStatus === "Atenção"
    ).length,
    replan: planningTasks.filter(
      (task: any) => task.planningStatus === "Replanejar"
    ).length,
    withoutDate: planningTasks.filter(
      (task: any) => task.planningStatus === "Sem prazo"
    ).length,
  };
  const liveMetrics = [
    {
      title: "Projetos ativos",
      value: loading ? "—" : String(activeProjects),
      description: "Com demandas em andamento",
      icon: FolderKanban,
    },
    {
      title: "Demandas ativas",
      value: loading ? "—" : String(activeTasks.length),
      description: "No período selecionado",
      icon: ListTodo,
    },
    {
      title: "Demandas criadas",
      value: loading ? "—" : String(createdInPeriod.length),
      description: "Criadas no período",
      icon: ArrowUpRight,
    },
    {
      title: "Entregues",
      value: loading ? "—" : String(completedTasks.length),
      description: "Concluídas no período",
      icon: CheckCircle2,
    },
    {
      title: "Bugs",
      value: String(bugsInPeriod.length),
      description: "Bugs identificados no período",
      icon: AlertTriangle,
    },
    {
      title: "Em atraso",
      value: String(overdueTasks.length),
      description: "Prazo vencido e não concluídas",
      icon: Clock3,
    },
  ];
  const developerMap = new Map<string, any>();

  activeTasks.forEach((task: any) => {
    const projectKey =
      task.project?.id ||
      task.project?.name;

    (task.responsible || []).forEach(
      (person: any) => {
        const personId = String(
          person.id || person.name || "sem-id"
        );

        const current =
          developerMap.get(personId) || {
            name:
              person.name ||
              "Sem nome",
            initials:
              person.initials ||
              (
                person.name ||
                "?"
              )
                .slice(0, 2)
                .toUpperCase(),
            demands: 0,
            projects: new Set<string>(),
            delayed: 0,
          };

        current.demands += 1;

        if (projectKey) {
          current.projects.add(
            String(projectKey)
          );
        }

        const dueDate =
          parseDate(
            task.dates?.dueDate
          );

        if (
          dueDate &&
          dueDate.getTime() <
            Date.now()
        ) {
          current.delayed += 1;
        }

        developerMap.set(
          personId,
          current
        );
      }
    );
  });

  const rawDevelopers =
    Array.from(
      developerMap.values()
    )
      .sort(
        (a, b) =>
          b.demands - a.demands
      )
      .slice(0, 4);

  const totalActiveDeveloperDemands =
    rawDevelopers.reduce(
      (total, developer) =>
        total + developer.demands,
      0
    );

  const liveDevelopers =
    rawDevelopers.map(
      (developer) => ({
        name: developer.name,
        initials: developer.initials,
        demands: developer.demands,
        projects:
          developer.projects.size,
        percentage:
          totalActiveDeveloperDemands
            ? Math.round(
                (developer.demands /
                  totalActiveDeveloperDemands) *
                  100
              )
            : 0,
        status:
          developer.delayed >= 5
            ? "Alta"
            : developer.delayed > 0
              ? "Atenção"
              : "Normal",
      })
    );

  const statusTotals: Record<string, number> = {};

  periodTasks.forEach((task: any) => {
    const statusName =
      String(task.status?.name || "").trim() || "Sem status";

    statusTotals[statusName] =
      (statusTotals[statusName] || 0) + 1;
  });

  const statusTotal = periodTasks.length;

  const liveStatusData =
    Object.entries(statusTotals)
      .sort(([, a], [, b]) => b - a)
      .map(([label, value]) => ({
        label,
        value,
        percentage: statusTotal
          ? Math.round((value / statusTotal) * 100)
          : 0,
      }));

  const formatDeliveryDate = (
    date: Date
  ) => {
    return date.toLocaleDateString(
      "pt-BR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  };
  const liveDeliveries =
    [...activeTasks]
      .map((task: any) => ({
        ...task,
        parsedDueDate:
          parseDate(
            task.dates?.dueDate
          ),
      }))
      .filter(
        (task: any) =>
          task.parsedDueDate &&
          task.parsedDueDate.getTime() >=
            startOfToday.getTime()
      )
      .sort(
        (a: any, b: any) =>
          a.parsedDueDate.getTime() -
          b.parsedDueDate.getTime()
      )
      .slice(0, 4)
      .map((task: any) => ({
        project:
          (
            task.project?.name &&
            task.project.name !== "hidden"
          )
            ? task.project.name
            : task.list?.name ||
              "Sem projeto",
        demand:
          task.name ||
          "Sem nome",
        date: formatDeliveryDate(
          task.parsedDueDate
        ),
        priority:
          [
            "urgent",
            "high",
            "alta",
            "urgente",
          ].includes(
            String(
              task.priority?.name ||
                ""
            ).toLowerCase()
          )
            ? "Alta"
            : "Normal",
      }));

  const formattedLastSync = lastSyncedAt
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(lastSyncedAt))
    : "Não disponível";
  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      {/* HEADER */}
      <header className="flex min-h-24 items-center justify-between border-b border-zinc-200 bg-white px-5 py-3 lg:px-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
            Visão geral
          </p>

          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            Dashboard Executivo
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Período analisado: <span className="font-medium text-slate-700">{period.label}</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Última sincronização com ClickUp: <span className="font-medium text-slate-600">{formattedLastSync}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select value={periodType} onChange={(e) => changePeriod(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none focus:border-slate-400">
  <option value="day">Diário</option>
  <option value="week">Semanal</option>
  <option value="month">Mensal</option>
  <option value="year">Anual</option>
  <option value="custom">Personalizado</option>
  <option value="all">Todos os períodos</option>
</select>

{periodType === "custom" && (
  <div className="flex items-center gap-2">
    <input
      type="date"
      value={customStart}
      onChange={(e) => setCustomStart(e.target.value)}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
      aria-label="Data inicial"
    />

    <span className="text-sm text-slate-400">até</span>

    <input
      type="date"
      value={customEnd}
      onChange={(e) => setCustomEnd(e.target.value)}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
      aria-label="Data final"
    />
  </div>
)}


        </div>
      </header>

      <div className="space-y-6 p-5 lg:p-8">
        {/* MÉTRICAS */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {liveMetrics.map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </section>

        {/* STATUS E ATENÇÃO */}
        <section className="grid gap-6 xl:grid-cols-5">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm xl:col-span-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Status das demandas</h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Distribuição das demandas atuais
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
                <BarChart3 className="h-4 w-4 text-zinc-600" />
              </div>
            </div>

            <div className="mt-7 space-y-5">
              {liveStatusData.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-zinc-600">{item.label}</span>

                    <span className="font-semibold text-zinc-900">
                      {item.value}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-zinc-900"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm xl:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Pontos de atenção</h2>

                <p className="mt-1 text-sm text-zinc-500">
                  O que precisa de atenção
                </p>
              </div>

              <AlertTriangle className="h-5 w-5 text-zinc-500" />
            </div>

            <div className="mt-6 space-y-3">
              <Attention
                color="bg-red-500"
                title={`${overdueTasks.length} demandas atrasadas`}
                description="Demandas que ultrapassaram o prazo definido."
              />

              <Attention
                color="bg-amber-500"
                title={`${activeTasks.filter((task: any) => { const priority = String(task.priority?.name || "").toLowerCase(); return !isDone(task) && ["urgent", "high"].includes(priority); }).length} demandas prioritárias`}
                description="Demandas de alta prioridade próximas do prazo."
              />

              <Attention
                color="bg-amber-500"
                title={`${periodTasks.filter((task: any) => String(task.status?.name || "").trim().toLowerCase() === "blocked").length} demandas bloqueadas`}
                description="Demandas que dependem de alguma ação externa."
              />
            </div>
          </div>
        </section>

        {/* ANÁLISE POR PROJETO */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Demandas por projeto</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Projetos com maior volume de demandas no período
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
              <FolderKanban className="h-4 w-4 text-zinc-600" />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {projectData.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Nenhuma demanda encontrada no período.
              </p>
            ) : (
              projectData.slice(0, 8).map((item) => {
                const maxValue = projectData[0]?.value || 1
                const percentage = Math.round((item.value / maxValue) * 100)

                return (
                  <div key={item.name}>
                    <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                      <span className="truncate font-medium text-zinc-700">
                        {item.name}
                      </span>
                      <span className="shrink-0 font-semibold text-zinc-900">
                        {item.value}
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-zinc-900 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
        {/* BUGS X MELHORIAS */}
        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Bugs identificados</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Bugs encontrados no período selecionado
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
                <AlertTriangle className="h-4 w-4 text-zinc-600" />
              </div>
            </div>

            <div className="mt-6 flex items-end justify-between">
              <span className="text-4xl font-semibold text-zinc-900">
                {bugsInPeriod.length}
              </span>

              <span className="text-sm text-zinc-500">
                demandas
              </span>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-zinc-900"
                style={{
                  width: `${Math.min(
                    100,
                    (bugsInPeriod.length / Math.max(periodTasks.length, 1)) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Melhorias identificadas</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Melhorias registradas no período selecionado
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
                <ArrowUpRight className="h-4 w-4 text-zinc-600" />
              </div>
            </div>

            <div className="mt-6 flex items-end justify-between">
              <span className="text-4xl font-semibold text-zinc-900">
                {improvementsInPeriod.length}
              </span>

              <span className="text-sm text-zinc-500">
                demandas
              </span>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-zinc-900"
                style={{
                  width: `${Math.min(
                    100,
                    (improvementsInPeriod.length / Math.max(periodTasks.length, 1)) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        </section>
        {/* DISTRIBUIÇÃO POR PRIORIDADE */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Distribuição por prioridade</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Nível de prioridade das demandas no período selecionado
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
              <BarChart3 className="h-4 w-4 text-zinc-600" />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {priorityData.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Nenhuma demanda encontrada no período.
              </p>
            ) : (
              priorityData.map((item) => {
                const total = periodTasks.length || 1
                const percentage = Math.round((item.value / total) * 100)

                return (
                  <div
                    key={item.name}
                    className="rounded-xl border border-zinc-200 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium text-zinc-600">
                        {item.name}
                      </span>

                      <span className="text-xl font-semibold text-zinc-900">
                        {item.value}
                      </span>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-zinc-900"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <p className="mt-2 text-xs text-zinc-500">
                      {percentage}% das demandas
                    </p>
                  </div>
                )
              })
            )}
          </div>
        </section>
        {/* DEMANDAS POR CRIADOR */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Demandas por criador</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Quantidade de demandas criadas no período selecionado
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
              <ListTodo className="h-4 w-4 text-zinc-600" />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {creatorData.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Nenhuma demanda criada no período.
              </p>
            ) : (
              creatorData.slice(0, 8).map((item) => {
                const maxValue = creatorData[0]?.value || 1
                const percentage = Math.round((item.value / maxValue) * 100)

                return (
                  <div key={item.name}>
                    <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                      <span className="truncate font-medium text-zinc-700">
                        {item.name}
                      </span>

                      <span className="shrink-0 font-semibold text-zinc-900">
                        {item.value}
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-zinc-900 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
        {/* EQUIPE */}
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 p-6">
            <div>
              <h2 className="font-semibold">Alocação da equipe</h2>

              <p className="mt-1 text-sm text-zinc-500">
                Distribuição atual das demandas por desenvolvedor
              </p>
            </div>

            <a
              href="/equipe"
              className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
            >
              Ver equipe
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
            {liveDevelopers.map((developer) => (
              <div
                key={developer.name}
                className="rounded-xl border border-zinc-200 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700">
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

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Ocupação</span>

                    <span className="font-semibold">
                      {developer.percentage}%
                    </span>
                  </div>

                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-zinc-900"
                      style={{ width: `${developer.percentage}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-zinc-500">
                    {developer.demands} demandas
                  </span>

                  <span
                    className={`rounded-full px-2 py-1 font-medium ${
                      developer.status === "Alta"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {developer.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PRÓXIMAS ENTREGAS */}
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 p-6">
            <div>
              <h2 className="font-semibold">Próximas entregas</h2>

              <p className="mt-1 text-sm text-zinc-500">
                Demandas previstas para os próximos dias
              </p>
            </div>

            <Clock3 className="h-5 w-5 text-zinc-400" />
          </div>

          <div className="divide-y divide-zinc-100">
            {liveDeliveries.map((delivery) => (
              <div
                key={delivery.demand}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
                    <FolderKanban className="h-4 w-4 text-zinc-600" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold">
                      {delivery.demand}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      {delivery.project}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 pl-14 sm:pl-0">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      delivery.priority === "Alta"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {delivery.priority}
                  </span>

                  <span className="text-sm font-semibold text-zinc-700">
                    {delivery.date}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7f7f8]" />}>
      <DashboardContent />
    </Suspense>
  );
}

















































