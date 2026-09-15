import { Briefcase, LayoutDashboard, Table2, FolderCheck, Settings, Moon, Sun, LogOut } from "lucide-react";

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard-tab" },
  { key: "lavori", label: "Tabella Lavori", icon: Table2, testid: "nav-table-tab" },
  { key: "completati", label: "Completati", icon: FolderCheck, testid: "nav-completed-tab" },
];

export function NavigationHeader({ user, tab, setTab, dark, toggleTheme, onLogout }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold tracking-tight text-slate-900 dark:text-slate-100 hidden sm:block">
              Gestione Lavori
            </span>
          </div>

          <nav className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 p-1">
            {TABS.map(({ key, label, icon: Icon, testid }) => (
              <button
                key={key}
                data-testid={testid}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === key
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
            {user.role === "admin" && (
              <button
                data-testid="nav-settings-tab"
                onClick={() => setTab("impostazioni")}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === "impostazioni"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <Settings className="h-4 w-4" />
                <span className="hidden md:inline">Impostazioni</span>
              </button>
            )}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              data-testid="theme-toggle-button"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="flex items-center gap-2">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                style={{ backgroundColor: user.color }}
                title={user.name}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden lg:block max-w-[120px] truncate">
                {user.name}
              </span>
            </div>
            <button
              data-testid="logout-button"
              onClick={onLogout}
              title="Disconnetti"
              className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
