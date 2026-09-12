"use client";

import { useEffect, useState } from "react";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export default function ClickUpSync() {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    const loadLastSync = async () => {
      try {
        const response = await fetch(
          "/api/clickup/cache",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) return;

        const data = await response.json();

        if (data?.syncedAt) {
          setLastSync(
            new Date(data.syncedAt).toLocaleString(
              "pt-BR"
            )
          );
        }
      } catch (error) {
        console.error(
          "Erro ao recuperar última sincronização:",
          error
        );
      }
    };

    loadLastSync();
  }, []);

  const handleSync = async () => {
    if (syncing) return;

    try {
      setSyncing(true);
      setStatus("idle");

      const response = await fetch(
        "/api/clickup/tasks",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Falha ao sincronizar com o ClickUp."
        );
      }

      const fresh = await fetch(
        "/api/clickup/cache",
        {
          cache: "no-store",
        }
      );

      if (!fresh.ok) {
        throw new Error(
          "Falha ao atualizar os dados."
        );
      }

      const data = await fresh.json();

      const syncDate = data?.syncedAt
        ? new Date(data.syncedAt)
        : new Date();

      setLastSync(
        syncDate.toLocaleString("pt-BR")
      );

      setStatus("success");

      window.dispatchEvent(
        new Event("clickup-synced")
      );

      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (error) {
      console.error(
        "Erro ao sincronizar ClickUp:",
        error
      );

      setStatus("error");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="mt-6 border-t border-zinc-100 pt-4">
      <button
        type="button"
        onClick={handleSync}
        disabled={syncing}
        className={`flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
          syncing
            ? "cursor-not-allowed bg-zinc-100 text-zinc-400"
            : "bg-zinc-950 text-white hover:bg-zinc-800"
        }`}
      >
        <RefreshCw
          className={`h-4 w-4 ${
            syncing ? "animate-spin" : ""
          }`}
        />

        {syncing
          ? "Sincronizando..."
          : "Sincronizar ClickUp"}
      </button>

      {lastSync && (
        <div className="mt-2 rounded-lg bg-zinc-50 px-2.5 py-2 text-center text-[11px] text-zinc-500">
          Última sincronização:{" "}
          <span className="font-medium text-zinc-700">
            {lastSync}
          </span>
        </div>
      )}

      {status === "success" && (
        <div className="mt-2 flex items-start gap-2 rounded-lg bg-emerald-50 px-2.5 py-2 text-xs text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />

          <div>
            <p className="font-medium">
              Sincronização concluída
            </p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 px-2.5 py-2 text-xs text-red-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />

          <p className="font-medium">
            Não foi possível sincronizar. Tente novamente.
          </p>
        </div>
      )}
    </div>
  );
}
