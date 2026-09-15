import { useMemo, useState } from "react";
import api, { formatApiError } from "@/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, CheckCircle2, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { STATI, STATI_KEYS, formatEuro, formatData, isScaduto } from "@/constants";

export function GeneralWorkTable({ jobs, types, team, isAdmin, onRefresh, onNew, onEdit }) {
  const [search, setSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("due_date");
  const [sortDir, setSortDir] = useState(1);

  const filtered = useMemo(() => {
    let list = jobs;
    if (assigneeFilter !== "all") list = list.filter((j) => (j.assignee_id || "none") === assigneeFilter);
    if (statusFilter !== "all") list = list.filter((j) => j.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          (j.type_name || "").toLowerCase().includes(q) ||
          (j.assignee_name || "").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      return (va < vb ? -1 : va > vb ? 1 : 0) * sortDir;
    });
  }, [jobs, search, assigneeFilter, statusFilter, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => -d);
    else {
      setSortKey(key);
      setSortDir(1);
    }
  };

  const changeStatus = async (job, status) => {
    try {
      await api.patch(`/jobs/${job.id}/status`, { status });
      toast.success(`Stato aggiornato: ${STATI[status].label}`);
      onRefresh();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const complete = async (job) => {
    try {
      await api.post(`/jobs/${job.id}/complete`);
      toast.success(`"${job.title}" spostato in Completati`);
      onRefresh();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const remove = async (job) => {
    if (!window.confirm(`Eliminare definitivamente "${job.title}"?`)) return;
    try {
      await api.delete(`/jobs/${job.id}`);
      toast.success("Lavoro eliminato");
      onRefresh();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const totaleFiltrato = filtered.reduce((s, j) => s + j.price, 0);

  return (
    <div className="space-y-4" data-testid="general-work-table">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            data-testid="search-work-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca lavoro..."
            className="pl-9"
          />
        </div>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-full lg:w-56" data-testid="filter-assignee-select">
            <SelectValue placeholder="Filtra per Persona" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le persone</SelectItem>
            {team.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
            <SelectItem value="none">Non assegnato</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full lg:w-48" data-testid="filter-status-select">
            <SelectValue placeholder="Filtra per Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            {STATI_KEYS.map((s) => (
              <SelectItem key={s} value={s}>
                {STATI[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={onNew} data-testid="add-work-button" className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="h-4 w-4 mr-1.5" />
          Nuovo Lavoro
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                <th className="text-left font-semibold text-slate-600 dark:text-slate-300 px-4 py-3">Descrizione / Titolo</th>
                <th className="text-left font-semibold text-slate-600 dark:text-slate-300 px-4 py-3">Tipo di Lavoro</th>
                <th className="text-left font-semibold text-slate-600 dark:text-slate-300 px-4 py-3">Membro Team</th>
                <th className="text-left font-semibold text-slate-600 dark:text-slate-300 px-4 py-3">
                  <button className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100" onClick={() => toggleSort("due_date")} data-testid="sort-date-button">
                    Data Consegna <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="text-right font-semibold text-slate-600 dark:text-slate-300 px-4 py-3">
                  <button className="flex items-center gap-1 ml-auto hover:text-slate-900 dark:hover:text-slate-100" onClick={() => toggleSort("price")} data-testid="sort-price-button">
                    Prezzo (€) <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="text-left font-semibold text-slate-600 dark:text-slate-300 px-4 py-3">Avanzamento</th>
                <th className="text-right font-semibold text-slate-600 dark:text-slate-300 px-4 py-3">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400" data-testid="work-table-empty">
                    Nessun lavoro trovato. Crea il primo con "Nuovo Lavoro".
                  </td>
                </tr>
              )}
              {filtered.map((job) => (
                <tr
                  key={job.id}
                  data-testid="work-table-row"
                  className="border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200 max-w-[280px]">
                    <span className="line-clamp-2">{job.title}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    {job.type_name ? (
                      <Badge
                        data-testid="work-type-badge"
                        variant="outline"
                        className="font-medium border"
                        style={{ color: job.type_color, borderColor: `${job.type_color}55`, backgroundColor: `${job.type_color}12` }}
                      >
                        {job.type_name}
                      </Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                        style={{ backgroundColor: job.assignee_color }}
                      >
                        {(job.assignee_name || "N").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-slate-700 dark:text-slate-300">{job.assignee_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      data-testid="work-due-date-display"
                      className={isScaduto(job) ? "text-red-600 dark:text-red-400 font-semibold" : "text-slate-600 dark:text-slate-400"}
                    >
                      {formatData(job.due_date)}
                      {isScaduto(job) && <span className="block text-xs">Scaduto</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span data-testid="work-price-display" className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {formatEuro(job.price)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <Select value={job.status} onValueChange={(v) => changeStatus(job, v)}>
                      <SelectTrigger
                        data-testid="work-status-dropdown"
                        className={`h-8 w-40 text-xs font-semibold border ${STATI[job.status].badge}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATI_KEYS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATI[s].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        data-testid="mark-completed-button"
                        onClick={() => complete(job)}
                        title="Sposta in Completati"
                        className="h-8 w-8 rounded-md flex items-center justify-center text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 transition-colors"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <button
                        data-testid="edit-work-button"
                        onClick={() => onEdit(job)}
                        title="Modifica"
                        className="h-8 w-8 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        data-testid="delete-work-button"
                        onClick={() => remove(job)}
                        title="Elimina"
                        className="h-8 w-8 rounded-md flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {filtered.length} lavori attivi
          </span>
          <span className="text-sm text-slate-600 dark:text-slate-300">
            Valore totale:{" "}
            <span data-testid="work-table-total" className="font-mono font-semibold text-slate-900 dark:text-slate-100">
              {formatEuro(totaleFiltrato)}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
