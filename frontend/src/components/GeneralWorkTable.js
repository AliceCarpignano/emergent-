import { useMemo, useState } from "react";
import api, { formatApiError } from "@/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, CheckCircle2, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { STATI, STATI_KEYS, formatEuro, formatData, isScaduto } from "@/constants";

function buildSections(filtered, team) {
  const teamMap = new Map(team.map((m) => [m.id, m]));
  const byAssignee = new Map();
  for (const j of filtered) {
    const key = j.assignee_id && teamMap.has(j.assignee_id) ? j.assignee_id : "none";
    if (!byAssignee.has(key)) byAssignee.set(key, []);
    byAssignee.get(key).push(j);
  }
  const ordered = [];
  for (const m of team) {
    if (byAssignee.has(m.id)) ordered.push({ key: m.id, name: m.name, color: m.color, jobs: byAssignee.get(m.id) });
  }
  if (byAssignee.has("none")) ordered.push({ key: "none", name: "Non assegnato", color: "#94A3B8", jobs: byAssignee.get("none") });
  for (const s of ordered) s.jobs.sort((a, b) => (a.due_date || "9999-12-31").localeCompare(b.due_date || "9999-12-31"));
  return ordered;
}

function WorkRow({ job, isSelected, onToggleSelect, onEdit, onChangeStatus, onComplete, onDelete }) {
  return (
    <tr
      data-testid="work-table-row"
      onClick={() => onEdit(job)}
      className={`border-b border-slate-100 dark:border-slate-800/60 last:border-0 cursor-pointer transition-colors ${
        isSelected ? "bg-indigo-50/60 dark:bg-indigo-950/20" : "hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
      }`}
    >
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          data-testid="work-select-checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(job.id)}
          className="h-4 w-4 rounded accent-indigo-600 cursor-pointer"
        />
      </td>
      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 max-w-[280px]">
        <span className="line-clamp-2">{job.title}</span>
      </td>
      <td className="px-4 py-3">
        {job.type_name ? (
          <Badge data-testid="work-type-badge" variant="outline" className="font-medium border" style={{ color: job.type_color, borderColor: `${job.type_color}55`, backgroundColor: `${job.type_color}12` }}>
            {job.type_name}
          </Badge>
        ) : (
          <span className="text-slate-400 text-xs">Senza tipo</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span data-testid="work-due-date-display" className={isScaduto(job) ? "text-red-600 dark:text-red-400 font-semibold" : "text-slate-600 dark:text-slate-400"}>
          {formatData(job.due_date)}
          {isScaduto(job) && <span className="block text-xs">Scaduto</span>}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span data-testid="work-price-display" className="font-mono font-semibold text-slate-900 dark:text-slate-100">{formatEuro(job.price)}</span>
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <Select value={job.status} onValueChange={(v) => onChangeStatus(job, v)}>
          <SelectTrigger data-testid="work-status-dropdown" className={`h-8 w-40 text-xs font-semibold border ${STATI[job.status].badge}`}>
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
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <button data-testid="mark-completed-button" onClick={() => onComplete(job)} title="Sposta in Completati" className="h-8 w-8 rounded-md flex items-center justify-center text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 transition-colors">
            <CheckCircle2 className="h-4 w-4" />
          </button>
          <button data-testid="edit-work-button" onClick={() => onEdit(job)} title="Modifica" className="h-8 w-8 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors">
            <Pencil className="h-4 w-4" />
          </button>
          <button data-testid="delete-work-button" onClick={() => onDelete(job)} title="Elimina" className="h-8 w-8 rounded-md flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function WorkSection({ section, isCollapsed, onToggleCollapse, selected, onToggleSelect, onEdit, onChangeStatus, onComplete, onDelete }) {
  const valoreSezione = section.jobs.reduce((s, j) => s + j.price, 0);
  return (
    <div data-testid={`section-${section.key}`} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <button
        data-testid={`section-toggle-${section.key}`}
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors border-b border-slate-200 dark:border-slate-800"
      >
        <span className="flex items-center gap-2.5">
          {isCollapsed ? <ChevronRight className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          <span className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: section.color }}>
            {section.name.charAt(0).toUpperCase()}
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{section.name}</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">· {section.jobs.length} lavori</span>
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          Valore: <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{formatEuro(valoreSezione)}</span>
        </span>
      </button>
      {!isCollapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="w-10 px-4 py-2.5"></th>
                <th className="text-left font-semibold text-slate-600 dark:text-slate-300 px-4 py-2.5">Descrizione / Titolo</th>
                <th className="text-left font-semibold text-slate-600 dark:text-slate-300 px-4 py-2.5">Tipo di Lavoro</th>
                <th className="text-left font-semibold text-slate-600 dark:text-slate-300 px-4 py-2.5">Data Consegna</th>
                <th className="text-right font-semibold text-slate-600 dark:text-slate-300 px-4 py-2.5">Prezzo (€)</th>
                <th className="text-left font-semibold text-slate-600 dark:text-slate-300 px-4 py-2.5">Avanzamento</th>
                <th className="text-right font-semibold text-slate-600 dark:text-slate-300 px-4 py-2.5">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {section.jobs.map((job) => (
                <WorkRow
                  key={job.id}
                  job={job}
                  isSelected={selected.has(job.id)}
                  onToggleSelect={onToggleSelect}
                  onEdit={onEdit}
                  onChangeStatus={onChangeStatus}
                  onComplete={onComplete}
                  onDelete={onDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function GeneralWorkTable({ jobs, types, team, isAdmin, onRefresh, onNew, onEdit }) {
  const [search, setSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(new Set());
  const [collapsed, setCollapsed] = useState({});

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
    return list;
  }, [jobs, search, assigneeFilter, statusFilter]);

  const sections = useMemo(() => buildSections(filtered, team), [filtered, team]);

  const toggleSelect = (id) =>
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });

  const selectedJobs = filtered.filter((j) => selected.has(j.id));

  const bulkComplete = async () => {
    try {
      await Promise.all(selectedJobs.map((j) => api.post(`/jobs/${j.id}/complete`)));
      toast.success(`${selectedJobs.length} lavori spostati in Completati`);
      setSelected(new Set());
      onRefresh();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Eliminare definitivamente ${selectedJobs.length} lavori selezionati?`)) return;
    try {
      await Promise.all(selectedJobs.map((j) => api.delete(`/jobs/${j.id}`)));
      toast.success("Lavori selezionati eliminati");
      setSelected(new Set());
      onRefresh();
    } catch (err) {
      toast.error(formatApiError(err));
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

      {selectedJobs.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-950/30 px-4 py-3" data-testid="bulk-actions-bar">
          <span className="text-sm font-medium text-indigo-900 dark:text-indigo-200" data-testid="bulk-selected-count">
            {selectedJobs.length} lavori selezionati
          </span>
          <Button size="sm" onClick={bulkComplete} data-testid="bulk-complete-button" className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Confeziona selezionati
          </Button>
          <Button size="sm" variant="outline" onClick={bulkDelete} data-testid="bulk-delete-button" className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800/50 dark:hover:bg-red-950/40">
            <Trash2 className="h-4 w-4 mr-1.5" /> Elimina selezionati
          </Button>
          <button className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline" onClick={() => setSelected(new Set())} data-testid="bulk-clear-button">
            Deseleziona tutto
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-12 text-center text-slate-500 dark:text-slate-400 shadow-sm" data-testid="work-table-empty">
          Nessun lavoro trovato. Crea il primo con "Nuovo Lavoro".
        </div>
      )}

      {sections.map((section) => (
        <WorkSection
          key={section.key}
          section={section}
          isCollapsed={!!collapsed[section.key]}
          onToggleCollapse={() => setCollapsed((c) => ({ ...c, [section.key]: !c[section.key] }))}
          selected={selected}
          onToggleSelect={toggleSelect}
          onEdit={onEdit}
          onChangeStatus={changeStatus}
          onComplete={complete}
          onDelete={remove}
        />
      ))}

      <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
        <span className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} lavori attivi</span>
        <span className="text-sm text-slate-600 dark:text-slate-300">
          Valore totale: <span data-testid="work-table-total" className="font-mono font-semibold text-slate-900 dark:text-slate-100">{formatEuro(totaleFiltrato)}</span>
        </span>
      </div>
    </div>
  );
}
