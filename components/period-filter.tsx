"use client";

import { useState } from "react";

const periods = [
  { value: "day", label: "Diário" },
  { value: "week", label: "Semanal" },
  { value: "month", label: "Mensal" },
  { value: "year", label: "Anual" },
];

export default function PeriodFilter() {
  const [currentPeriod, setCurrentPeriod] = useState("week");

  function handleChange(value: string) {
    setCurrentPeriod(value);
  }

  return (
    <div className="mb-5 rounded-xl border border-zinc-200 bg-white p-3">
      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
        Período
      </p>

      <select
        value={currentPeriod}
        onChange={(event) => handleChange(event.target.value)}
        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700 outline-none transition focus:border-zinc-400"
      >
        {periods.map((period) => (
          <option key={period.value} value={period.value}>
            {period.label}
          </option>
        ))}
      </select>
    </div>
  );
}
