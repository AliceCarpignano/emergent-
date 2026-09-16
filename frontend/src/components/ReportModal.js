import { useState } from "react";
import api, { formatApiError } from "@/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatEuro, formatData, STATI } from "@/constants";
import { FileBarChart, Loader2 } from "lucide-react";

const PIE_OUTER_RADIUS = 95;
const PIE_INNER_RADIUS = 45;

function defaultDates() {
  const oggi = new Date();
  const inizio = new Date(oggi.getFullYear(), oggi.getMonth(), 1);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { from: fmt(inizio), to: fmt(oggi) };
}

export function ReportModal({ open, onClose }) {
  const [from, setFrom] = useState(defaultDates().from);
  const [to, setTo] = useState(defaultDates().to);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const genera = async () => {
    if (!from || !to) {
      toast.error("Seleziona entrambe le date");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get("/report", { params: { from, to } });
      setReport(data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const pieData = (report?.per_tipo || []).filter((t) => t.totale > 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="report-modal">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Report Lavori per Periodo
          </DialogTitle>
          <DialogDescription>
            Seleziona il periodo e genera il report con grafico e dettaglio lavori.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="space-y-1.5 flex-1">
            <Label htmlFor="report-from">Dal</Label>
            <Input id="report-from" type="date" data-testid="report-from-input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5 flex-1">
            <Label htmlFor="report-to">Al</Label>
            <Input id="report-to" type="date" data-testid="report-to-input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={genera} disabled={loading} data-testid="report-generate-button" className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Genera Report
          </Button>
        </div>

        {report && (
          <div className="space-y-6 pt-2" data-testid="report-results">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Lavori nel periodo</p>
                <p data-testid="report-total-jobs" className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{report.totale_lavori}</p>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fatturato completati</p>
                <p data-testid="report-fatturato" className="mt-1 font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatEuro(report.fatturato_completati)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Valore totale lavori</p>
                <p data-testid="report-valore-totale" className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">{formatEuro(report.valore_totale)}</p>
              </div>
            </div>

            {pieData.length > 0 ? (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Fatturato per Tipologia di Lavoro</h4>
                <div className="h-72" data-testid="report-pie-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="totale" nameKey="name" cx="50%" cy="50%" outerRadius={PIE_OUTER_RADIUS} innerRadius={PIE_INNER_RADIUS} paddingAngle={3} strokeWidth={0}>
                        {pieData.map((t) => (
                          <Cell key={t.name} fill={t.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatEuro(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400" data-testid="report-empty">Nessun lavoro nel periodo selezionato.</p>
            )}

            {report.jobs.length > 0 && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900">
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        <th className="text-left font-semibold text-slate-600 dark:text-slate-300 px-3 py-2">Titolo</th>
                        <th className="text-left font-semibold text-slate-600 dark:text-slate-300 px-3 py-2">Tipo</th>
                        <th className="text-left font-semibold text-slate-600 dark:text-slate-300 px-3 py-2">Membro</th>
                        <th className="text-left font-semibold text-slate-600 dark:text-slate-300 px-3 py-2">Consegna</th>
                        <th className="text-left font-semibold text-slate-600 dark:text-slate-300 px-3 py-2">Stato</th>
                        <th className="text-right font-semibold text-slate-600 dark:text-slate-300 px-3 py-2">Prezzo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.jobs.map((j) => (
                        <tr key={j.id} data-testid="report-job-row" className="border-b border-slate-100 dark:border-slate-800/60 last:border-0">
                          <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200 max-w-[220px]"><span className="line-clamp-1">{j.title}</span></td>
                          <td className="px-3 py-2">
                            {j.type_name ? (
                              <Badge variant="outline" className="font-medium border" style={{ color: j.type_color, borderColor: `${j.type_color}55`, backgroundColor: `${j.type_color}12` }}>{j.type_name}</Badge>
                            ) : "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{j.assignee_name}</td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{formatData(j.due_date)}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-semibold ${STATI[j.status].badge}`}>{STATI[j.status].label}</span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">{formatEuro(j.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
