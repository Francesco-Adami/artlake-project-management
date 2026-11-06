# Specifiche Tecniche e Funzionali (SRS)

**Progetto:** ArtLake Studio — Task & Project Management Web App
**Architettura:** Single-Page Web App (PWA) + Supabase (BaaS) + GitHub Pages
**Target Piattaforme:** Multipiattaforma (Windows, macOS, iOS, Android via PWA installabile)

---

## 1. Obiettivo del Progetto e Filosofia UX

Sviluppare un'applicazione interna per il team di **ArtLake Studio** dedicata alla gestione quotidiana delle task e al monitoraggio dei progetti.I principi cardine che il team di sviluppo deve rispettare sono:

1. **Zero Rumore Visivo:** Nessuna interfaccia affollata (niente "muri di mattoni" o box ridondanti). Chi apre l'app come Membro (User) deve vedere immediatamente solo la propria *Task Principale Attiva* e la propria coda prioritaria.
2. **Zero Costi & Zero Server da Manutenere:** L'infrastruttura deve appoggiarsi interamente ai piani gratuiti di **GitHub Pages** (hosting frontend) e **Supabase** (Database PostgreSQL, Autenticazione e WebSockets Realtime), garantendo che ogni membro possa aprire l'app in qualsiasi momento (anche a PC altrui spenti) trovando i dati sempre sincronizzati.
3. **Optimistic UI (Risposta in 0ms):** Ogni azione frequente (spuntare una sub-task, cambiare stato, avviare il timer) deve aggiornare istantaneamente la UI locale prima ancora che la chiamata a Supabase ritorni l'esito, restituendo la reattività di un'app desktop nativa.

---

## 2. Architettura Tecnica e Stack Consigliato

### 2.1 Frontend & Hosting

* **Hosting:** **GitHub Pages** (deploy automatico tramite GitHub Actions ad ogni push sul branch `main`).
* **Approccio Frontend:** SPA (Single Page Application) leggera (es. Vanilla JS modulare, React/Vite o Vue) senza dipendenze pesanti.
* **Configurazione PWA (Progressive Web App):**
  * File `manifest.json` configurato con `"display": "standalone"`, icone dedicate e colore di tema coerente (`#0c0d14`).
  * Meta tag per iOS Safari (`apple-mobile-web-app-capable`) per consentire l'installazione su iPhone/iPad e Mac (tramite Safari/Chrome "Aggiungi a Dock / Schermata Home").
  * `Service Worker (sw.js)` per il caching degli asset statici (HTML/CSS/JS) e avvio istantaneo.

### 2.2 Backend-as-a-Service (Supabase)

* **Database:** PostgreSQL gestito su Supabase.
* **Sincronizzazione Realtime:** Utilizzo di **Supabase Realtime (Postgres Changes)** tramite WebSockets. Quando un utente modifica lo stato di una task, spunta una checklist o segnala un blocco, la vista Admin e le viste degli altri membri connessi devono aggiornarsi in tempo reale senza ricaricare la pagina.
* **Storage:** Supabase Storage (Bucket dedicato) per il caricamento rapido di allegati leggeri o screenshot (in alternativa/aggiunta a link esterni come Google Drive, GitHub PR, Figma).
* **Autenticazione:** Supabase Auth con sessione persistente a lunga durata (`localStorage`) per evitare login continui all'apertura della PWA.

---

## 3. Struttura della Navigazione e Layout Globale

### 3.1 Assenza di Sidebar Laterale

Per massimizzare lo spazio orizzontale (fondamentale per le viste *Kanban* e *Gantt*) ed evitare un effetto "cornice soffocante", **non deve esserci alcuna sidebar verticale laterale**. Tutta la navigazione e gli strumenti globali risiedono in un'unica **Top Bar operativa** alta `64px`.

### 3.2 Anatomia della Top Bar (3 Zone) 

