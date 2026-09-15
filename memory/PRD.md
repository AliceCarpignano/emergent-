# PRD — Gestione Lavori Team

## Problem statement originale
"voglio creare un app per gestire il lavoro del mio team, ho bisogno di una tabella generale in cui si possono organizzare i lavori da fare, dividendoli nella varie persone del team che li devono svolgere, ogni lavoro deve avere una casella in cui si specificata il tipo di lavoro, la data di consegna e il prezzo fatto al cliente. deve esserci la possibilità di segnare il punto di avanzamento di ogni lavoro e di spostarli in una cartella 'completati' quando vengono confezionati."

## Scelte utente
- Account per ogni membro del team (JWT email/password)
- Tabella generale + filtri per persona/stato
- Liste modificabili (tipi di lavoro e membri team)
- Dashboard con statistiche (fatturato completati, guadagno per persona)
- UI in italiano

## Architettura
- Backend: FastAPI + Motor (MongoDB), auth JWT con cookie httpOnly, bcrypt, protezione brute-force, seed admin/dati demo all'avvio
- Frontend: React + Tailwind + shadcn/ui, axios con withCredentials, tema dark/light
- Font: Outfit (titoli), Plus Jakarta Sans (corpo), JetBrains Mono (valori monetari)

## User personas
- Admin/Owner (Marco, iariamaarco@gmail.com): gestisce lavori, liste, membri
- Member (es. Giulia Bianchi): vede e aggiorna i lavori, nessuna gestione liste/team

## Requisiti core (statici)
1. Auth multi-utente con ruoli admin/member
2. CRUD lavori: titolo, tipo, assegnatario, data consegna, prezzo, stato avanzamento
3. Archivio "Completati" con ripristino
4. Filtri per persona/stato + ricerca
5. Dashboard: fatturato completati, guadagno per persona, conteggi stati
6. Gestione liste tipi di lavoro e membri (solo admin)

## Implementato (15/06/2026)
- Auth completa (registrazione, login, logout, /me), seed admin iariamaarco@gmail.com
- API: /api/jobs (CRUD, status patch, complete/restore), /api/work-types, /api/team, /api/stats
- Frontend: LoginPage, NavigationHeader (tab + tema), StatsDashboard, GeneralWorkTable (filtri/ricerca/sort), CompletedFolder, ListManager, WorkFormModal
- Seed demo: 5 tipi lavoro, 3 member, 3 lavori attivi, 2 completati
- Test: backend 17/17 pytest, frontend Playwright — tutto verde (iteration_1)
- Dashboard: sezione guadagni aggregata per tipologia di lavoro (stats.per_tipo) invece che per persona
- Bug fix sessione: endpoint POST /api/auth/refresh + interceptor axios (rinnovo automatico access token scaduto) — verificato in iteration_2 (backend 20/20, frontend 100%)
- A11y: aria-label sul pulsante logout
- Feature Report (15/06/2026): endpoint GET /api/report?from&to (filtro per data consegna, KPI, aggregazione per_tipo), modale ReportModal con grafico a torta recharts (fatturato per tipologia), KPI e tabella lavori del periodo; pulsante "Genera Report" in Dashboard — verificato in iteration_3 (backend 26/26)
- Tabella Lavori a sezioni per membro (15/06/2026): raggruppamento per assegnatario con header collassabile (conteggio + valore sezione), sezione unica "Non assegnato" (include lavori di membri eliminati), checkbox selezione multipla con azioni bulk (confeziona/elimina selezionati), riga cliccabile apre modifica — verificato in iteration_4 (backend 30/30)
- Creazione lavoro parziale: tipo, membro, data consegna e prezzo opzionali (JobBody Optional), compilabili in seguito via modifica
- Admin sostituito (15/06/2026): admin = tipideal@tipideal.it / Admin2026!; iariamaarco@gmail.com demotato a member "Marco" (migrazione in seed_data)
- Palette tipi di lavoro estesa a 12 colori (aggiunti arancione, ciano, lime, ardesia)
- Impostazioni visibili a tutti i membri (15/06/2026): tab Impostazioni per ogni utente; gestione tipi di lavoro aperta a tutti (backend), gestione membri resta admin-only (UI read-only per membri)
- Fatturazione (15/06/2026): Completati diviso in "Da fatturare" e "Fatturati"; InvoiceModal con dati fatturazione per lavoro (cliente, P.IVA, CF, indirizzo, PEC/SDI, numero e data fattura); clienti salvati in collection dedicata e riutilizzabili (upsert per nome); endpoint /api/clients + /api/jobs/{id}/invoice|uninvoice

## Backlog
- P0: nessuno
- P1: notifiche scadenze imminenti, vista Kanban drag&drop, reset password via email
- P2: export CSV/PDF fatturato, commenti sui lavori, allegati, paginazione tabella

## Prossimi task
- In attesa di feedback utente sul MVP
