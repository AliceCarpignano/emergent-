import { useEffect, useState } from "react";
import api, { formatApiError } from "@/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2 } from "lucide-react";
import { formatEuro } from "@/constants";

const EMPTY_CLIENT = { name: "", piva: "", codice_fiscale: "", indirizzo: "", cap: "", citta: "", provincia: "", pec: "", codice_sdi: "" };

const CLIENT_FIELDS = [
  { key: "piva", label: "Partita IVA", testid: "client-piva-input" },
  { key: "codice_fiscale", label: "Codice Fiscale", testid: "client-cf-input" },
  { key: "indirizzo", label: "Indirizzo", testid: "client-address-input" },
  { key: "cap", label: "CAP", testid: "client-cap-input" },
  { key: "citta", label: "Città", testid: "client-city-input" },
  { key: "provincia", label: "Provincia", testid: "client-province-input" },
  { key: "pec", label: "PEC", testid: "client-pec-input" },
  { key: "codice_sdi", label: "Codice SDI", testid: "client-sdi-input" },
];

export function InvoiceModal({ open, onClose, job, onSaved }) {
  const [clients, setClients] = useState([]);
  const [clientChoice, setClientChoice] = useState("new");
  const [client, setClient] = useState(EMPTY_CLIENT);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setClientChoice("new");
      setClient(EMPTY_CLIENT);
      setInvoiceNumber("");
      setInvoiceDate(new Date().toISOString().slice(0, 10));
      api.get("/clients").then((r) => setClients(r.data)).catch(() => {});
    }
  }, [open]);

  const selectClient = (value) => {
    setClientChoice(value);
    if (value === "new") {
      setClient(EMPTY_CLIENT);
    } else {
      const c = clients.find((x) => x.id === value);
      if (c) {
        setClient({
          name: c.name,
          piva: c.piva || "",
          codice_fiscale: c.codice_fiscale || "",
          indirizzo: c.indirizzo || "",
          cap: c.cap || "",
          citta: c.citta || "",
          provincia: c.provincia || "",
          pec: c.pec || "",
          codice_sdi: c.codice_sdi || "",
        });
      }
    }
  };

  const setField = (key) => (e) => setClient((c) => ({ ...c, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/jobs/${job.id}/invoice`, {
        client,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
      });
      toast.success(`"${job.title}" fatturato a ${client.name}`);
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="invoice-modal">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Dati di Fatturazione
          </DialogTitle>
        </DialogHeader>

        {job && (
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 max-w-[60%] truncate">{job.title}</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{formatEuro(job.price)}</span>
          </div>
        )}

        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={clientChoice} onValueChange={selectClient}>
              <SelectTrigger data-testid="invoice-client-select">
                <SelectValue placeholder="Seleziona cliente salvato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">+ Nuovo cliente</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              I dati del cliente vengono salvati e riutilizzabili per le prossime fatture.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="client-name">Ragione Sociale *</Label>
              <Input id="client-name" data-testid="client-name-input" value={client.name} onChange={setField("name")} placeholder="Es. Ferretti SRL" required />
            </div>
            {CLIENT_FIELDS.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={`client-${f.key}`}>{f.label}</Label>
                <Input id={`client-${f.key}`} data-testid={f.testid} value={client[f.key]} onChange={setField(f.key)} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="space-y-2">
              <Label htmlFor="invoice-number">Numero Fattura *</Label>
              <Input id="invoice-number" data-testid="invoice-number-input" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Es. 42/2026" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-date">Data Fattura *</Label>
              <Input id="invoice-date" type="date" data-testid="invoice-date-input" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} data-testid="invoice-cancel-button">
              Annulla
            </Button>
            <Button type="submit" disabled={saving} data-testid="invoice-submit-button" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salva e Fattura
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
