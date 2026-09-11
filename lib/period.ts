export type PeriodType = "all" | "day" | "week" | "month" | "year";

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
    const dayOfWeek = reference.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const start = new Date(reference);
    start.setDate(reference.getDate() - daysFromMonday);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return {
      type,
      start: startOfDay(start),
      end: endOfDay(end),
      label: `${formatDate(start)} — ${formatDate(end)}`,
    };
  }

  if (type === "month") {
    const start = new Date(
      reference.getFullYear(),
      reference.getMonth(),
      1
    );

    const end = new Date(
      reference.getFullYear(),
      reference.getMonth() + 1,
      0
    );

    return {
      type,
      start: startOfDay(start),
      end: endOfDay(end),
      label: `${formatDate(start)} — ${formatDate(end)}`,
    };
  }

  const start = new Date(reference.getFullYear(), 0, 1);
  const end = new Date(reference.getFullYear(), 11, 31);

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

  return "week";
}



