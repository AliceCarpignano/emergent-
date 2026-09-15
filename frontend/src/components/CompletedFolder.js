import { useState } from "react";
import api, { formatApiError } from "@/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { FolderCheck, RotateCcw, FileText, Undo2 } from "lucide-react";
import { formatEuro, formatData } from "@/constants";
import { InvoiceModal } from "@/components/InvoiceModal";

export function CompletedFolder({ jobs, onRefresh }) {
  const [invoiceJob, setInvoiceJob] = useState(null);
  const daFatturare = jobs.filter((j) => !j.invoiced);
  const fatturati = jobs.filter((j) => j.invoiced);
  const totale = jobs.reduce((s, j) => s + j.price, 0);
  const totaleDaFatturare = daFatturare.reduce((s, j) => s + j.price, 0);
  const totaleFatturato = fatturati.reduce((s, j) => s + j.price, 0);

  const restore = async (job) => {
    try {
      await api.post(`/jobs/${job.id}/restore`);
      toast.success(`"${job.title}" ripristinato nei lavori attivi`);
      onRefresh();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const uninvoice = async (job) => {
    if (!window.confirm(`Annullare la fattura di "${job.title}"? Il lavoro tornerà in "Da fatturare".`)) return;
    try {
      await api.post(`/jobs/${job.id}/uninvoice`);
      toast.success("Fattura annullata");
      onRefresh();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const typeBadge = (job) =>
    job.type_name ? (
      <Badge variant="outline" className="font-medium border" style={{ color: job.type_color, borderColor: `${job.type_color}55`, backgroundColor: `${job.type_color}12` }}>
        {job.type_name}
      </Badge>
    ) : (
      <span className="text-slate-400">—</span>
    );

  return (
    <div className="space-y-6" data-testid="completed-folder">
      <div className="rounded-xl border border-emerald-200/60 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800/50 p-5">
        <div className="flex items-center gap-3 mb-4">
          <FolderCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h3 className="font-semibold text-emerald-900 dark:text-emerald-200">Archivio Completati</h3>
            <p className="text-sm text-emerald-700 dark:text-emerald-400">{jobs.length} lavori confezionati</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg bg-white/70 dark:bg-slate-900/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Valore totale</p>
            <p data-testid="completed-total-value" className="font-mono text-xl font-bold text-emerald-700 dark:text-emerald-300">{formatEuro(totale)}</p>
          </div>
          <div className="rounded-lg bg-white/70 dark:bg-slate-900/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Da fatturare</p>
            <p data-testid="completed-total-da-fatturare" className="font-mono text-xl font-bold text-amber-700 dark:text-amber-300">{formatEuro(totaleDaFatturare)}</p>
          </div>
          <div className="rounded-lg bg-white/70 dark:bg-slate-900/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fatturato</p>
            <p data-testid="completed-total-fatturato" className="font-mono text-xl font-bold text-slate-900 dark:text-slate-100">{formatEuro(totaleFatturato)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2" data-testid="completed-section-da-fatturare">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <FileText className="h-5 w-5 text-amber-500" />
          Da fatturare
          <span className="text-sm font-normal text-slate-500 dark:text-slate-400">({daFatturare.length} lavori)</span>
        </h3>
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
                {daFatturare.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400" data-testid="da-fatturare-empty">
                      Nessun lavoro da fatturare.
                    </td>
                  </tr>
                )}
                {daFatturare.map((job) => (
                  <tr key={job.id} data-testid="da-fatturare-row" className="border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200 max-w-[240px]">
                      <span className="line-clamp-2">{job.title}</span>
                    </td>
                    <td className="px-4 py-3.5">{typeBadge(job)}</td>
                    <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">{job.assignee_name}</td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                      {job.completed_at ? formatData(job.completed_at.slice(0, 10)) : formatData(job.due_date)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-mono font-semibold text-amber-700 dark:text-amber-300">{formatEuro(job.price)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          data-testid="invoice-job-button"
                          onClick={() => setInvoiceJob(job)}
                          title="Inserisci dati di fatturazione"
                          className="h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40 transition-colors"
                        >
                          <FileText className="h-4 w-4" /> Fattura
                        </button>
                        <button
                          data-testid="restore-work-button"
                          onClick={() => restore(job)}
                          title="Ripristina nei lavori attivi"
                          className="h-8 w-8 rounded-md inline-flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="space-y-2" data-testid="completed-section-fatturati">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <FolderCheck className="h-5 w-5 text-emerald-500" />
          Fatturati
          <span className="text-sm font-normal text-slate-500 dark:text-slate-400">({fatturati.length} lavori)</span>
        </h3>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                  <th className="text-left font-semibold text-slate-600 dark:text-slate-300 px-4 py-3">Descrizione / Titolo</th>
                  <th className="text-left font-semibold text-slate-600 dark:text-slate-300 px-4 py-3">Cliente</th>
                  <th className="text-left font-semibold text-slate-600 dark:text-slate-300 px-4 py-3">N. Fattura</th>
                  <th className="text-left font-semibold text-slate-600 dark:text-slate-300 px-4 py-3">Data Fattura</th>
                  <th className="text-right font-semibold text-slate-600 dark:text-slate-300 px-4 py-3">Importo (€)</th>
                  <th className="text-right font-semibold text-slate-600 dark:text-slate-300 px-4 py-3">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {fatturati.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400" data-testid="fatturati-empty">
                      Nessun lavoro fatturato ancora.
                    </td>
                  </tr>
                )}
                {fatturati.map((job) => (
                  <tr key={job.id} data-testid="fatturati-row" className="border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200 max-w-[240px]">
                      <span className="line-clamp-2">{job.title}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300" data-testid="fatturati-client-name">{job.client_name}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-400" data-testid="fatturati-invoice-number">{job.invoice_number}</td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{formatData(job.invoice_date)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-300">{formatEuro(job.price)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        data-testid="uninvoice-button"
                        onClick={() => uninvoice(job)}
                        title="Annulla fattura (torna in Da fatturare)"
                        className="h-8 w-8 rounded-md inline-flex items-center justify-center text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40 transition-colors"
                      >
                        <Undo2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <InvoiceModal open={!!invoiceJob} onClose={() => setInvoiceJob(null)} job={invoiceJob} onSaved={onRefresh} />
    </div>
  );
}
