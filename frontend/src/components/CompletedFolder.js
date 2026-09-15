import api, { formatApiError } from "@/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { FolderCheck, RotateCcw } from "lucide-react";
import { formatEuro, formatData } from "@/constants";

export function CompletedFolder({ jobs, onRefresh }) {
  const totale = jobs.reduce((s, j) => s + j.price, 0);

  const restore = async (job) => {
    try {
      await api.post(`/jobs/${job.id}/restore`);
      toast.success(`"${job.title}" ripristinato nei lavori attivi`);
      onRefresh();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <div className="space-y-4" data-testid="completed-folder">
      <div className="rounded-xl border border-emerald-200/60 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800/50 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <FolderCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h3 className="font-semibold text-emerald-900 dark:text-emerald-200">Archivio Completati</h3>
            <p className="text-sm text-emerald-700 dark:text-emerald-400">{jobs.length} lavori confezionati</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Valore totale archiviato</p>
          <p data-testid="completed-total-value" className="font-mono text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {formatEuro(totale)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                <th className="text-left font-semibold text-slate-600 dark:text-slate-300 px-4 py-3">Descrizione / Titolo</th>
                <th className="text-left font-semibold text-slate-600 dark:text-slate-300 px-4 py-3">Tipo</th>
                <th className="text-left font-semibold text-slate-600 dark:text-slate-300 px-4 py-3">Membro Team</th>
                <th className="text-left font-semibold text-slate-600 dark:text-slate-300 px-4 py-3">Completato il</th>
                <th className="text-right font-semibold text-slate-600 dark:text-slate-300 px-4 py-3">Prezzo (€)</th>
                <th className="text-right font-semibold text-slate-600 dark:text-slate-300 px-4 py-3">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400" data-testid="completed-empty">
                    Nessun lavoro completato ancora.
                  </td>
                </tr>
              )}
              {jobs.map((job) => (
                <tr key={job.id} data-testid="completed-table-row" className="border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200 max-w-[280px]">
                    <span className="line-clamp-2">{job.title}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    {job.type_name ? (
                      <Badge variant="outline" className="font-medium border" style={{ color: job.type_color, borderColor: `${job.type_color}55`, backgroundColor: `${job.type_color}12` }}>
                        {job.type_name}
                      </Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0" style={{ backgroundColor: job.assignee_color }}>
                        {(job.assignee_name || "N").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-slate-700 dark:text-slate-300">{job.assignee_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400" data-testid="completed-date-display">
                    {job.completed_at ? formatData(job.completed_at.slice(0, 10)) : formatData(job.due_date)}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span data-testid="completed-price-display" className="font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                      {formatEuro(job.price)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      data-testid="restore-work-button"
                      onClick={() => restore(job)}
                      title="Ripristina nei lavori attivi"
                      className="h-8 w-8 rounded-md inline-flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