1. **Zona Sinistra (Brand + Navigazione a "Segmented Pill"):**
   * Logo **ArtLake Studio**.
   * **Segmented Control** a 3 voci: `[ 🏠 Dashboard | 📋 Kanban | 📅 Gantt ]`.
   * *Nota:* La voce "Dashboard" carica automaticamente la *Dashboard User* se l'utente loggato è un membro operativo, oppure la *Dashboard Admin* se l'utente ha ruolo Producer/Admin (l'Admin dispone inoltre di uno switch rapido `Vista: User / Admin` per ispezionare entrambe le modalità).
2. **Zona Centrale (Il Timer a "Pillola"):**
   * Componente compatto sempre visibile collegato alla *Task Principale Attiva* dell'utente.
   * Mostra: Indicatore luminoso (rosso pulsante se attivo), contatore `HH:MM:SS`, tasto rapido `✎` (per rettifica manuale delle ore in caso di dimenticanza del timer acceso), pulsante `▶ Avvia Timer` / `⏸ Pausa`.
   * Mostra a fianco i metadati orari personali: `Settimana: Xh Ym · Media: Zh/sett`.
   * **Comportamento Adattivo (UX Rule):** Quando l'utente naviga sulle viste **Kanban** o **Gantt**, la sezione testuale secondaria (`Settimana / Media`) si comprime/nasconde automaticamente con una transizione CSS fluida per lasciare ancora più respiro alla Top Bar.
3. **Zona Destra (Azioni Rapide & Profilo):**
   * **Bottone/Badge Check Settimanale:**
     * Se compilato per la settimana corrente: badge verde discreto `[ ✓ Check Settimanale ]`.
     * Se non ancora compilato: badge ambra evidente `[ ⚠️ Compila Check ]`.
     * Cliccandolo si apre un **Modale centrato** (non occupa mai spazio fisso nella griglia della pagina).
   * **Icona Notifiche (Campanella):** Con badge numerico delle notifiche non lette. Al click apre un menu a tendina (dropdown).
   * **Avatar e Nome Utente.**

---

## 4. Specifiche Funzionali delle Viste

### 4.1 VISTA 1A: Dashboard - User (Membro del Team)

Layout asimmetrico a **2 colonne** (`70%` Colonna Principale a sinistra / `30%` Colonna Coda a destra). Zero box annidati superflui ("effetto matrioska" vietato: usare divisori sottili `border-bottom` per separare le sezioni interne).

#### A. Colonna Sinistra (70%) — "Task Principale Attiva" (Hero Card)

Mostra **solo la singola task su cui l'utente sta lavorando in quel momento**:

* **Header:** Badge "TASK PRINCIPALE ATTIVA", tag di reparto (es. `#CoreGameplay`), scadenza (con alert visivo se `< 5 giorni`) e **Selettore di Stato** interattivo in alto a destra.
* **Stati disponibili:**
  1. `Non iniziata`
  2. `In corso`
  3. `Bloccato` *(Obbliga l'inserimento di una nota sul motivo del blocco e chi può sbloccarlo)*
  4. `In revisione` *(Richiede l'inserimento del link all'output/PR/consegna)*
  5. `Completata`
* **Barra del Tempo Integrata:** Mostra `Tempo Effettivo (es. 6h 30m)` vs `Stima (es. 10h)` con barra di progresso percentuale sottile.
* **Titolo e Descrizione della Task.**
* **Checklist Operativa (Sub-task):** Lista pulita di micro-passaggi spuntabili in tempo reale (con contatore es. `2/4 completati`) + pulsante `+ Aggiungi sub-task`.
* **Allegati & Output + Commenti:** Sezione inferiore divisa in due colonne pulite per scaricare/caricare file e scambiare commenti rapidi sulla task (con supporto menzioni `@utente`).

#### B. Colonna Destra (30%) — "Prossime Task (Coda Prioritaria)"

Mostra le successive **3-4 task assegnate all'utente**, già ordinate per priorità:

* Ogni card mostra: Titolo, Priorità (`Alta`, `Media`, `Bassa`), Scadenza (es. *Scade tra 2gg*) e Stima oraria.
* **Evidenza Blocchi Altrui ("Bloccante per..."):** Se una task in coda blocca il lavoro di un altro membro o team (es. `⚡ Bloccante per Audio Team`), la card riceve un bordo/badge ad alta visibilità (ambra/rosso) e sale in cima alla coda.
* **Azione Rapida:** Ogni card in coda ha il pulsante **`Passa a questa task →`** che la promuove istantaneamente a *Task Principale Attiva* al centro dello schermo (spostando la precedente in coda).

---

### 4.2 VISTA 1B: Dashboard - Admin (Producer / Lead)

Accessibile agli utenti con ruolo Admin quando selezionano *Dashboard*:

* **Header Operativo:** Riepilogo rapido del team e pulsante ad alta visibilità per il **Backlog Orfano** (es. `[ ⚠️ N Task Non Assegnate ]`), che permette di assegnare al volo le task create ma ancora prive di proprietario.
* **Griglia 3x2 del Team:** Una card per ciascun membro del team che mostra a colpo d'occhio:
  * Nome, Ruolo e Avatar.
  * Stato colorato (`In corso` verde, `In revisione` ambra, `Bloccato` rosso pulsante) e titolo della sua **Task Attiva** in quel preciso istante.
  * Avanzamento della checklist sulla task attiva.
  * Carico settimanale nel footer: `Task in coda: N` e `Ore lavorate / Ore stimate settimanali`.
* **Interazione (Drawer/Modale Membro):** Cliccando sulla card di un membro si apre il dettaglio della sua coda per riordinare le priorità, riassegnare task o sbloccare problemi.

---

### 4.3 VISTA 2: Vista Kanban

Sfrutta il 100% della larghezza dello schermo:

* Colonne corrispondenti agli stati: `Non iniziata`, `In corso`, `Bloccato`, `In revisione`, `Completata`.
* Supporto **Drag & Drop** (o cambio rapido) delle card tra le colonne con aggiornamento Realtime su Supabase.
* Filtri rapidi in alto per Membro del team, Reparto/Tag o Priorità.

---

### 4.4 VISTA 3: Vista Gantt (Timeline)

Sfrutta il 100% della larghezza dello schermo:

* Visualizzazione temporale (settimane/giorni) delle task attive e pianificate, raggruppate per Membro o per Milestone di progetto.
* Evidenziazione visiva delle dipendenze (frecce o indicatori sulle task che sono *bloccanti* per altre task successive).

---

## 5. Logiche di Business e Automazioni Obbligatorie

### 5.1 Automazione Timer $\leftrightarrow$ Stato Task

Per azzerare l'attrito operativo e gli errori umani:

1. **Auto-Inizio:** Se una task è nello stato `Non iniziata` e l'utente clicca su `▶ Avvia Timer`, lo stato della task deve passare **automaticamente** a `In corso`.
2. **Auto-Stop:** Se il timer sta girando e l'utente cambia lo stato della task in `Bloccato`, `In revisione` o `Completata` (oppure promuove un'altra task dalla coda), il timer corrente deve **fermarsi automaticamente**, salvando il log orario maturato fino a quel secondo.
3. **Rettifica Manuale (`✎`):** L'utente può modificare manualmente il tempo registrato su una task o una sessione qualora avesse dimenticato il timer acceso (es. durante la pausa pranzo), mantenendo così pulite le statistiche.

### 5.2 Calcolo delle Ore Settimanali e Media

* **Conteggio Settimanale (`Settimana: Xh Ym`):** Somma di tutte le ore registrate dall'utente a partire dal Lunedì alle `00:00` della settimana corrente. Si azzera automaticamente ogni lunedì.
* **Media Settimanale (`Media: Zh/sett`):** Media aritmetica delle ore lavorate nelle settimane precedenti concluse, **escludendo rigorosamente la settimana in corso** (per evitare che il lunedì mattina la media risulti falsata verso il basso).

### 5.3 Sistema di Notifiche (Real-time + In-App)

Il dropdown della campanella nella Top Bar deve generare notifiche per l'utente nei seguenti casi:

1. **Nuova Assegnazione:** Quando l'Admin o un collega gli assegna una nuova task.
2. **Commenti Altrui:** Quando qualcuno scrive un commento su una sua task (ignorando i commenti scritti dall'utente stesso).
3. **Scadenza Imminente (`< 5 giorni`):** All'apertura della Web App, verifica automatica delle task assegnate non completate che scadono entro 5 giorni.
4. **Esito Revisione:** Quando il Producer approva una task in revisione (passandola a `Completata`) o la **rigetta** (rimandandola `In corso` con note di correzione).
5. **Sblocco Task:** Quando una task precedentemente segnata come `Bloccato` viene sbloccata.

### 5.4 Check Settimanale (Modale Rapido)

* Accessibile dal pulsante nella Top Bar.
* Composto da 3 campi essenziali compilabili in 60 secondi:
  1. *Cosa è andato bene questa settimana (Obiettivi raggiunti)*
  2. *Eventuali rallentamenti o ostacoli riscontrati*
  3. *Umore / Sostenibilità del carico di lavoro (1-5 o scelta rapida)*
* Una volta inviato, salva il record su Supabase legato all'`iso_week` corrente e trasforma il bottone nella Top Bar da ambra (`Da compilare`) a verde (`✓ Check Settimanale`).

---

## 6. Schema del Database (Supabase PostgreSQL)

Di seguito la struttura relazionale essenziale da creare su Supabase:

### Tabella `profiles` (estende `auth.users`)

* `id` (UUID, PK)
* `full_name` (TEXT) — es. *"Francesco P."*
* `initials` (TEXT) — es. *"FP"*
* `role` (TEXT) — `'admin'` | `'member'`
* `department` (TEXT) — es. *"Core Dev"*, *"3D Art"*, *"Audio"*
* `active_task_id` (UUID, FK $\rightarrow$ `tasks.id`, nullable) — Indica qual è la Task Principale Attiva in questo momento per l'utente.

### Tabella `tasks`

* `id` (UUID, PK)
* `title` (TEXT, not null)
* `description` (TEXT)
* `status` (TEXT) — `'not_started'` | `'in_progress'` | `'blocked'` | `'in_review'` | `'completed'`
* `priority` (TEXT) — `'low'` | `'medium'` | `'high'`
* `department_tag` (TEXT)
* `assignee_id` (UUID, FK $\rightarrow$ `profiles.id`, nullable) — Se `NULL`, la task compare nel *Backlog Orfano*.
* `queue_order` (INT) — Ordine di priorità nella coda dell'utente.
* `estimated_minutes` (INT) — Stima oraria convertita in minuti.
* `logged_minutes` (INT, default 0) — Tempo totale effettivo lavorato (in minuti/secondi).
* `due_date` (TIMESTAMPTZ) — Data di scadenza.
* `start_date` (TIMESTAMPTZ) — Data inizio per vista Gantt.
* `blocker_reason` (TEXT, nullable) — Compilato quando `status = 'blocked'`.
* `blocking_target` (TEXT / UUID, nullable) — Indica se questa task è *bloccante per qualcun altro* (es. *"Audio Team"* o ID di un'altra task).
* `review_output_link` (TEXT, nullable) — Link PR/Asset inserito quando passa in `in_review`.
* `created_at` / `updated_at` (TIMESTAMPTZ)

### Tabella `subtasks` (Checklist operativa)

* `id` (UUID, PK)
* `task_id` (UUID, FK $\rightarrow$ `tasks.id` ON DELETE CASCADE)
* `title` (TEXT)
* `is_completed` (BOOLEAN, default false)
* `position` (INT)

### Tabella `time_logs` (Storico Timer e Calcolo Medie Settimanali)

* `id` (UUID, PK)
* `user_id` (UUID, FK $\rightarrow$ `profiles.id`)
* `task_id` (UUID, FK $\rightarrow$ `tasks.id`)
* `started_at` (TIMESTAMPTZ)
* `ended_at` (TIMESTAMPTZ, nullable se il timer è attualmente attivo)
* `duration_seconds` (INT)
* `is_manual_edit` (BOOLEAN, default false) — `true` se rettificato con il tasto `✎`.
* `year_week` (TEXT) — es. `'2026-W45'`, indicizzato per calcolare istantaneamente le ore della settimana corrente e la media delle settimane passate.

### Tabella `task_comments` & `task_attachments`

* `id` (UUID, PK), `task_id` (UUID, FK), `author_id` (UUID, FK), `content` (TEXT), `file_url` (TEXT), `created_at` (TIMESTAMPTZ).

### Tabella `weekly_checks`

* `id` (UUID, PK)
* `user_id` (UUID, FK $\rightarrow$ `profiles.id`)
* `year_week` (TEXT) — es. `'2026-W45'` (Unique constraint su `user_id + year_week`)
* `went_well` (TEXT)
* `obstacles` (TEXT)
* `workload_feeling` (TEXT)
* `submitted_at` (TIMESTAMPTZ)

### Tabella `notifications`

* `id` (UUID, PK)
* `recipient_id` (UUID, FK $\rightarrow$ `profiles.id`)
* `type` (TEXT) — `'assigned'` | `'comment'` | `'due_soon'` | `'review_result'` | `'unblocked'`
* `message` (TEXT)
* `related_task_id` (UUID, FK $\rightarrow$ `tasks.id`)
* `is_read` (BOOLEAN, default false)
* `created_at` (TIMESTAMPTZ)

---

## 7. Design System e Responsive (Desktop & Mobile PWA)

* **Palette Colori (ArtLake Dark Theme):**
  * Background principale: `#0c0d14`
  * Superficie Card / Top Bar: `#13151f` (con bordi sottili `#222638`)
  * Colore Primario / Accento: `#7c5cff` (Viola ArtLake)
  * Semantici Stato: Verde `#10b981` (*In corso / Compilato*), Ambra `#f59e0b` (*In revisione / Scadenza / Da compilare*), Rosso `#ef4444` (*Bloccato / Critico*).
* **Adattamento Mobile (Smartphone iOS/Android):**
  * Su schermi `< 768px`, il layout a 2 colonne della *Dashboard User* si impila verticalmente (prima la *Task Principale Attiva*, sotto la coda *Prossime Task*).
  * La Griglia 3x2 della *Dashboard Admin* passa a 1 colonna scorrevole.
  * Il selettore `[ Dashboard | Kanban | Gantt ]` si sposta in una **Bottom Navigation Bar** fissa in basso per essere facilmente raggiungibile con il pollice.
