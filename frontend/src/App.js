import { useCallback, useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/AuthContext";
import api from "@/api";
import { Toaster } from "@/components/ui/sonner";
import LoginPage from "@/pages/LoginPage";
import { NavigationHeader } from "@/components/NavigationHeader";
import { StatsDashboard } from "@/components/StatsDashboard";
import { GeneralWorkTable } from "@/components/GeneralWorkTable";
import { CompletedFolder } from "@/components/CompletedFolder";
import { ListManager } from "@/components/ListManager";
import { WorkFormModal } from "@/components/WorkFormModal";
import { ReportModal } from "@/components/ReportModal";
import { Button } from "@/components/ui/button";
import { Loader2, FileBarChart } from "lucide-react";

const TITLES = {
  dashboard: { title: "Dashboard & Statistiche", sub: "Panoramica del lavoro del team" },
  lavori: { title: "Tabella Generale Lavori", sub: "Organizza, assegna e monitora i lavori" },
  completati: { title: "Archivio Completati", sub: "Lavori confezionati e fatturati" },
  impostazioni: { title: "Impostazioni Liste & Team", sub: "Gestisci tipi di lavoro e membri del team" },
};

function MainApp({ dark, toggleTheme }) {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("dashboard");
  const [jobs, setJobs] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [types, setTypes] = useState([]);
  const [team, setTeam] = useState([]);
  const [stats, setStats] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);

  const refresh = useCallback(async () => {
    const [j, c, t, m, s] = await Promise.all([
      api.get("/jobs", { params: { archived: false } }),
      api.get("/jobs", { params: { archived: true } }),
      api.get("/work-types"),
      api.get("/team"),
      api.get("/stats"),
    ]);
    setJobs(j.data);
    setCompleted(c.data);
    setTypes(t.data);
    setTeam(m.data);
    setStats(s.data);
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const openNew = () => {
    setEditingJob(null);
    setModalOpen(true);
  };

  const openEdit = (job) => {
    setEditingJob(job);
    setModalOpen(true);
  };

  const current = TITLES[tab];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950" data-testid="main-app">
      <NavigationHeader user={user} tab={tab} setTab={setTab} dark={dark} toggleTheme={toggleTheme} onLogout={logout} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        <div className="mb-6 pb-5 border-b border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{current.sub}</p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {current.title}
          </h2>
        </div>

        {tab === "dashboard" && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <Button
                onClick={() => setReportOpen(true)}
                data-testid="open-report-button"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <FileBarChart className="h-4 w-4 mr-1.5" />
                Genera Report
              </Button>
            </div>
            <StatsDashboard stats={stats} />
          </div>
        )}
        {tab === "lavori" && (
          <GeneralWorkTable
            jobs={jobs}
            types={types}
            team={team}
            isAdmin={user.role === "admin"}
            onRefresh={refresh}
            onNew={openNew}
            onEdit={openEdit}
          />
        )}
        {tab === "completati" && <CompletedFolder jobs={completed} onRefresh={refresh} />}
        {tab === "impostazioni" && (
          <ListManager types={types} team={team} isAdmin={user.role === "admin"} onRefresh={refresh} />
        )}
      </main>

      <WorkFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        types={types}
        team={team}
        job={editingJob}
        onSaved={refresh}
      />
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}

function Protected({ children }) {
  const { user } = useAuth();
  if (user === null)
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center" data-testid="loading-screen">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  if (user === false) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <Protected>
                <MainApp dark={dark} toggleTheme={() => setDark((d) => !d)} />
              </Protected>
            }
          />
        </Routes>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
