import { useState } from "react";
import api, { formatApiError } from "@/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Archive, Download, CalendarRange, Loader2, FileSpreadsheet } from "lucide-react";
import { formatEuro, formatData } from "@/constants";

export function WeeklyReports({ reports, onRefresh }) {
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(null);

  const generate = async () => {
    setGenerating(true);
    try {
      await api.post("/weekly-reports/generate");
      toast.success("Report settimanale generato e lavori archiviati");
      onRefresh();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setGenerating(false);
    }
  };

  const download = async (r) => {
    setDownloading(r.id);
    try {
      const res = await api.get(`/weekly-reports/${r.id}/excel`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `report_settimana_${r.period_start.slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm dark:bg-slate-900/90 dark:border-slate-800 p-6 space-y-5" data-testid="weekly-reports-section">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Report Settimanali</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Archiviazione automatica ogni lunedì · Excel editabile con grafici auto-aggiornati
            </p>
          </div>
        </div>
        <Button onClick={generate} disabled={generating} data-testid="generate-weekly-report-button" className="bg-indigo-600 hover:bg-indigo-700 text-white">
          {generating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Archive className="h-4 w-4 mr-1.5" />}
          Archivia Settimana
        </Button>
      </div>

      {reports.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400" data-testid="weekly-reports-empty">
          Nessun report ancora. I lavori completati vengono archiviati automaticamente ogni lunedì, oppure usa "Archivia Settimana".
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {reports.map((r) => (
            <li key={r.id} data-testid="weekly-report-row" className="py-4 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <CalendarRange className="h-4 w-4 text-slate-400" />
                  {formatData(r.period_start.slice(0, 10))} → {formatData(r.period_end.slice(0, 10))}
                  <span className="text-slate-400 dark:text-slate-500">· {r.n_lavori} lavori</span>
                  {r.source === "cron" && (
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded px-1.5 py-0.5">automatico</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    Entrate: <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{formatEuro(r.totale)}</span>
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    Fatturato: <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{formatEuro(r.fatturato)}</span>
                  </span>
                  <Button size="sm" variant="outline" onClick={() => download(r)} disabled={downloading === r.id} data-testid="download-report-button">
                    {downloading === r.id ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
                    Excel
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {r.per_tipo.map((t) => (
                  <span key={t.name} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-md px-2 py-1">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.name}: <span className="font-mono font-semibold">{formatEuro(t.totale)}</span>
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
