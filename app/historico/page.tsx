"use client";

import { useEffect, useMemo, useState } from "react";

type Snapshot = {
  activeDevelopers?: number;
  file: string;
  timestamp: string;
  createdAt: string;
  statistics?: {
    totalTasks?: number;
    lists?: number;
    developers?: number;
    projects?: number;
    withDueDate?: number;
    withEstimate?: number;
    withTrackedTime?: number;
    statusCounts?: Record<string, number>;
    priorityCounts?: Record<string, number>;
  };
  tasks?: Array<{
    project?: {
      id?: string;
      name?: string;
    };
    list?: {
      id?: string;
      name?: string;
    };
    responsible?: Array<{
      id?: string;
      name?: string;
      email?: string;
    }>;
    status?: {
      name?: string;
      type?: string;
    };
  }>;
};

type HistoryResponse = {
  success: boolean;
  snapshots?: Snapshot[];
  error?: string;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getCompleted(snapshot: Snapshot) {
  const counts = snapshot.statistics?.statusCounts ?? {};

  return Object.entries(counts).reduce((total, [status, count]) => {
    const normalized = status
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (
      normalized === "closed" ||
      normalized === "completed" ||
      normalized === "histories" ||       normalized === "história" ||       normalized === "historia" ||
      normalized === "complete" ||
      normalized === "concluido" ||
      normalized === "concluida" ||
      normalized === "concluidas"
    ) {
      return total + count;
    }

    return total;
  }, 0);
}

function getActiveDevelopers(snapshot: Snapshot) {
  const people = new Set<string>();

  for (const task of snapshot.tasks ?? []) {
    const statusName = String(task.status?.name || "")
      .toLowerCase()
      .trim();

    const statusType = String(task.status?.type || "")
      .toLowerCase()
      .trim();

    const isDone =
      statusType === "done" ||
      statusType === "closed" ||
      [
        "closed",
        "complete",
        "completed",
        "histories",
        "história",
        "historia",
        "concluido",
        "concluida",
        "concluidas",
      ].includes(statusName);

    if (isDone) continue;

    for (const person of task.responsible ?? []) {
      const identifier =
        person.id || person.email || person.name;

      if (identifier) {
        people.add(identifier);
      }
    }
  }

  return people.size;
}

function getImprovements(snapshot: Snapshot) {
  const tasks = snapshot.tasks ?? [];

  const improvementTasks = tasks.filter((task) => {
    return String(task.status?.name || "").trim().toLowerCase() === "pending/melhoria";
  });

  const projects = new Set<string>();

  for (const task of improvementTasks) {
    const projectName = String(task.project?.name || "").trim();
    const listName = String(task.list?.name || "").trim();
    const projectId = String(task.project?.id || "").trim();

    if (projectName && projectName.toLowerCase() !== "hidden") {
      projects.add(projectId ? projectId + ":" + projectName : projectName);
    } else if (listName) {
      projects.add("list:" + listName);
    }
  }

  return {
    demands: improvementTasks.length,
    projects: projects.size,
  };
}
function getBugs(snapshot: Snapshot) {
  const counts = snapshot.statistics?.statusCounts ?? {};

  return Object.entries(counts).reduce((total, [status, count]) => {
    return status.toLowerCase().trim() === "pending/bug"
      ? total + count
      : total;
  }, 0);
}
function getActive(snapshot: Snapshot) {
  const total = snapshot.statistics?.totalTasks ?? 0;
  return Math.max(total - getCompleted(snapshot), 0);
}

function getBlocked(snapshot: Snapshot) {
  const counts = snapshot.statistics?.statusCounts ?? {};
  return Object.entries(counts).reduce((total, [status, count]) => {
    const normalized = status.toLowerCase();

    if (normalized.includes("blocked") || normalized.includes("bloquead")) {
      return total + count;
    }

    return total;
  }, 0);
}

function getInProgress(snapshot: Snapshot) {
  const counts = snapshot.statistics?.statusCounts ?? {};

  return Object.entries(counts).reduce((total, [status, count]) => {
    const normalized = status.toLowerCase();

    if (
      normalized.includes("in progress") ||
      normalized.includes("in review") ||
      normalized.includes("qa ")
    ) {
      return total + count;
    }

    return total;
  }, 0);
}

export default function HistoricoPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);

        const response = await fetch("/api/clickup/history", {
          cache: "no-store",
        });

        const data: HistoryResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error || "Não foi possível carregar o histórico."
          );
        }

        setSnapshots(data.snapshots ?? []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar o histórico."
        );
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  const orderedSnapshots = useMemo(
    () =>
      [...snapshots].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() -
          new Date(b.timestamp).getTime()
      ),
    [snapshots]
  );

  const filteredSnapshots = useMemo(() => {
    return orderedSnapshots.filter((snapshot) => {
      const snapshotDate = new Date(snapshot.timestamp);
      const start = startDate ? new Date(startDate + "T00:00:00") : null;
      const end = endDate ? new Date(endDate + "T23:59:59.999") : null;
      if (start && snapshotDate < start) return false;
      if (end && snapshotDate > end) return false;
      return true;
    });
  }, [orderedSnapshots, startDate, endDate]);

  const latest = filteredSnapshots[filteredSnapshots.length - 1];
  const periodStart =
    filteredSnapshots.length > 1
      ? filteredSnapshots[0]
      : undefined;

  const latestTotal = latest?.statistics?.totalTasks ?? 0;
  const latestCompleted = latest ? getCompleted(latest) : 0;
  const latestActive = latest ? getActive(latest) : 0;
  const latestBugs = latest ? getBugs(latest) : 0;
  const latestInProgress = latest ? getInProgress(latest) : 0;
  const latestDevelopers = latest?.activeDevelopers ?? 0;

  function variation(current: number, old?: number) {
    if (old === undefined) return null;
    return current - old;
  }

  const totalVariation = variation(
    latestTotal,
    periodStart?.statistics?.totalTasks
  );

  const completedVariation = variation(
    latestCompleted,
    periodStart ? getCompleted(periodStart) : undefined
  );

  const activeVariation = variation(
    latestActive,
    periodStart ? getActive(periodStart) : undefined
  );

  const bugsVariation = variation(
    latestBugs,
    periodStart ? getBugs(periodStart) : undefined
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f8fa] p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-slate-500">
              Carregando histórico do ClickUp...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f7f8fa] p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="text-xl font-semibold text-slate-900">
              Histórico
            </h1>
            <p className="mt-2 text-sm text-red-600">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <p className="text-sm font-medium text-slate-500">
            Acompanhamento de evolução
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Histórico
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Evolução real dos dados registrados nas sincronizações com o
            ClickUp.
          </p>
        </header>        
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Data inicial</label>
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400" />
            </div>

            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Data final</label>
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400" />
            </div>

            <button type="button" onClick={() => { setStartDate(""); setEndDate(""); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Limpar período
            </button>
          </div>
        </section>

        {filteredSnapshots.length === 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
              —
            </div>

            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              Nenhum registro no período
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              Ainda não existem snapshots registrados. Assim que uma
              sincronização histórica for realizada, os dados aparecerão aqui.
            </p>
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Demandas no histórico"
                value={formatNumber(latestTotal)}
                variation={totalVariation}
                positiveWhen="increase"
              />

              <MetricCard
                title="Concluídas"
                value={formatNumber(latestCompleted)}
                variation={completedVariation}
                positiveWhen="increase"
              />

              <MetricCard
                title="Em andamento"
                value={formatNumber(latestActive)}
                variation={activeVariation}
                positiveWhen="decrease"
              />

              <MetricCard
                title="Bugs"
                value={formatNumber(latestBugs)}
                variation={bugsVariation}
                positiveWhen="decrease"
              />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Situação atual
                  </h2>

                  <p className="text-sm text-slate-500">
                    Último snapshot do período selecionado.
                  </p>
                </div>

                <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                  {latest ? formatDate(latest.timestamp) : "-"}
                </span>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <InfoCard
                  label="Projetos"
                  value={formatNumber(latest?.statistics?.projects ?? 0)}
                />

                <InfoCard
                  label="Desenvolvedores"
                  value={formatNumber(
                    latestDevelopers
                  )}
                />

                <InfoCard
                  label="Demandas em desenvolvimento/revisão"
                  value={formatNumber(latestInProgress)}
                />
              </div>
            </section>

            <HistoryChart snapshots={filteredSnapshots} />
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Registros históricos
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Cada registro representa um snapshot real do ClickUp.
                </p>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                      <th className="pb-3 font-medium">Data</th>
                      <th className="pb-3 font-medium">Demandas</th>
                      <th className="pb-3 font-medium">Concluídas</th>
                      <th className="pb-3 font-medium">Ativas</th>
                      <th className="pb-3 font-medium">Bugs</th>
                      <th className="pb-3 font-medium">Projetos</th>
                    </tr>
                  </thead>

                  <tbody>
                    {[...filteredSnapshots].reverse().map((snapshot) => {
                      const completed = getCompleted(snapshot);
                      const active = getActive(snapshot);
                      const bugs = getBugs(snapshot);

                      return (
                        <tr
                          key={snapshot.file}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="py-4 text-sm font-medium text-slate-700">
                            {formatDate(snapshot.timestamp)}
                          </td>

                          <td className="py-4 text-sm text-slate-600">
                            {formatNumber(
                              snapshot.statistics?.totalTasks ?? 0
                            )}
                          </td>

                          <td className="py-4 text-sm text-slate-600">
                            {formatNumber(completed)}
                          </td>

                          <td className="py-4 text-sm text-slate-600">
                            {formatNumber(active)}
                          </td>

                          <td className="py-4 text-sm text-slate-600">
                            {formatNumber(bugs)}
                          </td>

                          <td className="py-4 text-sm text-slate-600">
                            {formatNumber(
                              snapshot.statistics?.projects ?? 0
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {orderedSnapshots.length === 1 && (
              <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    i
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Primeiro registro realizado
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Este é o primeiro snapshot histórico do projeto. Ainda
                      não existe um período anterior real para comparação.
                      Novos snapshots formarão automaticamente a evolução
                      histórica.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function HistoryChart({ snapshots }: { snapshots: Snapshot[] }) {
  if (snapshots.length < 2) {
    return null;
  }

  const width = 1000;
  const height = 300;
  const paddingX = 60;
  const paddingY = 35;

  const volumeSeries = [
    {
      name: "Demandas",
      getValue: (snapshot: Snapshot) =>
        snapshot.statistics?.totalTasks ?? 0,
      lineClass: "text-slate-900",
      dotClass: "fill-slate-900",
    },
    {
      name: "Concluídas",
      getValue: (snapshot: Snapshot) => getCompleted(snapshot),
      lineClass: "text-emerald-600",
      dotClass: "fill-emerald-600",
    },
    {
      name: "Ativas",
      getValue: (snapshot: Snapshot) => getActive(snapshot),
      lineClass: "text-blue-600",
      dotClass: "fill-blue-600",
    },
  ];

  const improvementsSeries = [
    {
      name: "Demandas de melhoria",
      getValue: (snapshot: Snapshot) => getImprovements(snapshot).demands,
      lineClass: "text-amber-500",
      dotClass: "fill-amber-500",
    },
    {
      name: "Projetos em melhoria",
      getValue: (snapshot: Snapshot) => getImprovements(snapshot).projects,
      lineClass: "text-blue-500",
      dotClass: "fill-blue-500",
    },
  ];

  function Chart({
    title,
    description,
    series,
  }: {
    title: string;
    description: string;
    series: {
      name: string;
      getValue: (snapshot: Snapshot) => number;
      lineClass: string;
      dotClass: string;
    }[];
  }) {
    const values = snapshots.flatMap((snapshot) =>
      series.map((item) => item.getValue(snapshot))
    );

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = Math.max(maxValue - minValue, 1);

    function getX(index: number) {
      return (
        paddingX +
        (index / (snapshots.length - 1)) *
          (width - paddingX * 2)
      );
    }

    function getY(value: number) {
      return (
        height -
        paddingY -
        ((value - minValue) / range) *
          (height - paddingY * 2)
      );
    }

    function buildPoints(
      getValue: (snapshot: Snapshot) => number
    ) {
      return snapshots
        .map(
          (snapshot, index) =>
            `${getX(index)},${getY(getValue(snapshot))}`
        )
        .join(" ");
    }

    return (
      <div>
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            {title}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        </div>

        <div className="mt-5 overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-[260px] min-w-[760px] w-full"
            role="img"
            aria-label={title}
          >
            {(series.length === 1
              ? [0, 0.5, 1]
              : [0, 0.25, 0.5, 0.75, 1]
            ).map((step, index) => {
              const y =
                paddingY +
                step * (height - paddingY * 2);

              const value = Math.round(
                maxValue - step * range
              );

              return (
                <g key={index}>
                  <line
                    x1={paddingX}
                    x2={width - paddingX}
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    className="text-slate-100"
                  />
                  <text
                    x={paddingX - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-400 text-[11px]"
                  >
                    {formatNumber(value)}
                  </text>
                </g>
              );
            })}

            {series.map((item) => (
              <g key={item.name}>
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={buildPoints(item.getValue)}
                  className={item.lineClass}
                />

                {snapshots.map((snapshot, index) => (
                  <circle
                    key={`${item.name}-${snapshot.file}`}
                    cx={getX(index)}
                    cy={getY(item.getValue(snapshot))}
                    r="5"
                    className={item.dotClass}
                  />
                ))}
              </g>
            ))}

            {snapshots.map((snapshot, index) => (
              <text
                key={snapshot.file}
                x={getX(index)}
                y={height - 8}
                textAnchor="middle"
                className="fill-slate-400 text-[11px]"
              >
                {formatDate(snapshot.timestamp)}
              </text>
            ))}
          </svg>
        </div>

        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
          {series.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-2"
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${item.dotClass}`}
              />
              {item.name}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Evolução dos indicadores
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Comparação baseada nos snapshots reais registrados.
          </p>
        </div>

        <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
          {snapshots.length} registros
        </span>
      </div>

      <div className="mt-7 space-y-8">
        <Chart
          title="Volume de trabalho"
          description="Evolução das demandas registradas, concluídas e ativas."
          series={volumeSeries}
        />

        <div className="border-t border-slate-100 pt-8">
          <Chart
            title="Evolução das melhorias"
            description="Evolução das demandas e dos projetos em melhoria."
            series={improvementsSeries}
          />
        </div>
      </div>
    </section>
  );
}
function MetricCard({
  title,
  value,
  variation,
  positiveWhen,
}: {
  title: string;
  value: string;
  variation: number | null;
  positiveWhen: "increase" | "decrease";
}) {
  const isIncrease = variation !== null && variation > 0;
  const isDecrease = variation !== null && variation < 0;

  const isGood =
    variation !== null &&
    ((positiveWhen === "increase" && isIncrease) ||
      (positiveWhen === "decrease" && isDecrease));

  const isBad =
    variation !== null &&
    ((positiveWhen === "increase" && isDecrease) ||
      (positiveWhen === "decrease" && isIncrease));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-3xl font-bold tracking-tight text-slate-900">
          {value}
        </p>

        {variation !== null && (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              isGood
                ? "bg-emerald-50 text-emerald-700"
                : isBad
                  ? "bg-red-50 text-red-700"
                  : "bg-slate-100 text-slate-500"
            }`}
          >
            {variation > 0 ? "+" : ""}
            {formatNumber(variation)}
          </span>
        )}
      </div>

      <p className="mt-2 text-xs text-slate-400">
        {variation === null
          ? "Sem período anterior para comparação"
          : variation === 0
            ? "Sem alteração no período"
            : title === "Bugs"
              ? variation < 0
                ? "Redução de bugs no período"
                : "Aumento de bugs no período"
              : title === "Em andamento"
                ? variation < 0
                  ? "Redução do estoque de demandas"
                  : "Aumento do estoque de demandas"
                : title === "Concluídas"
                  ? variation > 0
                    ? "Aumento de entregas no período"
                    : "Redução de entregas no período"
                  : variation > 0
                    ? "Aumento de demandas no histórico"
                    : "Redução de demandas no histórico"}
      </p>
    </div>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}















































