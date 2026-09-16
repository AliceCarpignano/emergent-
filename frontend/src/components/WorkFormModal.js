import { useEffect, useState } from "react";
import api, { formatApiError } from "@/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATI, STATI_KEYS } from "@/constants";

export function WorkFormModal({ open, onClose, types, team, job, onSaved }) {
  const [title, setTitle] = useState("");
  const [typeId, setTypeId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState("in_attesa");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(job?.title || "");
      setTypeId(job?.type_id || "none");
      setAssigneeId(job?.assignee_id || "none");
      setDueDate(job?.due_date || "");
      setPrice(job != null ? String(job.price) : "");
      setStatus(job?.status || "in_attesa");
    }
  }, [open, job]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title,
        type_id: typeId === "none" ? null : typeId,
        assignee_id: assigneeId === "none" ? null : assigneeId,
        due_date: dueDate || null,
        price: parseFloat(price) || 0,
        status,
      };
      if (job) {
        await api.put(`/jobs/${job.id}`, payload);
        toast.success("Lavoro aggiornato");
      } else {
        await api.post("/jobs", payload);
        toast.success("Lavoro creato");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg" data-testid="work-form-modal">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {job ? "Modifica Lavoro" : "Nuovo Lavoro"}
          </DialogTitle>
          <DialogDescription>
            {job ? "Aggiorna i dati del lavoro selezionato." : "Inserisci i dati del nuovo lavoro; i campi opzionali possono essere compilati in seguito."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="work-title">Descrizione / Titolo</Label>
            <Input
              id="work-title"
              data-testid="modal-work-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es. Restyling logo cliente..."
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo di Lavoro <span className="text-slate-400 font-normal">(opzionale)</span></Label>
              <Select value={typeId} onValueChange={setTypeId}>
                <SelectTrigger data-testid="modal-work-type-select">
                  <SelectValue placeholder="Seleziona tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Senza tipo</SelectItem>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                        {t.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Membro del Team <span className="text-slate-400 font-normal">(opzionale)</span></Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger data-testid="modal-work-assignee-select">
                  <SelectValue placeholder="Assegna a..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non assegnato</SelectItem>
                  {team.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="work-date">Data di Consegna <span className="text-slate-400 font-normal">(opzionale)</span></Label>
              <Input
                id="work-date"
                type="date"
                data-testid="modal-work-date-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="work-price">Prezzo Cliente (€) <span className="text-slate-400 font-normal">(opzionale)</span></Label>
              <Input
                id="work-price"
                type="number"
                min="0"
                step="0.01"
                data-testid="modal-work-price-input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Stato Avanzamento</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="modal-work-status-select">
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
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} data-testid="modal-work-cancel-button">
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={saving}
              data-testid="modal-work-submit-button"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {job ? "Salva Modifiche" : "Crea Lavoro"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
