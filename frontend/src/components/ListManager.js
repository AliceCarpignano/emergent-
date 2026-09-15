import { useState } from "react";
import api, { formatApiError } from "@/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tag, Users, Plus, Trash2 } from "lucide-react";

const PALETTE = ["#4F46E5", "#0EA5E9", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#EF4444", "#14B8A6"];

export function ListManager({ types, team, onRefresh }) {
  const [newType, setNewType] = useState("");
  const [newTypeColor, setNewTypeColor] = useState(PALETTE[0]);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const addType = async (e) => {
    e.preventDefault();
    if (!newType.trim()) return;
    setSaving(true);
    try {
      await api.post("/work-types", { name: newType.trim(), color: newTypeColor });
      toast.success(`Tipo "${newType.trim()}" aggiunto`);
      setNewType("");
      onRefresh();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteType = async (t) => {
    if (!window.confirm(`Eliminare il tipo "${t.name}"?`)) return;
    try {
      await api.delete(`/work-types/${t.id}`);
      toast.success("Tipo eliminato");
      onRefresh();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const addMember = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/team", { name: memberName.trim(), email: memberEmail.trim(), password: memberPassword });
      toast.success(`Membro "${memberName.trim()}" aggiunto al team`);
      setMemberName("");
      setMemberEmail("");
      setMemberPassword("");
      onRefresh();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteMember = async (m) => {
    if (!window.confirm(`Eliminare "${m.name}" dal team? I suoi lavori resteranno non assegnati.`)) return;
    try {
      await api.delete(`/team/${m.id}`);
      toast.success("Membro eliminato");
      onRefresh();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="list-manager">
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm dark:bg-slate-900/90 dark:border-slate-800 p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Tipi di Lavoro</h3>
        </div>
        <form onSubmit={addType} className="space-y-3">
          <div className="flex gap-2">
            <Input
              data-testid="list-manager-add-type-input"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              placeholder="Es. Fotografia"
              className="flex-1"
            />
            <Button type="submit" disabled={saving} data-testid="list-manager-add-type-button" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="h-4 w-4 mr-1" /> Aggiungi
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">Colore:</span>
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                data-testid={`type-color-${c}`}
                onClick={() => setNewTypeColor(c)}
                className={`h-6 w-6 rounded-full transition-transform ${newTypeColor === c ? "ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900 scale-110" : ""}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </form>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {types.map((t) => (
            <li key={t.id} data-testid="work-type-item" className="flex items-center justify-between py-2.5">
              <span className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.name}</span>
              </span>
              <button
                data-testid="delete-type-button"
                onClick={() => deleteType(t)}
                className="h-8 w-8 rounded-md flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm dark:bg-slate-900/90 dark:border-slate-800 p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Membri del Team</h3>
        </div>
        <form onSubmit={addMember} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Nome</Label>
              <Input data-testid="list-manager-add-member-input" value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Nome e cognome" required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input data-testid="list-manager-member-email-input" type="email" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder="email@team.it" required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Password</Label>
              <Input data-testid="list-manager-member-password-input" type="password" value={memberPassword} onChange={(e) => setMemberPassword(e.target.value)} placeholder="Min. 6 caratteri" required minLength={6} />
            </div>
          </div>
          <Button type="submit" disabled={saving} data-testid="list-manager-add-member-button" className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="h-4 w-4 mr-1" /> Aggiungi Membro
          </Button>
        </form>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {team.map((m) => (
            <li key={m.id} data-testid="team-member-item" className="flex items-center justify-between py-2.5">
              <span className="flex items-center gap-2.5">
                <span className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: m.color }}>
                  {m.name.charAt(0).toUpperCase()}
                </span>
                <span>
                  <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {m.name}
                    {m.role === "admin" && <span className="ml-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">Admin</span>}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{m.email}</span>
                </span>
              </span>
              {m.role !== "admin" && (
                <button
                  data-testid="delete-member-button"
                  onClick={() => deleteMember(m)}
                  className="h-8 w-8 rounded-md flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
