export const STATI = {
  in_attesa: {
    label: "In Attesa",
    badge: "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50",
  },
  in_corso: {
    label: "In Corso",
    badge: "bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50",
  },
  in_revisione: {
    label: "In Revisione",
    badge: "bg-purple-50 text-purple-700 border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50",
  },
  confezionato: {
    label: "Confezionato",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50",
  },
};

export const STATI_KEYS = Object.keys(STATI);

export const formatEuro = (v) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v || 0);

export const formatData = (d) => {
  if (!d) return "—";
  return new Date(`${d}T00:00:00`).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const isScaduto = (job) => {
  if (job.archived) return false;
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  return new Date(`${job.due_date}T00:00:00`) < oggi;
};
