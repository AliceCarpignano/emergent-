import { Euro, Clock, PlayCircle, FolderCheck, TrendingUp } from "lucide-react";
import { formatEuro } from "@/constants";

function StatCard({ testid, label, value, sub, icon: Icon, accent }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm dark:bg-slate-900/90 dark:border-slate-800 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
          <p data-testid={testid} className={`mt-2 text-2xl sm:text-3xl font-bold tracking-tight ${accent}`}>
            {value}
          </p>
          {sub && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{sub}</p>}
        </div>
        <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Icon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        </div>
      </div>
    </div>
  );
}

export function StatsDashboard({ stats }) {
  if (!stats) return null;
  const maxTotale = Math.max(...stats.per_persona.map((p) => p.totale), 1);

  return (
    <div className="space-y-8" data-testid="stats-dashboard">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          testid="stat-fatturato-totale"
          label="Fatturato Completati"
          value={formatEuro(stats.fatturato_completati)}
          sub={`${stats.completati_totali} lavori confezionati`}
          icon={Euro}
          accent="font-mono text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          testid="stat-lavori-in-corso"
          label="Lavori In Corso"
          value={stats.lavori_in_corso}
          sub={`${stats.lavori_attivi_totali} attivi in totale`}
          icon={PlayCircle}
          accent="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          testid="stat-lavori-in-attesa"
          label="In Attesa di Avvio"
          value={stats.lavori_in_attesa}
          sub={`${stats.lavori_in_revisione} in revisione`}
          icon={Clock}
          accent="text-amber-600 dark:text-amber-400"
        />
        <StatCard
          testid="stat-completati-totali"
          label="Lavori Completati"
          value={stats.completati_totali}
          sub="Archivio completati"
          icon={FolderCheck}
          accent="text-slate-900 dark:text-slate-100"
        />
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm dark:bg-slate-900/90 dark:border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Guadagno per Persona</h3>
          <span className="text-sm text-slate-500 dark:text-slate-400">(lavori completati)</span>
        </div>
        {stats.per_persona.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Nessun lavoro completato ancora.</p>
        ) : (
          <div className="space-y-4" data-testid="stat-guadagno-persona-list">
            {stats.per_persona.map((p) => (
              <div key={p.user_id} className="space-y-1.5" data-testid={`stat-guadagno-${p.user_id}`}>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{p.name}</span>
                    <span className="text-slate-400 dark:text-slate-500">· {p.count} lavori</span>
                  </div>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {formatEuro(p.totale)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${(p.totale / maxTotale) * 100}%`, backgroundColor: p.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
