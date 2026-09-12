export type PeriodType = "all" | "day" | "week" | "month" | "year" | "custom";

export type PeriodRange = {
  type: PeriodType;
  start: Date;
  end: Date;
  label: string;
};

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function getPeriodRange(
  type: PeriodType = "week",
  referenceDate = new Date()
): PeriodRange {
  const reference = startOfDay(referenceDate);

  if (type === "all") {
    return {
      type,
      start: new Date(0),
      end: new Date(8640000000000000),
      label: "Todos os períodos",
    };
  }

  if (type === "day") {
    const start = startOfDay(reference);
    const end = endOfDay(reference);

    return {
      type,
      start,
      end,
      label: formatDate(start),
    };
  }

  if (type === "week") {
    const start = new Date(reference);
    start.setDate(reference.getDate() - 6);

    const end = new Date(reference);

    return {
      type,
      start: startOfDay(start),
      end: endOfDay(end),
      label: `${formatDate(start)} — ${formatDate(end)}`,
    };
  }

  if (type === "month") {
    const start = new Date(reference);
    start.setDate(reference.getDate() - 29);

    const end = new Date(reference);

    return {
      type,
      start: startOfDay(start),
      end: endOfDay(end),
      label: `${formatDate(start)} — ${formatDate(end)}`,
    };
  }

  const start = new Date(reference);
  start.setDate(reference.getDate() - 364);

  const end = new Date(reference);

  return {
    type,
    start: startOfDay(start),
    end: endOfDay(end),
    label: `${formatDate(start)} — ${formatDate(end)}`,
  };
}

export function isDateInPeriod(
  date: string | number | Date | null | undefined,
  period: PeriodRange
) {
  if (!date) return false;

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return false;

  return parsed >= period.start && parsed <= period.end;
}

export function getPeriodType(value: string | null): PeriodType {
  if (value === "all") return "all";
  if (value === "day") return "day";
  if (value === "month") return "month";
  if (value === "year") return "year";
  if (value === "custom") return "custom";

  return "week";
}





