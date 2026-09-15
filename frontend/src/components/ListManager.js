import { useState } from "react";
import api, { formatApiError } from "@/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tag, Users, Plus, Trash2, Pencil, Check, X } from "lucide-react";

const PALETTE = ["#4F46E5", "#0EA5E9", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#EF4444", "#14B8A6", "#F97316", "#06B6D4", "#84CC16", "#64748B"];

export function ListManager({ types, team, isAdmin, onRefresh }) {
  const [newType, setNewType] = useState("");
  const [newTypeColor, setNewTypeColor] = useState(PALETTE[0]);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [editTypeName, setEditTypeName] = useState("");
  const [editTypeColor, setEditTypeColor] = useState(PALETTE[0]);
  const [editingMember, setEditingMember] = useState(null);
  const [editMemberName, setEditMemberName] = useState("");
  const [editMemberEmail, setEditMemberEmail] = useState("");
  const [editMemberPassword, setEditMemberPassword] = useState("");

  const saveTypeEdit = async (t) => {
    if (!editTypeName.trim()) return;
    setSaving(true);
    try {
      await api.put(`/work-types/${t.id}`, { name: editTypeName.trim(), color: editTypeColor });
      toast.success("Tipo aggiornato");
      setEditingType(null);
      onRefresh();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const saveMemberEdit = async (m) => {
    setSaving(true);
    try {
      await api.put(`/team/${m.id}`, {
        name: editMemberName.trim(),
        email: editMemberEmail.trim(),
        password: editMemberPassword || null,
      });
      toast.success("Membro aggiornato");
      setEditingMember(null);
      setEditMemberPassword("");
      onRefresh();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

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
            <li key={t.id} data-testid="work-type-item" className="py-2.5">
              {editingType === t.id ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      data-testid="edit-type-name-input"
                      value={editTypeName}
                      onChange={(e) => setEditTypeName(e.target.value)}
                      className="flex-1 h-8"
                    />
                    <Button size="sm" onClick={() => saveTypeEdit(t)} disabled={saving} data-testid="edit-type-save-button" className="bg-indigo-600 hover:bg-indigo-700 text-white h-8">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingType(null)} className="h-8">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditTypeColor(c)}
                        className={`h-5 w-5 rounded-full transition-transform ${editTypeColor === c ? "ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900 scale-110" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.name}</span>
                  </span>
                  <div className="flex gap-1">
                    <button
                      data-testid="edit-type-button"
                      onClick={() => {
                        setEditingType(t.id);
                        setEditTypeName(t.name);
                        setEditTypeColor(t.color);
                      }}
                      className="h-8 w-8 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      data-testid="delete-type-button"
                      onClick={() => deleteType(t)}
                      className="h-8 w-8 rounded-md flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm dark:bg-slate-900/90 dark:border-slate-800 p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Membri del Team</h3>
        </div>
        {isAdmin ? (
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
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Solo l'amministratore può aggiungere o rimuovere membri del team.
          </p>
        )}
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {team.map((m) => (
            <li key={m.id} data-testid="team-member-item" className="py-2.5">
              {isAdmin && editingMember === m.id ? (
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                  <Input data-testid="edit-member-name-input" value={editMemberName} onChange={(e) => setEditMemberName(e.target.value)} placeholder="Nome" className="h-8" />
                  <Input data-testid="edit-member-email-input" type="email" value={editMemberEmail} onChange={(e) => setEditMemberEmail(e.target.value)} placeholder="Email" className="h-8" />
                  <Input data-testid="edit-member-password-input" type="password" value={editMemberPassword} onChange={(e) => setEditMemberPassword(e.target.value)} placeholder="Nuova password (opzionale)" className="h-8" />
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => saveMemberEdit(m)} disabled={saving} data-testid="edit-member-save-button" className="bg-indigo-600 hover:bg-indigo-700 text-white h-8">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingMember(null); setEditMemberPassword(""); }} className="h-8">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
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
                  {isAdmin && (
                    <div className="flex gap-1">
                      <button
                        data-testid="edit-member-button"
                        onClick={() => {
                          setEditingMember(m.id);
                          setEditMemberName(m.name);
                          setEditMemberEmail(m.email);
                          setEditMemberPassword("");
                        }}
                        className="h-8 w-8 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {m.role !== "admin" && (
                        <button
                          data-testid="delete-member-button"
                          onClick={() => deleteMember(m)}
                          className="h-8 w-8 rounded-md flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
