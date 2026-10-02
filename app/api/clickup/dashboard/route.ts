import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type DateRange = { start: Date; end: Date };
type ComparisonMode = "none" | "previous" | "custom";
type MainPeriodType = "day" | "week" | "next-week" | "month" | "next-month" | "year" | "all" | "custom";
type PeriodComparison = {
  current: number;
  previous: number | null;
  variation: number | null;
};
type TimeSeriesPoint = {
  label: string;
  start: string;
  created: number;
  completed: number;
  bugsCreated: number;
  bugsCompleted: number;
  improvementsCreated: number;
  improvementsCompleted: number;
};
type DemandTypeMetric = {
  type: string;
  created: PeriodComparison;
  completed: PeriodComparison;
};
type DemandTypeRule = {
  type: string;
};
type ExecutiveInsight = {
  id: string;
  tone: "positive" | "negative" | "neutral";
  text: string;
};
type DashboardAnalytics = {
  period: { start: string; end: string };
  comparison: {
    mode: ComparisonMode;
    start: string | null;
    end: string | null;
  };
  periods: {
    current: { start: string; end: string };
    previous: { start: string; end: string } | null;
    comparison: { start: string; end: string } | null;
  };
  compareMode: ComparisonMode;
  demandCreation: PeriodComparison;
  completion: PeriodComparison;
  improvements: {
    created: PeriodComparison;
    completed: PeriodComparison;
  };
  bugs: { created: PeriodComparison; completed: PeriodComparison };
  demandTypes: DemandTypeMetric[];
  timeSeries: TimeSeriesPoint[];
  comparisonTimeSeries: TimeSeriesPoint[];
  timeSeriesGranularity: "day" | "week" | "month";
  insights: ExecutiveInsight[];
};

type DatabaseEventRow = {
  eventDate: string;
  eventKind: "created" | "completed";
  total: number | string;
  bugs: number | string;
  improvements: number | string;
};

const demandTypeRules: DemandTypeRule[] = [
  { type: "Bug" },
  { type: "Melhoria" },
];

function parseDate(value: string | null | undefined, endOfDay = false) {
  if (!value) return null;
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsed = dateOnly
    ? new Date(
        Date.UTC(
          Number(dateOnly[1]),
          Number(dateOnly[2]) - 1,
          Number(dateOnly[3]),
          endOfDay ? 23 : 0,
          endOfDay ? 59 : 0,
          endOfDay ? 59 : 0,
          endOfDay ? 999 : 0
        )
      )
    : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function contains(date: Date | null, range: DateRange | null) {
  return Boolean(date && range && date >= range.start && date <= range.end);
}

function getPreviousRange(current: DateRange, periodType: MainPeriodType): DateRange | null {
  const start = current.start;
  const end = current.end;
  const isCompleteMonth = periodType === "month" || periodType === "next-month";
  const lastCurrentDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  if (isCompleteMonth && start.getUTCDate() === 1 && end.getUTCDate() === lastCurrentDay) {
    const previousYear = start.getUTCMonth() === 0 ? start.getUTCFullYear() - 1 : start.getUTCFullYear();
    const previousMonth = (start.getUTCMonth() + 11) % 12;
    const previousLastDay = new Date(Date.UTC(previousYear, previousMonth + 1, 0)).getUTCDate();
    const previousStart = new Date(
      Date.UTC(previousYear, previousMonth, 1)
    );
    return {
      start: previousStart,
      end: new Date(Date.UTC(previousYear, previousMonth, previousLastDay, 23, 59, 59, 999)),
    };
  }

  if (periodType === "year" && start.getUTCMonth() === 0 && start.getUTCDate() === 1) {
    const previousYear = start.getUTCFullYear() - 1;
    return {
      start: new Date(Date.UTC(previousYear, 0, 1)),
      end: new Date(Date.UTC(previousYear, 11, 31, 23, 59, 59, 999)),
    };
  }

  const durationDays = Math.floor((Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) - Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())) / 86_400_000) + 1;
  if (!Number.isFinite(durationDays) || durationDays <= 0 || durationDays > 36_600) return null;

  const previousStart = new Date(start);
  previousStart.setUTCDate(previousStart.getUTCDate() - durationDays);
  const previousEnd = new Date(previousStart);
  previousEnd.setUTCDate(previousEnd.getUTCDate() + durationDays - 1);
  previousEnd.setUTCHours(23, 59, 59, 999);
  return { start: previousStart, end: previousEnd };
}

function formatCalendarDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function variation(current: number, previous: number | null) {
  if (previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function comparison(current: number, previous: number | null): PeriodComparison {
  return { current, previous, variation: variation(current, previous) };
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(Math.abs(value))}%`;
}

function floorBucket(date: Date, granularity: "day" | "week" | "month") {
  const bucket = new Date(date);
  bucket.setUTCHours(0, 0, 0, 0);
  if (granularity === "week") {
    bucket.setUTCDate(bucket.getUTCDate() - ((bucket.getUTCDay() + 6) % 7));
  } else if (granularity === "month") {
    bucket.setUTCDate(1);
  }
  return bucket;
}

function addBucket(date: Date, granularity: "day" | "week" | "month") {
  const next = new Date(date);
  if (granularity === "day") next.setUTCDate(next.getUTCDate() + 1);
  else if (granularity === "week") next.setUTCDate(next.getUTCDate() + 7);
  else next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

function formatBucketLabel(date: Date, granularity: "day" | "week" | "month") {
  return new Intl.DateTimeFormat("pt-BR", {
    ...(granularity === "month" ? { month: "short", year: "2-digit" } : { day: "2-digit", month: "2-digit" }),
    timeZone: "UTC",
  }).format(date);
}

function buildDatabaseTimeSeries(rows: DatabaseEventRow[], range: DateRange) {
  const durationDays = Math.ceil((range.end.getTime() - range.start.getTime() + 1) / 86_400_000);
  const granularity: "day" | "week" | "month" = durationDays <= 35 ? "day" : durationDays <= 366 ? "week" : "month";
  const counts = new Map<string, Omit<TimeSeriesPoint, "label" | "start">>();

  const getBucketCounts = (date: Date) => {
    const key = floorBucket(date, granularity).toISOString();
    const value = counts.get(key) || {
      created: 0,
      completed: 0,
      bugsCreated: 0,
      bugsCompleted: 0,
      improvementsCreated: 0,
      improvementsCompleted: 0,
    };
    counts.set(key, value);
    return value;
  };

  for (const row of rows) {
    const date = parseDate(row.eventDate);
    if (!date || !contains(date, range)) continue;
    const value = getBucketCounts(date);
    const suffix = row.eventKind === "created" ? "Created" : "Completed";
    value[row.eventKind] += Number(row.total || 0);
    value[`bugs${suffix}` as "bugsCreated" | "bugsCompleted"] += Number(row.bugs || 0);
    value[`improvements${suffix}` as "improvementsCreated" | "improvementsCompleted"] += Number(row.improvements || 0);
  }

  const bucketDates = Array.from(counts.keys()).map((key) => new Date(key)).sort((a, b) => a.getTime() - b.getTime());
  const firstBucket = bucketDates[0];
  const lastBucket = bucketDates.at(-1);
  if (!firstBucket || !lastBucket) return { points: [] as TimeSeriesPoint[], granularity };

  const points: TimeSeriesPoint[] = [];
  for (let bucket = firstBucket; bucket <= lastBucket; bucket = addBucket(bucket, granularity)) {
    const key = bucket.toISOString();
    points.push({
      label: formatBucketLabel(bucket, granularity),
      start: key,
      ...(counts.get(key) || {
        created: 0,
        completed: 0,
        bugsCreated: 0,
        bugsCompleted: 0,
        improvementsCreated: 0,
        improvementsCompleted: 0,
      }),
    });
  }
  return { points, granularity };
}

function makeInsights(
  creation: PeriodComparison,
  completion: PeriodComparison,
  improvements: PeriodComparison,
  improvementCreated: number,
  comparisonLabel: string
): ExecutiveInsight[] {
  const insights: ExecutiveInsight[] = [];
  if (creation.variation !== null) {
    const direction = creation.variation > 0 ? "aumentou" : creation.variation < 0 ? "diminuiu" : "ficou estável";
    insights.push({
      id: "demand-creation-change",
      tone: creation.variation > 0 ? "positive" : creation.variation < 0 ? "negative" : "neutral",
      text: `A criação de demandas ${direction} ${formatPercent(creation.variation)} em relação ao ${comparisonLabel}.`,
    });
  }
  if (creation.current > 0 || completion.current > 0) {
    insights.push({
      id: "created-versus-completed",
      tone: creation.current > completion.current ? "negative" : "positive",
      text: `${Math.abs(creation.current - completion.current)} demandas ${creation.current > completion.current ? "a mais foram criadas do que concluídas" : "a mais foram concluídas do que criadas"} no período.`,
    });
    if (creation.current > 0) {
      insights.push({
        id: "improvement-share",
        tone: "neutral",
        text: `Melhorias representam ${formatPercent((improvementCreated / creation.current) * 100)} das demandas criadas no período.`,
      });
    }
  }
  if (improvements.variation !== null && improvements.variation !== 0) {
    insights.push({
      id: "improvement-change",
      tone: improvements.variation > 0 ? "positive" : "negative",
      text: `A criação de melhorias ${improvements.variation > 0 ? "aumentou" : "diminuiu"} ${formatPercent(improvements.variation)} em relação ao ${comparisonLabel}.`,
    });
  }
  return insights;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const start = parseDate(url.searchParams.get("start"));
  const end = parseDate(url.searchParams.get("end"), true);
  const compareModeValue = url.searchParams.get("compare") || "none";
  const periodTypeValue = url.searchParams.get("periodType") || "custom";
  if (!(compareModeValue === "none" || compareModeValue === "previous" || compareModeValue === "custom")) {
    return NextResponse.json({ success: false, error: "Modo de comparação inválido." }, { status: 400 });
  }
  if (!(periodTypeValue === "day" || periodTypeValue === "week" || periodTypeValue === "next-week" || periodTypeValue === "month" || periodTypeValue === "next-month" || periodTypeValue === "year" || periodTypeValue === "all" || periodTypeValue === "custom")) {
    return NextResponse.json({ success: false, error: "Tipo de período inválido." }, { status: 400 });
  }
  const compareMode: ComparisonMode = compareModeValue;
  const periodType: MainPeriodType = periodTypeValue;
  if (!start || !end || start > end) {
    return NextResponse.json(
      { success: false, error: "Informe um intervalo válido em start e end." },
      { status: 400 }
    );
  }

  let comparisonRange: DateRange | null = null;
  if (compareMode === "previous") {
    comparisonRange = getPreviousRange({ start, end }, periodType);
    if (!comparisonRange) {
      return NextResponse.json({ success: false, error: "Não foi possível calcular o período anterior equivalente." }, { status: 400 });
    }
  } else if (compareMode === "custom") {
    const compareStart = parseDate(url.searchParams.get("compareStart"));
    const compareEnd = parseDate(url.searchParams.get("compareEnd"), true);
    if (!compareStart || !compareEnd || compareStart > compareEnd) {
      return NextResponse.json(
        { success: false, error: "Informe um intervalo válido em compareStart e compareEnd." },
        { status: 400 }
      );
    }
    comparisonRange = { start: compareStart, end: compareEnd };
  }

  try {
    const currentRange = { start, end };
    const databaseEvents = await getDatabaseEvents(
      comparisonRange ? [currentRange, comparisonRange] : [currentRange]
    );

    const countEvent = (
      range: DateRange | null,
      eventKind: "created" | "completed",
      type?: string
    ) => {
      const metric = type === "Bug" ? "bugs" : type === "Melhoria" ? "improvements" : "total";
      return sumDatabaseEvents(databaseEvents, range, eventKind, metric);
    };
    const countCreated = (range: DateRange | null, type?: string) =>
      countEvent(range, "created", type);
    const countCompleted = (range: DateRange | null, type?: string) =>
      countEvent(range, "completed", type);

    const created = countCreated(currentRange);
    const previousCreated = comparisonRange ? countCreated(comparisonRange) : null;
    const completed = countCompleted(currentRange);
    const previousCompleted = comparisonRange ? countCompleted(comparisonRange) : null;
    const improvementCreated = countCreated(currentRange, "Melhoria");
    const previousImprovementCreated = comparisonRange ? countCreated(comparisonRange, "Melhoria") : null;
    const improvementCompleted = countCompleted(currentRange, "Melhoria");
    const previousImprovementCompleted = comparisonRange ? countCompleted(comparisonRange, "Melhoria") : null;
    const bugCreated = countCreated(currentRange, "Bug");
    const previousBugCreated = comparisonRange ? countCreated(comparisonRange, "Bug") : null;
    const bugCompleted = countCompleted(currentRange, "Bug");
    const previousBugCompleted = comparisonRange ? countCompleted(comparisonRange, "Bug") : null;

    const series = buildDatabaseTimeSeries(databaseEvents, currentRange);
    const comparisonSeries = comparisonRange
      ? buildDatabaseTimeSeries(databaseEvents, comparisonRange)
      : { points: [] as TimeSeriesPoint[], granularity: series.granularity };
    const creationComparison = comparison(created, previousCreated);
    const completionComparison = comparison(completed, previousCompleted);
    const improvementComparison = comparison(improvementCreated, previousImprovementCreated);

    const result: DashboardAnalytics = {
      period: { start: formatCalendarDate(start), end: formatCalendarDate(end) },
      comparison: {
        mode: compareMode,
        start: comparisonRange ? formatCalendarDate(comparisonRange.start) : null,
        end: comparisonRange ? formatCalendarDate(comparisonRange.end) : null,
      },
      periods: {
        current: { start: formatCalendarDate(start), end: formatCalendarDate(end) },
        previous: compareMode === "previous" && comparisonRange
          ? { start: formatCalendarDate(comparisonRange.start), end: formatCalendarDate(comparisonRange.end) }
          : null,
        comparison: comparisonRange
          ? { start: formatCalendarDate(comparisonRange.start), end: formatCalendarDate(comparisonRange.end) }
          : null,
      },
      compareMode,
      demandCreation: creationComparison,
      completion: completionComparison,
      improvements: {
        created: improvementComparison,
        completed: comparison(improvementCompleted, previousImprovementCompleted),
      },
      bugs: {
        created: comparison(bugCreated, previousBugCreated),
        completed: comparison(bugCompleted, previousBugCompleted),
      },
      demandTypes: demandTypeRules.map(({ type }) => {
        const currentCreated = countCreated(currentRange, type);
        const previousCreatedForType = comparisonRange ? countCreated(comparisonRange, type) : null;
        const currentCompleted = countCompleted(currentRange, type);
        const previousCompletedForType = comparisonRange ? countCompleted(comparisonRange, type) : null;
        return {
          type,
          created: comparison(currentCreated, previousCreatedForType),
          completed: comparison(currentCompleted, previousCompletedForType),
        };
      }),
      timeSeries: series.points,
      comparisonTimeSeries: comparisonSeries.points,
      timeSeriesGranularity: series.granularity,
      insights: makeInsights(
        creationComparison,
        completionComparison,
        improvementComparison,
        improvementCreated,
        compareMode === "previous" ? "período anterior" : "período comparativo"
      ),
    };

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Erro ao agregar analytics da Visão Geral:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Não foi possível calcular as analytics.",
      },
      { status: 500 }
    );
  }
}

async function getDatabaseEvents(ranges: DateRange[]) {
  const dateConditions = (column: "date_created" | "date_done") =>
    ranges.map(() => `(${column} >= ? AND ${column} <= ?)`).join(" OR ");
  const parameters = ranges.flatMap((range) => [range.start.toISOString(), range.end.toISOString()]);
  const [rows] = await db.query(
    `
      SELECT
        DATE_FORMAT(event_date, '%Y-%m-%d') AS eventDate,
        event_kind AS eventKind,
        COUNT(*) AS total,
        SUM(CASE WHEN LOWER(COALESCE(status, '')) LIKE '%bug%' THEN 1 ELSE 0 END) AS bugs,
        SUM(CASE WHEN LOWER(COALESCE(status, '')) LIKE '%melhoria%' THEN 1 ELSE 0 END) AS improvements
      FROM (
        SELECT date_created AS event_date, 'created' AS event_kind, status
        FROM bi_clickup_tasks
        WHERE (${dateConditions("date_created")})

        UNION ALL

        SELECT date_done AS event_date, 'completed' AS event_kind, status
        FROM bi_clickup_tasks
        WHERE date_done IS NOT NULL
          AND (${dateConditions("date_done")})
          AND (
            LOWER(COALESCE(status_type, '')) IN ('done', 'closed')
            OR LOWER(COALESCE(status, '')) IN (
              'closed', 'complete', 'completed', 'concluído', 'concluída',
              'concluidas', 'concluídas', 'histories'
            )
          )
      ) AS demand_events
      GROUP BY event_date, event_kind
      ORDER BY event_date, event_kind
    `,
    [...parameters, ...parameters]
  );

  return rows as DatabaseEventRow[];
}

function sumDatabaseEvents(
  rows: DatabaseEventRow[],
  range: DateRange | null,
  eventKind: "created" | "completed",
  metric: "total" | "bugs" | "improvements"
) {
  if (!range) return 0;
  return rows.reduce((sum, row) => {
    const eventDate = parseDate(row.eventDate);
    return row.eventKind === eventKind && contains(eventDate, range)
      ? sum + Number(row[metric] || 0)
      : sum;
  }, 0);
}