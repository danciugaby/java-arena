// ===== Java Arena: UI =====
(() => {
  'use strict';
  const A = Arena, G = Games, MJ = MiniJava;
  const L = (ro, en) => ({ ro, en });

  // ---------- persistence ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem('javaArena.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('javaArena.' + k, JSON.stringify(v)); } catch (e) { } },
  };
  const S = { lang: store.get('lang', 'ro'), nick: store.get('nick', ''), best: store.get('best', {}), games: store.get('games', {}), drafts: store.get('drafts', {}) };
  const save = () => { store.set('lang', S.lang); store.set('nick', S.nick); store.set('best', S.best); store.set('games', S.games); store.set('drafts', S.drafts); };

  // ---------- i18n ----------
  const T = {
    nav_map: ['Harta', 'Map'], nav_progress: ['Progres', 'Progress'],
    hero_eyebrow: ['Cursul de Java · capitolele 1–12', 'The Java course · chapters 1–12'],
    hero_title: ['Învață Java <em>jucând</em>.', 'Learn Java by <em>playing</em>.'],
    hero_lede: ['Provocări de cod construite pe capitolele cursului. Scrii Java adevărat, programul rulează direct în browser, primești un scor și urci din liga Lemn până în Legendă.', 'Coding challenges built on the course chapters. You write real Java, it runs right in your browser, you get a score and climb from the Wood league to Legend.'],
    cta_play: ['Joacă: Robotul de cristale', 'Play: The Crystal Robot'], cta_map: ['Vezi toate provocările', 'See all challenges'],
    stat_xp: ['XP adunat', 'XP earned'], stat_leagues: ['ligi Aur sau mai sus', 'Gold leagues or better'], stat_done: ['provocări rezolvate', 'challenges solved'],
    demo_live: ['rulează live', 'running live'], demo_actions: ['acțiuni', 'actions'], demo_gems: ['cristale', 'crystals'], demo_map: ['harta', 'map'],
    map_title: ['Harta cursului', 'The course map'],
    map_sub: ['Fiecare stație e un capitol. Provocările de cod au ligi: Lemn (testele vizibile) → Bronz (și testele ascunse) → Argint → Aur → Legendă.', 'Each station is a chapter. Coding challenges have leagues: Wood (visible tests) → Bronze (hidden tests too) → Silver → Gold → Legend.'],
    arcade_title: ['Arcade', 'Arcade'], arcade_sub: ['Mini-jocuri rapide care trec prin tot cursul.', 'Quick mini-games that cover the whole course.'],
    k_opt: ['Optimizare', 'Optimization'], k_puzzle: ['Puzzle', 'Puzzle'], k_golf: ['Cod scurt', 'Code golf'], k_game: ['Mini-joc', 'Mini-game'], k_boss: ['Boss final', 'Final boss'],
    ch: ['Cap.', 'Ch.'], back: ['Harta', 'Map'],
    tab_statement: ['Enunț', 'Statement'], tab_leagues: ['Ligi', 'Leagues'], tab_hints: ['Indicii', 'Hints'],
    viewer: ['Vizualizare', 'Viewer'], console: ['Consolă', 'Console'], tests: ['Teste', 'Test cases'], code: ['Cod Java', 'Java code'],
    run_tests: ['Rulează testele', 'Run tests'], submit: ['Trimite', 'Submit'], reset: ['Cod inițial', 'Starter code'], reset_q: ['Pierzi modificările?', 'Lose your changes?'], yes: ['Da', 'Yes'], no: ['Nu', 'No'],
    chars: ['caractere', 'characters'], running: ['Se rulează…', 'Running…'], compile_error: ['Eroare de compilare', 'Compilation error'],
    input: ['Intrare', 'Input'], expected: ['Așteptat', 'Expected'], got: ['Primit', 'Got'], output: ['Ieșirea programului', 'Program output'],
    passed: ['trecut', 'passed'], failed: ['picat', 'failed'], not_run: ['Apasă „Rulează testele” (Ctrl+Enter).', 'Press "Run tests" (Ctrl+Enter).'],
    all_visible: ['Toate testele vizibile au trecut. Trimite soluția ca să rulezi și testele ascunse.', 'All visible tests pass. Submit to run the hidden validators too.'],
    league: ['Liga', 'League'], score: ['Scor', 'Score'], hidden: ['Teste ascunse', 'Hidden validators'], reqs: ['Cerințe', 'Requirements'],
    wood_req: ['trec toate testele vizibile', 'all visible tests pass'], bronze_req: ['trec și testele ascunse', 'the hidden validators pass too'], rule: ['Regulă', 'Rule'],
    keep: ['Continuă', 'Keep going'], next_ch: ['Următoarea provocare', 'Next challenge'], best: ['cel mai bun', 'best'],
    no_league: ['fără ligă', 'no league'], new: ['nou', 'new'],
    hud_actions: ['acțiuni', 'actions'], hud_gems: ['cristale', 'crystals'], st_exit: ['a ajuns la ieșire', 'reached the exit'], st_wall: ['a lovit un perete', 'hit a wall'],
    st_noexit: ['nu a ajuns la ieșire', 'did not reach the exit'], st_gems: ['au rămas cristale necules', 'crystals left behind'], st_error: ['eroare', 'error'], st_ready: ['gata de start', 'ready'],
    hint_show: ['Arată indiciul', 'Show hint'], speed: ['viteză', 'speed'],
    map_n: ['Harta', 'Map'], submit_note: ['La trimitere rulează și 3 hărți ascunse.', 'Submitting also runs 3 hidden maps.'],
    start: ['Start', 'Start'], q_of: ['Întrebarea', 'Question'], next: ['Mai departe', 'Next'], right: ['Corect!', 'Correct!'], wrong: ['Nu chiar.', 'Not quite.'], timeup: ['Timpul a expirat.', "Time's up."],
    result: ['Rezultat', 'Result'], again: ['Joacă din nou', 'Play again'], streak: ['serie', 'streak'], points: ['puncte', 'points'], real_out: ['Ce afișează de fapt', 'What it really prints'],
    accuracy: ['răspunsuri corecte', 'correct answers'],
    bug_prompt: ['Apasă pe linia cu problema.', 'Click the line with the problem.'], bug_compile: ['Caută o eroare de compilare', 'Find a compile error'], bug_runtime: ['Caută linia care aruncă o excepție', 'Find the line that throws an exception'],
    tries: ['încercări', 'tries'], run_it: ['Rulează în JVM-ul din browser', 'Run it in the browser JVM'], round: ['Runda', 'Round'],
    mistakes: ['greșeli', 'mistakes'], step_a: ['Pas: firul A', 'Step: thread A'], step_b: ['Pas: firul B', 'Step: thread B'], restart: ['Reîncepe', 'Restart'], shared: ['memorie partajată', 'shared memory'],
    waiting: ['așteaptă lacătul', 'waiting for the lock'], finished: ['terminat', 'finished'], goal: ['Obiectiv', 'Goal'], level: ['Nivel', 'Level'], lock_by: ['lacăt deținut de', 'lock held by'],
    race_ok: ['Reușit!', 'Done!'], race_retry: ['Încă nu. Încearcă altă ordine.', 'Not yet. Try another order.'],
    profile: ['Profilul tău', 'Your profile'], nick: ['Pseudonim', 'Nickname'], nick_ph: ['de ex. Ana P.', 'e.g. Ana P.'], to_next: ['XP până la nivelul următor', 'XP to the next level'], max_lvl: ['Nivel maxim atins!', 'Top level reached!'],
    activity: ['Activitate', 'Activity'], chapter: ['Capitol', 'Chapter'], best_league: ['Cea mai bună ligă', 'Best league'], metric: ['Rezultat', 'Result'],
    copy_sum: ['Copiază rezumatul', 'Copy summary'], copied: ['Rezumat copiat', 'Summary copied'], copy_manual: ['Copiază textul de mai jos:', 'Copy the text below:'],
    reset_all: ['Șterge progresul', 'Delete progress'], reset_all_q: ['Ștergi toate rezultatele și codul salvat?', 'Delete all results and saved code?'], delete: ['Da, șterge', 'Yes, delete'], cancel: ['Anulează', 'Cancel'],
    foot_note: ['JVM-ul din browser rulează un subset de Java 25: clase, records, enum, interfețe, lambda, stream-uri, colecții, excepții. Firele de execuție sunt simulate pe rând. Progresul se păstrează doar în acest browser.', 'The in-browser JVM runs a subset of Java 25: classes, records, enums, interfaces, lambdas, streams, collections, exceptions. Threads run one after another. Progress is kept in this browser only.'],
    xp: ['XP', 'XP'], hidden_maps: ['hărți ascunse', 'hidden maps'],
  };
  const t = (k) => T[k] ? T[k][S.lang === 'en' ? 1 : 0] : k;
  const tr = (o) => !o ? '' : typeof o === 'string' ? o : (o[S.lang] !== undefined ? o[S.lang] : o.ro);
  const LEVELS = [0, 30, 80, 150, 250, 380, 540, 740, 1000];
  const LEVEL_TITLES = [L('Hello World', 'Hello World'), L('Compilator junior', 'Junior Compiler'), L('Bytecode', 'Bytecode'), L('Orientat pe obiecte', 'Object-Oriented'), L('Moștenitor', 'Inheritor'), L('Polimorf', 'Polymorph'), L('Colecționar', 'Collector'), L('Maestru al stream-urilor', 'Stream Master'), L('Arhitect JVM', 'JVM Architect')];

  // ---------- DOM helpers ----------
  const $ = (sel, el = document) => el.querySelector(sel);
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'class') el.className = v;
      else if (k === 'style') el.style.cssText = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) { if (c === null || c === undefined || c === false) continue; el.append(c instanceof Node ? c : document.createTextNode(String(c))); }
    return el;
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function toast(msg) { const el = h('div', { class: 'toast', role: 'status' }, msg); document.body.append(el); setTimeout(() => el.remove(), 2200); }

  // ---------- icons ----------
  const P = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONS = {
    terminal: P('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/>'),
    robot: P('<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9 16.5h6"/><circle cx="12" cy="3.5" r="1"/>'),
    thermo: P('<path d="M14 14.5V5a2 2 0 1 0-4 0v9.5a4 4 0 1 0 4 0z"/><path d="M12 9v7"/>'),
    bank: P('<path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>'),
    shapes: P('<circle cx="8" cy="8" r="4.5"/><rect x="12" y="12" width="8" height="8" rx="1"/><path d="M4 20l3.5-6 3.5 6z"/>'),
    table: P('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M9 9v11"/>'),
    shield: P('<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M12 8v5M12 16h.01"/>'),
    stack: P('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'),
    switch: P('<path d="M6 4v6a3 3 0 0 0 3 3h9M14 9l4 4-4 4M6 20v-3"/>'),
    stream: P('<path d="M3 7c3-3 6 3 9 0s6 3 9 0M3 12c3-3 6 3 9 0s6 3 9 0M3 17c3-3 6 3 9 0s6 3 9 0"/>'),
    crown: P('<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>'),
    eye: P('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    bug: P('<rect x="7" y="7" width="10" height="13" rx="5"/><path d="M12 7V4M9 4l1.5 2M15 4l-1.5 2M3 12h4M17 12h4M4 7l3 2M20 7l-3 2M4 18l3-2M20 18l-3-2"/>'),
    pipe: P('<rect x="2.5" y="9" width="5" height="6" rx="1"/><rect x="9.5" y="9" width="5" height="6" rx="1"/><rect x="16.5" y="9" width="5" height="6" rx="1"/><path d="M7.5 12h2M14.5 12h2"/>'),
    threads: P('<path d="M7 3v18M17 3v18M7 8h10M17 15H7"/>'),
    play: P('<path d="M7 4l13 8-13 8z" fill="currentColor"/>'), pause: P('<path d="M7 4h3v16H7zM14 4h3v16h-3z" fill="currentColor"/>'),
    first: P('<path d="M6 4v16M20 4L9 12l11 8z"/>'), stepf: P('<path d="M4 4l11 8-11 8zM18 4v16"/>'), back: P('<path d="M15 18l-6-6 6-6"/>'),
  };
  const icon = (n) => h('span', { class: 'i', html: ICONS[n] || ICONS.terminal, style: 'display:inline-grid' });

  // ---------- progress model ----------
  const CH = Object.fromEntries(A.challenges.map(c => [c.id, c]));
  const GAMES = {
    pipeline: { id: 'pipeline', icon: 'pipe', ch: '2', title: L('De la .java la procesor', 'From .java to the CPU'), blurb: L('Ordonează drumul codului prin JVM, uneltele JDK și versiunile Java.', 'Order the journey through the JVM, the JDK tools and the Java versions.'), max: 45 },
    race: { id: 'race', icon: 'threads', ch: '7', title: L('Condiția de cursă', 'The Race Condition'), blurb: L('Fii planificatorul de fire și pierde o actualizare. Apoi încearcă cu synchronized.', 'Be the thread scheduler and lose an update. Then try with synchronized.'), max: 45 },
    predict: { id: 'predict', icon: 'eye', ch: '3–9', title: L('Ce afișează?', 'What does it print?'), blurb: L('10 fragmente de cod, 20 de secunde fiecare. Ghicește ieșirea exactă.', '10 snippets, 20 seconds each. Guess the exact output.'), max: 60 },
    bughunt: { id: 'bughunt', icon: 'bug', ch: '2–9', title: L('Vânătoarea de bug-uri', 'Bug Hunt'), blurb: L('Găsește linia pe care o semnalează compilatorul sau JVM-ul.', 'Find the line the compiler or the JVM complains about.'), max: 60 },
  };
  const CHAPTERS = [
    { n: '01–02', title: L('Introducere și privire de ansamblu', 'Introduction and Java overview'), items: ['g:pipeline', 'c:hello'] },
    { n: '03', title: L('Programare Java de bază', 'Basic Java programming'), items: ['c:robot', 'c:temps'] },
    { n: '04', title: L('Programare orientată pe obiecte', 'Object-oriented programming'), items: ['c:bank'] },
    { n: '05', title: L('OOP avansat: moștenire, clase abstracte, interfețe', 'Advanced OOP: inheritance, abstract classes, interfaces'), items: ['c:shapes'] },
    { n: '06', title: L('Colecții Java', 'Java collections'), items: ['c:catalog'] },
    { n: '07', title: L('Concepte avansate: excepții, fire de execuție, lambda', 'Advanced concepts: exceptions, threads, lambdas'), items: ['c:exceptions', 'g:race'] },
    { n: '08', title: L('O privire atentă asupra colecțiilor', 'A closer look at Java collections'), items: ['c:brackets'] },
    { n: '09', title: L('Java modern', 'Modern Java features'), items: ['c:patterns', 'c:streamgolf'] },
    { n: '12', title: L('Laboratoare', 'Laboratory exercises'), items: ['c:boss'] },
  ];
  const ORDER_ALL = [...CHAPTERS.flatMap(c => c.items), 'g:predict', 'g:bughunt'];
  const LXP = A.LEAGUE_XP;
  function totalXP() {
    let x = 0;
    for (const id in S.best) x += LXP[S.best[id].league] || 0;
    for (const id in S.games) x += S.games[id].xp || 0;
    return x;
  }
  function levelOf(xp) { let i = 0; while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1]) i++; return i; }
  const leagueRank = (l) => ['none', 'wood', 'bronze', 'silver', 'gold', 'legend'].indexOf(l || 'none');
  function badge(league, big) {
    const lg = league || 'none';
    const letter = { none: '·', wood: 'W', bronze: 'B', silver: 'S', gold: 'G', legend: 'L' }[lg];
    const name = lg === 'none' ? t('new') : tr(A.LEAGUE_NAME[lg]);
    return h('span', { class: `badge l-${lg}${big ? ' big pop' : ''}`, title: `${t('league')}: ${name}` }, h('span', { class: 'hex' }, letter), h('small', null, name));
  }
  function metricText(ch, b) {
    if (!b || b.metric === null || b.metric === undefined) return b && b.score !== undefined ? `${b.score}%` : '';
    return `${b.metric} ${tr(ch.metric.label)}`;
  }

  // ---------- Java highlighter for static code ----------
  const JKW = new Set('abstract boolean break byte case catch char class continue default do double else enum extends final finally float for if implements import instanceof int interface long new null package private protected public record return sealed permits short static super switch this throw throws try var void while yield true false when'.split(' '));
  function hl(line) {
    return line.replace(/(\/\/.*$)|("(?:\\.|[^"\\])*")|('(?:\\.|[^'\\])*')|(\b\d[\d_]*(?:\.\d+)?[fFdDlL]?\b)|(@\w+)|(\b[A-Za-z_$][\w$]*\b)|([^\w\s]+|\s+)/g, (m, c, s, ch, n, an, id) => {
      if (c) return `<span class="tk-c">${esc(c)}</span>`;
      if (s || ch) return `<span class="tk-s">${esc(m)}</span>`;
      if (n) return `<span class="tk-n">${esc(n)}</span>`;
      if (an) return `<span class="tk-a">${esc(an)}</span>`;
      if (id) return JKW.has(id) ? `<span class="tk-k">${id}</span>` : /^[A-Z]/.test(id) ? `<span class="tk-t">${id}</span>` : id;
      return esc(m);
    });
  }
  function codeBlock(code, opts = {}) {
    const pre = h(opts.clickable ? 'div' : 'pre', { class: 'code' + (opts.clickable ? ' clickable' : ''), role: opts.clickable ? 'list' : null });
    code.split('\n').forEach((ln, i) => {
      const row = h(opts.clickable ? 'button' : 'div', { class: 'row', 'data-line': i + 1, type: opts.clickable ? 'button' : null, 'aria-label': opts.clickable ? `${S.lang === 'en' ? 'line' : 'linia'} ${i + 1}` : null, onclick: opts.onLine ? () => opts.onLine(i + 1, row) : null },
        h('span', { class: 'ln' }, i + 1), h('span', { class: 'tx', html: hl(ln) || ' ' }));
      pre.append(row);
    });
    return pre;
  }

  // ---------- robot renderer ----------
  const DIR_ANGLE = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  class RobotView {
    constructor(canvas, opts = {}) {
      this.cv = canvas; this.ctx = canvas.getContext('2d'); this.opts = opts; this.speed = opts.speed || 1;
      this.idx = 0; this.t = 1; this.playing = false; this.raf = 0; this.onFrame = opts.onFrame || null; this.onEnd = opts.onEnd || null;
      this.maxCell = opts.maxCell || 46;
    }
    load(map, trace) {
      const m = A.parseMap(map.rows);
      this.grid = m.g; this.rows = m.g.length; this.cols = Math.max(...m.g.map(r => r.length));
      this.gems = m.gems.map(k => k.split(',').map(Number));
      this.trace = trace && trace.length ? trace : [{ t: 'start', y: m.start.y, x: m.start.x, d: m.start.d }];
      this.states = [];
      const picked = new Set(), visited = new Set(); let pose = this.trace[0];
      for (const ev of this.trace) {
        if (ev.t === 'pick') picked.add(ev.y + ',' + ev.x);
        if (ev.y !== undefined) { pose = ev; visited.add(ev.y + ',' + ev.x); }
        this.states.push({ y: pose.y, x: pose.x, d: pose.d, picked: new Set(picked), visited: new Set(visited), ev, actions: 0 });
      }
      let a = 0; this.states.forEach(s => { if (['move', 'turn', 'pick', 'miss'].includes(s.ev.t)) a++; s.actions = a; });
      this.stop(); this.idx = 0; this.t = 1; this.resize(); this.draw(); this.emit();
    }
    get length() { return this.states ? this.states.length : 0; }
    resize() {
      const w = Math.max(220, this.cv.parentElement ? this.cv.parentElement.clientWidth : 400);
      const cell = Math.max(12, Math.min(this.maxCell, Math.floor((w - 16) / this.cols)));
      this.cell = cell; this.w = w; this.h = cell * this.rows + 16; this.ox = Math.floor((w - cell * this.cols) / 2); this.oy = 8;
      const dpr = window.devicePixelRatio || 1;
      this.cv.width = Math.round(this.w * dpr); this.cv.height = Math.round(this.h * dpr);
      this.cv.style.height = this.h + 'px'; this.dpr = dpr;
    }
    play() {
      if (this.idx >= this.length - 1) { this.idx = 0; this.t = 1; }
      this.playing = true; let last = performance.now();
      const loop = (now) => {
        if (!this.playing) return;
        const dur = (reduced ? 360 : 190) / this.speed;
        this.t += (now - last) / dur; last = now;
        if (this.t >= 1) {
          if (this.idx < this.length - 1) { this.idx++; this.t = reduced ? 1 : 0; this.emit(); }
          else { this.t = 1; this.playing = false; this.draw(); this.emit(); if (this.onEnd) this.onEnd(); return; }
        }
        this.draw();
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }
    stop() { this.playing = false; cancelAnimationFrame(this.raf); }
    seek(i) { this.stop(); this.idx = Math.max(0, Math.min(this.length - 1, i)); this.t = 1; this.draw(); this.emit(); }
    emit() { if (this.onFrame) this.onFrame(this.idx, this.states[this.idx]); }
    draw() {
      if (!this.states) return;
      const c = this.ctx, cell = this.cell, dpr = this.dpr;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = '#17120e'; c.fillRect(0, 0, this.w, this.h);
      const st = this.states[this.idx], prev = this.states[Math.max(0, this.idx - 1)];
      const now = performance.now();
      for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
        const ch = (this.grid[y] && this.grid[y][x]) || '#';
        const px = this.ox + x * cell, py = this.oy + y * cell;
        if (ch === '#') {
          c.fillStyle = '#2c231a'; rr(c, px + 1, py + 1, cell - 2, cell - 2, Math.max(2, cell * .12)); c.fill();
          c.fillStyle = 'rgba(255,230,200,.05)'; c.fillRect(px + 3, py + 3, cell - 6, Math.max(2, cell * .08));
        } else {
          c.fillStyle = '#1e1813'; c.fillRect(px, py, cell, cell);
          c.fillStyle = 'rgba(255,177,61,.10)'; c.fillRect(px + cell / 2 - 1, py + cell / 2 - 1, 2, 2);
          if (st.visited.has(y + ',' + x)) { c.fillStyle = 'rgba(255,177,61,.09)'; c.fillRect(px + 1, py + 1, cell - 2, cell - 2); }
          if (ch === 'E') {
            const pulse = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(now / 400);
            c.fillStyle = `rgba(108,208,219,${0.12 + 0.12 * pulse})`; rr(c, px + 3, py + 3, cell - 6, cell - 6, 5); c.fill();
            c.strokeStyle = '#6cd0db'; c.lineWidth = 1.5; c.setLineDash([4, 3]); rr(c, px + 3.5, py + 3.5, cell - 7, cell - 7, 5); c.stroke(); c.setLineDash([]);
            c.fillStyle = '#6cd0db'; c.font = `700 ${Math.round(cell * .32)}px ${getComputedStyle(document.body).getPropertyValue('--font-mono') || 'monospace'}`; c.textAlign = 'center'; c.textBaseline = 'middle';
            c.fillText('EXIT', px + cell / 2, py + cell / 2 + 1);
          }
        }
      }
      for (const [gy, gx] of this.gems) {
        const k = gy + ',' + gx;
        let alpha = 1;
        if (st.picked.has(k)) { if (!prev.picked.has(k) && this.t < 1) alpha = 1 - this.t; else continue; }
        const cx = this.ox + gx * cell + cell / 2, cy = this.oy + gy * cell + cell / 2;
        const s = cell * (0.22 + (reduced ? 0 : 0.03 * Math.sin(now / 300 + gx)));
        c.globalAlpha = alpha;
        const g = c.createLinearGradient(cx, cy - s, cx, cy + s); g.addColorStop(0, '#9ff1f8'); g.addColorStop(1, '#ffb13d');
        c.fillStyle = g; c.beginPath(); c.moveTo(cx, cy - s * 1.25); c.lineTo(cx + s, cy); c.lineTo(cx, cy + s * 1.25); c.lineTo(cx - s, cy); c.closePath(); c.fill();
        c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.moveTo(cx, cy - s * 1.25); c.lineTo(cx + s * .35, cy - s * .2); c.lineTo(cx - s * .35, cy - s * .2); c.closePath(); c.fill();
        c.globalAlpha = 1;
      }
      // robot pose (interpolated)
      const k = this.t >= 1 ? 1 : easeOut(this.t);
      const fy = prev.y + (st.y - prev.y) * k, fx = prev.x + (st.x - prev.x) * k;
      let a0 = DIR_ANGLE[prev.d], a1 = DIR_ANGLE[st.d]; let da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      const ang = a0 + da * k;
      const cx = this.ox + fx * cell + cell / 2, cy = this.oy + fy * cell + cell / 2, s = cell * .34;
      c.save(); c.translate(cx, cy); c.rotate(ang);
      c.fillStyle = 'rgba(0,0,0,.35)'; rr(c, -s + 2, -s + 3, 2 * s, 2 * s, s * .45); c.fill();
      c.fillStyle = '#ffb13d'; rr(c, -s, -s, 2 * s, 2 * s, s * .45); c.fill();
      c.fillStyle = '#1d1307'; rr(c, -s * .7, -s * .78, s * 1.4, s * .62, s * .25); c.fill();
      c.fillStyle = '#6cd0db'; c.beginPath(); c.arc(-s * .32, -s * .47, s * .13, 0, 7); c.arc(s * .32, -s * .47, s * .13, 0, 7); c.fill();
      c.strokeStyle = '#ffb13d'; c.lineWidth = Math.max(1.5, cell * .05); c.beginPath(); c.moveTo(0, -s); c.lineTo(0, -s * 1.35); c.stroke();
      c.fillStyle = '#fff0d8'; c.beginPath(); c.arc(0, -s * 1.38, Math.max(1.5, s * .1), 0, 7); c.fill();
      c.restore();
      if (st.ev && (st.ev.t === 'crash') && this.t >= 1) {
        c.strokeStyle = '#ff7070'; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, cell * .45, 0, 7); c.stroke();
      }
      if (this.idx === this.length - 1 && this.t >= 1 && this.grid[st.y] && this.grid[st.y][st.x] === 'E') {
        c.strokeStyle = 'rgba(126,212,146,.9)'; c.lineWidth = 2.5; c.beginPath(); c.arc(cx, cy, cell * .48, 0, 7); c.stroke();
      }
      if (this.playing || this.gems.length) { if (!this.playing && !reduced) { cancelAnimationFrame(this.idleRaf); this.idleRaf = requestAnimationFrame(() => { if (!this.playing && document.body.contains(this.cv)) this.draw(); }); } }
    }
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);

  // ---------- editor ----------
  function makeEditor(host, value, onChange, onRun) {
    if (window.CodeMirror) {
      const cm = window.CodeMirror(host, {
        value, mode: 'text/x-java', theme: 'arena', lineNumbers: true, indentUnit: 4, tabSize: 4, indentWithTabs: false, matchBrackets: true, autoCloseBrackets: true, lineWrapping: false,
        extraKeys: { 'Ctrl-Enter': () => onRun(), 'Cmd-Enter': () => onRun(), Tab: (c) => c.somethingSelected() ? c.indentSelection('add') : c.replaceSelection('    ', 'end'), 'Shift-Tab': (c) => c.indentSelection('subtract') },
      });
      cm.on('change', () => onChange(cm.getValue()));
      let marks = [];
      return {
        get: () => cm.getValue(), set: (v) => cm.setValue(v), refresh: () => cm.refresh(), focus: () => cm.focus(),
        mark(line, cls) { if (!line) return; const ln = Math.min(Math.max(0, line - 1), cm.lineCount() - 1); cm.addLineClass(ln, 'background', cls); marks.push([ln, cls]); },
        clear(cls) { marks = marks.filter(([ln, c]) => { if (!cls || c === cls) { cm.removeLineClass(ln, 'background', c); return false; } return true; }); },
        goto(line) { cm.focus(); cm.setCursor({ line: Math.max(0, line - 1), ch: 0 }); cm.scrollIntoView(null, 80); },
      };
    }
    const ta = h('textarea', { class: 'fallback', spellcheck: 'false', 'aria-label': t('code'), id: 'code-fallback' });
    ta.value = value;
    ta.addEventListener('input', () => onChange(ta.value));
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText('    ', s, ta.selectionEnd, 'end'); onChange(ta.value); }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onRun(); }
    });
    host.append(ta);
    return {
      get: () => ta.value, set: (v) => { ta.value = v; }, refresh() { }, focus: () => ta.focus(), mark() { }, clear() { },
      goto(line) { const lines = ta.value.split('\n'); let pos = 0; for (let i = 0; i < line - 1 && i < lines.length; i++) pos += lines[i].length + 1; ta.focus(); ta.setSelectionRange(pos, pos + (lines[line - 1] || '').length); },
    };
  }

  // ---------- header ----------
  function renderRail(active) {
    const xp = totalXP(), lv = levelOf(xp), cur = LEVELS[lv], nxt = LEVELS[lv + 1];
    const pct = nxt ? Math.round(100 * (xp - cur) / (nxt - cur)) : 100;
    const rail = h('header', { class: 'rail' },
      h('button', { class: 'logo', onclick: () => go('map'), 'aria-label': 'Java Arena' }, h('b', { html: 'JAVA<span>·</span>ARENA' }), h('small', null, '0xCAFEBABE')),
      h('nav', null,
        h('button', { 'aria-current': active === 'map' ? 'page' : null, onclick: () => go('map') }, t('nav_map')),
        h('button', { 'aria-current': active === 'progress' ? 'page' : null, onclick: () => go('progress') }, t('nav_progress'))),
      h('div', { class: 'spacer' }),
      h('div', { class: 'seg', role: 'group', 'aria-label': 'Language' },
        ['ro', 'en'].map(l => h('button', { 'aria-pressed': S.lang === l ? 'true' : 'false', onclick: () => { S.lang = l; save(); document.documentElement.lang = l; route(); } }, l.toUpperCase()))),
      h('button', { class: 'player', onclick: () => go('progress'), title: `${xp} XP` },
        h('span', { class: 'lvl' }, lv + 1),
        h('span', { class: 'who' }, h('b', null, S.nick || tr(LEVEL_TITLES[lv])), h('small', { class: 'num' }, `${xp} XP`), h('span', { class: 'xpbar' }, h('i', { style: `width:${pct}%` })))));
    const old = $('.rail'); if (old) old.replaceWith(rail); else document.getElementById('app').prepend(rail);
  }

  // ---------- routing ----------
  let cleanup = null;
  function go(view) { if (location.hash !== '#' + view) location.hash = view; else route(); }
  function route() {
    if (cleanup) { try { cleanup(); } catch (e) { } cleanup = null; }
    const v = (location.hash || '#map').slice(1);
    document.documentElement.lang = S.lang;
    const main = $('main'); main.innerHTML = ''; window.scrollTo(0, 0);
    if (v.startsWith('c-') && CH[v.slice(2)]) { renderRail(''); viewChallenge(CH[v.slice(2)], main); }
    else if (v.startsWith('g-') && GAMES[v.slice(2)]) { renderRail(''); viewGame(v.slice(2), main); }
    else if (v === 'progress') { renderRail('progress'); viewProgress(main); }
    else { renderRail('map'); viewMap(main); }
    renderFoot();
  }
  function renderFoot() {
    const f = $('footer.foot'); if (f) f.remove();
    $('main').after(h('footer', { class: 'foot', style: 'max-width:1480px;margin:40px auto 0;padding:16px max(16px, env(safe-area-inset-left)) 28px' },
      h('span', null, t('foot_note')), h('span', { class: 'mono' }, 'Java Arena · JDK-in-JS · 0xCAFEBABE')));
  }

  // ---------- map view ----------
  const DEMO_CODE = `void main() {
  while (!robot.atExit()) {
    if (robot.onGem())
      robot.pickGem();
    if (robot.frontIsClear())
      robot.move();
    else if (robot.leftIsClear())
      robot.turnLeft();
    else
      robot.turnRight();
  }
}`;
  function viewMap(main) {
    const solved = A.challenges.filter(c => leagueRank((S.best[c.id] || {}).league) >= 2).length;
    const goldPlus = A.challenges.filter(c => leagueRank((S.best[c.id] || {}).league) >= 4).length;
    const demoCanvas = h('canvas', { role: 'img', 'aria-label': S.lang === 'en' ? 'A robot walking through a spiral maze, collecting crystals' : 'Un robot care parcurge un labirint în spirală și adună cristale' });
    const codeLines = DEMO_CODE.split('\n').map((l, i) => h('span', { 'data-ln': i + 1, style: 'display:block' }, l || ' '));
    const hudA = h('b', null, '0'), hudG = h('b', null, '0/2');
    const demoMaps = [CH.robot.hidden[0], CH.robot.maps[2], CH.robot.hidden[1]];
    let demoIdx = 0, timer = 0;
    const hero = h('section', { class: 'hero' },
      h('div', null,
        h('div', { class: 'eyebrow' }, t('hero_eyebrow')),
        h('h1', { html: t('hero_title') }),
        h('p', { class: 'lede' }, t('hero_lede')),
        h('div', { class: 'cta' },
          h('button', { class: 'btn primary', onclick: () => go('c-robot') }, icon('robot'), t('cta_play')),
          h('button', { class: 'btn ghost', onclick: () => document.getElementById('course-map').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }) }, t('cta_map'))),
        h('div', { class: 'stats' },
          h('div', { class: 'stat' }, h('b', { class: 'num' }, totalXP()), h('span', null, t('stat_xp'))),
          h('div', { class: 'stat' }, h('b', { class: 'num' }, `${solved}/${A.challenges.length}`), h('span', null, t('stat_done'))),
          h('div', { class: 'stat' }, h('b', { class: 'num' }, goldPlus), h('span', null, t('stat_leagues'))))),
      h('div', { class: 'arena-demo' },
        h('div', { class: 'bar' }, h('i'), h('i'), h('i'), h('span', null, 'Main.java'), h('span', { class: 'live' }, '● ' + t('demo_live'))),
        h('div', { class: 'demo-body' }, h('div', null, demoCanvas), h('pre', { class: 'demo-code', 'aria-hidden': 'true' }, codeLines)),
        h('div', { class: 'demo-hud' }, h('span', null, t('demo_actions'), ': ', hudA), h('span', null, t('demo_gems'), ': ', hudG), h('span', { class: 'mapname' }, ''))));
    main.append(hero);
    const rv = new RobotView(demoCanvas, {
      maxCell: 30, speed: 1.6,
      onFrame: (i, s) => {
        codeLines.forEach(el => el.classList.toggle('on', s.ev && +el.dataset.ln === s.ev.ln));
        hudA.textContent = s.actions; hudG.textContent = `${s.picked.size}/${rv.gems.length}`;
      },
      onEnd: () => { timer = setTimeout(() => { demoIdx = (demoIdx + 1) % demoMaps.length; startDemo(); }, 1400); },
    });
    const startDemo = () => {
      const m = demoMaps[demoIdx]; const r = A.runRobot(DEMO_CODE, m);
      rv.load(m, r.robot.trace); $('.mapname', hero).textContent = `${t('demo_map')}: ${tr(m.name)}`;
      if (reduced) { rv.seek(rv.length - 1); } else rv.play();
    };
    requestAnimationFrame(startDemo);
    const onResize = () => { rv.resize(); rv.draw(); };
    window.addEventListener('resize', onResize);
    cleanup = () => { rv.stop(); clearTimeout(timer); window.removeEventListener('resize', onResize); };

    main.append(h('div', { class: 'section-head', id: 'course-map' }, h('h2', null, t('map_title')), h('p', null, t('map_sub'))));
    const track = h('div', { class: 'track' });
    for (const st of CHAPTERS) track.append(h('section', { class: 'station' },
      h('div', { class: 'no', 'aria-hidden': 'true' }, st.n, h('small', null, t('ch') + ' ' + st.n)),
      h('div', null, h('h3', null, tr(st.title)), h('div', { class: 'tiles' }, st.items.map(tile)))));
    main.append(track);
    main.append(h('div', { class: 'section-head' }, h('h2', null, t('arcade_title')), h('p', null, t('arcade_sub'))));
    main.append(h('div', { class: 'tiles' }, ['g:predict', 'g:bughunt'].map(tile)));
  }
  function tile(ref) {
    const [kind, id] = ref.split(':');
    if (kind === 'g') {
      const g = GAMES[id]; const st = S.games[id];
      return h('button', { class: 'tile', onclick: () => go('g-' + id) },
        h('span', { class: 'ico' }, icon(g.icon)),
        h('span', null, h('span', { class: 'kind game' }, t('k_game')), h('b', null, tr(g.title)), h('p', null, tr(g.blurb))),
        h('span', { class: 'badge l-none' }, h('span', { class: 'hex', style: st && st.xp ? 'background:var(--accent);color:var(--accent-ink)' : '' }, st && st.xp ? st.xp : '·'), h('small', null, st && st.xp ? 'XP' : t('new'))));
    }
    const c = CH[id]; const b = S.best[id];
    const kindLabel = c.boss ? t('k_boss') : c.kind === 'robot' ? t('k_opt') : (c.metric && c.metric.kind === 'chars') ? t('k_golf') : t('k_puzzle');
    return h('button', { class: 'tile' + (c.featured ? ' featured' : '') + (c.boss ? ' boss' : ''), onclick: () => go('c-' + id) },
      h('span', { class: 'ico' }, icon(c.icon)),
      h('span', null, h('span', { class: 'kind' + (c.boss ? ' boss' : '') }, kindLabel), h('b', null, tr(c.title)), h('p', null, tr(c.blurb)),
        b && b.metric !== undefined && b.metric !== null ? h('p', { class: 'mono', style: 'margin-top:6px;font-size:12px;color:var(--dim)' }, `${t('best')}: ${metricText(c, b)}`) : null),
      badge(b && b.league));
  }

  // ---------- challenge view ----------
  function viewChallenge(ch, main) {
    const isRobot = ch.kind === 'robot';
    const testsSpec = isRobot ? ch.maps.map((m, i) => ({ name: m.name, show: `${t('map_n')} ${i + 1}` })) : ch.tests;
    const results = testsSpec.map(() => null);
    let sel = 0, lastSubmit = null, rv = null, stackTimer = 0;
    const draft = S.drafts[ch.id];
    const best = S.best[ch.id];

    const head = h('div', { class: 'ide-head' },
      h('button', { class: 'btn small ghost', onclick: () => go('map') }, icon('back'), t('back')),
      h('h1', null, tr(ch.title)),
      h('span', { class: 'chip' }, `${t('ch')} ${String(ch.ch).padStart(2, '0')}`),
      h('span', { class: 'spacer', style: 'flex:1' }),
      h('span', { id: 'best-badge' }, badge(best && best.league)));
    main.append(head);

    // statement panel with tabs
    const stBody = h('div', { class: 'statement', id: 'statement-body', role: 'tabpanel' });
    const tabsEl = h('div', { class: 'tabs', role: 'tablist' });
    const tabs = [['statement', t('tab_statement')], ['leagues', t('tab_leagues')], ['hints', t('tab_hints')]];
    let tab = 'statement';
    const renderTab = () => {
      tabsEl.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === tab ? 'true' : 'false'));
      stBody.innerHTML = '';
      if (tab === 'statement') { stBody.innerHTML = tr(ch.statement); if (isRobot) stBody.append(h('p', { class: 'note' }, t('submit_note'))); }
      else if (tab === 'leagues') stBody.append(leagueList());
      else {
        ch.hints.forEach((hint, i) => {
          const box = h('div', { class: 'explain', style: 'display:none', html: tr(hint) });
          const btn = h('button', { class: 'btn small', onclick: () => { box.style.display = ''; btn.remove(); } }, `${t('hint_show')} ${i + 1}`);
          stBody.append(h('div', { style: 'margin:10px 0' }, btn, box));
        });
      }
    };
    tabs.forEach(([id, label]) => tabsEl.append(h('button', { role: 'tab', 'data-tab': id, id: 'tab-' + id, onclick: () => { tab = id; renderTab(); } }, label)));
    const leagueList = () => {
      const cur = leagueRank((S.best[ch.id] || {}).league);
      const st = lastSubmit ? lastSubmit.bonusState : null;
      const rows = [
        ['wood', t('wood_req')],
        ['bronze', t('bronze_req') + (ch.gate ? ` · ${t('rule')}: ${tr(ch.gate.label)}` : '')],
        ...ch.bonus.map((b, i) => [b.league, tr(b.label), st ? st[i] : null]),
      ];
      return h('ul', { class: 'leagues-list' }, rows.map(([lg, text, ok]) => h('li', { class: (leagueRank(lg) <= cur || ok) ? 'done' : '' }, badge(lg), h('span', null, text, ok === false ? h('em', null, S.lang === 'en' ? 'not yet met in your last submit' : 'neîndeplinită la ultima trimitere') : null))));
    };
    const stPanel = h('section', { class: 'panel' }, h('header', null, tabsEl), stBody);

    // viewer
    const vBody = h('div', { class: 'viewer', id: 'viewer' });
    const vHeadRight = h('div', { class: 'maptabs', role: 'tablist' });
    const vPanel = h('section', { class: 'panel' }, h('header', null, h('h2', null, t('viewer')), h('span', { style: 'flex:1' }), vHeadRight), vBody);

    // editor
    const host = h('div', { class: 'editor-host' });
    const sizeEl = h('span', { class: 'num' }, '');
    const confirmBox = h('span', { style: 'display:none;gap:6px;align-items:center' }, h('span', { style: 'font-size:12px;color:var(--muted)' }, t('reset_q')),
      h('button', { class: 'btn small', onclick: () => { editor.set(ch.starter); delete S.drafts[ch.id]; save(); confirmBox.style.display = 'none'; resetBtn.style.display = ''; } }, t('yes')),
      h('button', { class: 'btn small ghost', onclick: () => { confirmBox.style.display = 'none'; resetBtn.style.display = ''; } }, t('no')));
    const resetBtn = h('button', { class: 'btn small ghost', onclick: () => { resetBtn.style.display = 'none'; confirmBox.style.display = 'inline-flex'; } }, t('reset'));
    const runBtn = h('button', { class: 'btn', id: 'run-btn', onclick: () => runTests() }, icon('play'), t('run_tests'), h('kbd', null, 'Ctrl+↵'));
    const subBtn = h('button', { class: 'btn primary', id: 'submit-btn', onclick: () => submit() }, t('submit'));
    const edPanel = h('section', { class: 'panel' },
      h('header', null, h('h2', null, t('code')), h('span', { style: 'flex:1' }), resetBtn, confirmBox),
      h('div', { class: 'editor-wrap' }, host),
      h('div', { class: 'runbar' }, h('span', { class: 'meta' }, sizeEl, ' ', t('chars')), runBtn, subBtn));
    const testsList = h('ul', { class: 'tests', role: 'listbox', 'aria-label': t('tests') });
    const tPanel = h('section', { class: 'panel' }, h('header', null, h('h2', null, t('tests'))), testsList);
    const cons = h('pre', { class: 'console', id: 'console', 'aria-live': 'polite' }, t('not_run'));
    const cPanel = h('section', { class: 'panel' }, h('header', null, h('h2', null, t('console'))), cons);

    main.append(h('div', { class: 'ide' }, h('div', { class: 'col' }, stPanel, vPanel), h('div', { class: 'col' }, edPanel, tPanel, cPanel)));
    renderTab();

    let saveT = 0;
    const editor = makeEditor(host, draft || ch.starter, (v) => {
      clearTimeout(saveT); saveT = setTimeout(() => { S.drafts[ch.id] = v; save(); }, 400);
      sizeEl.textContent = A.codeSize(v); editor.clear('cm-error-line');
    }, () => runTests());
    sizeEl.textContent = A.codeSize(editor.get());
    setTimeout(() => editor.refresh(), 0);

    // tests list
    const renderTests = () => {
      testsList.innerHTML = '';
      testsSpec.forEach((ts, i) => {
        const r = results[i];
        const ok = r ? (isRobot ? r.ok : r.pass) : null;
        testsList.append(h('li', null, h('button', { role: 'option', 'aria-selected': i === sel ? 'true' : 'false', onclick: () => { sel = i; renderTests(); showResult(); } },
          h('span', { class: 'st' + (ok === true ? ' ok' : ok === false ? ' ko' : '') }, ok === true ? '✓' : ok === false ? '✗' : String(i + 1).padStart(2, '0')),
          h('span', { class: 'tn' }, tr(ts.name), h('small', null, ts.show || '')),
          h('span', { class: 'mono', style: 'font-size:11px;color:var(--dim)' }, ok === true ? t('passed') : ok === false ? t('failed') : ''))));
      });
      if (isRobot) {
        vHeadRight.innerHTML = '';
        ch.maps.forEach((m, i) => { const r = results[i]; vHeadRight.append(h('button', { role: 'tab', 'aria-selected': i === sel ? 'true' : 'false', class: r ? (r.ok ? 'ok' : 'ko') : '', onclick: () => { sel = i; renderTests(); showResult(); } }, `${t('map_n')} ${i + 1}`)); });
      }
    };
    // console output with clickable line references
    const consoleWrite = (parts) => {
      cons.innerHTML = '';
      for (const [cls, text] of parts) {
        if (text === undefined || text === null) continue;
        const span = h('span', { class: cls || '' });
        String(text).split(/(Main\.java:\d+)/).forEach(seg => {
          const m = seg.match(/^Main\.java:(\d+)$/);
          if (m) span.append(h('span', { class: 'lnk', role: 'link', tabindex: '0', onclick: () => editor.goto(+m[1]), onkeydown: (e) => { if (e.key === 'Enter') editor.goto(+m[1]); } }, seg));
          else span.append(seg);
        });
        cons.append(span);
      }
    };
    const showResult = () => {
      clearInterval(stackTimer);
      const r = results[sel], ts = testsSpec[sel];
      editor.clear('cm-exec-line');
      if (isRobot) return showRobot(r);
      if (!r) { consoleWrite([['k', `▶ ${tr(ts.name)}\n`], ['k', `${t('input')}: `], ['v', ts.show + '\n\n'], ['k', t('not_run')]]); renderViewer(null); return; }
      if (r.compile) return;
      const parts = [['k', `▶ ${tr(ts.name)}\n`], ['k', `${t('input')}: `], ['v', ts.show + '\n']];
      if (r.pass) parts.push(['ok', `✓ ${t('passed')}: `], ['v', r.got + '\n']);
      else { parts.push(['k', `${t('expected')}: `], ['v', r.want + '\n'], ['k', `${t('got')}: `], ['err', r.got + '\n']); }
      if (r.error && r.error.text) parts.push(['err', '\n' + (r.error.kind === 'compile' ? MJ.formatError(r.error, editor.get()) : r.error.text) + '\n']);
      else if (r.errText && !r.pass && r.errText !== r.got && r.errText !== 'expected exception' && r.errText !== 'wrong exception') parts.push(['err', '\n' + r.errText + '\n']);
      if (r.out) parts.push(['k', `\n${t('output')}:\n`], ['v', r.out]);
      consoleWrite(parts);
      if (r.error && r.error.ln) editor.mark(r.error.ln, 'cm-error-line');
      renderViewer(r);
    };
    const showRobot = (r) => {
      const m = ch.maps[sel];
      vBody.innerHTML = '';
      const cv = h('canvas', { role: 'img', 'aria-label': tr(m.name) });
      vBody.append(cv);
      const slider = h('input', { type: 'range', min: '0', max: '0', value: '0', 'aria-label': 'step', id: 'robot-scrub' });
      const hud = h('span', { class: 'hud' });
      const playBtn = h('button', { class: 'iconbtn', 'aria-label': 'play', html: ICONS.play });
      const speedSel = h('select', { 'aria-label': t('speed'), id: 'robot-speed', style: 'background:var(--panel-2);color:var(--text);border:1px solid var(--line-2);border-radius:6px;padding:3px' }, [1, 2, 4, 8].map(s => h('option', { value: s }, s + '×')));
      const status = r ? statusText(r) : t('st_ready');
      rv = new RobotView(cv, {
        onFrame: (i, s) => {
          slider.max = rv.length - 1; slider.value = i;
          hud.innerHTML = `<b>${s.actions}</b> ${t('hud_actions')} · <b>${s.picked.size}/${rv.gems.length}</b> ${t('hud_gems')}` + (i === rv.length - 1 && r ? ` · ${esc(status)}` : '');
          editor.clear('cm-exec-line'); if (s.ev && s.ev.ln && rv.playing) editor.mark(s.ev.ln, 'cm-exec-line');
          playBtn.innerHTML = rv.playing ? ICONS.pause : ICONS.play;
        },
        onEnd: () => { playBtn.innerHTML = ICONS.play; editor.clear('cm-exec-line'); },
      });
      speedSel.value = '2'; rv.speed = 2;
      speedSel.addEventListener('change', () => { rv.speed = +speedSel.value; });
      playBtn.addEventListener('click', () => { if (rv.playing) { rv.stop(); playBtn.innerHTML = ICONS.play; } else rv.play(); });
      slider.addEventListener('input', () => rv.seek(+slider.value));
      vBody.append(h('div', { class: 'vctrl' },
        h('button', { class: 'iconbtn', 'aria-label': 'first', html: ICONS.first, onclick: () => rv.seek(0) }), playBtn,
        h('button', { class: 'iconbtn', 'aria-label': 'step', html: ICONS.stepf, onclick: () => rv.seek(rv.idx + 1) }), slider, speedSel, hud));
      rv.load(m, r && r.robot ? r.robot.trace : null);
      if (r && r.robot) { if (!reduced) rv.play(); else rv.seek(rv.length - 1); }
      // console
      if (!r) { consoleWrite([['k', `▶ ${tr(m.name)}\n`], ['k', t('not_run')]]); return; }
      if (r.compile) return;
      const parts = [['k', `▶ ${tr(m.name)}\n`], [r.ok ? 'ok' : 'err', (r.ok ? '✓ ' : '✗ ') + status + '\n'], ['k', `${t('hud_actions')}: `], ['v', r.actions + '\n'], ['k', `${t('hud_gems')}: `], ['v', `${r.robot.picked}/${r.robot.total}\n`]];
      if (r.res && !r.res.ok) parts.push(['err', '\n' + (r.res.kind === 'compile' ? MJ.formatError(r.res, editor.get()) : r.res.text) + '\n']);
      if (r.out) parts.push(['k', `\n${t('output')}:\n`], ['v', r.out]);
      consoleWrite(parts);
      if (r.res && !r.res.ok && r.res.ln) editor.mark(r.res.ln, 'cm-error-line');
      if (r.res && !r.res.ok && r.res.text && !(r.robot && r.robot.crashed)) vBody.append(errCard(r.res.kind === 'limit' ? statusText(r) : (S.lang === 'en' ? 'Runtime error' : 'Eroare la rulare'), r.res.kind === 'compile' ? MJ.formatError(r.res, editor.get()) : r.res.text));
    };
    const statusText = (r) => {
      if (r.ok) return t('st_exit');
      if (r.robot && r.robot.crashed) return t('st_wall');
      if (r.why === 'not-exit') return t('st_noexit');
      if (r.why === 'gems') return t('st_gems');
      if (r.res && r.res.kind === 'limit') return S.lang === 'en' ? 'time limit (infinite loop?)' : 'limită de timp (buclă infinită?)';
      return t('st_error');
    };
    // non-robot visualizations
    const renderViewer = (r) => {
      vBody.innerHTML = '';
      const ts = testsSpec[sel];
      if (ch.visual === 'shapes') {
        const items = r && r.draw ? r.draw : null;
        if (!items) { vBody.append(h('div', { class: 'empty' }, t('not_run'))); return; }
        const cv = h('canvas', { role: 'img', 'aria-label': items.map(d => d.k).join(', ') }); vBody.append(cv);
        requestAnimationFrame(() => drawShapes(cv, items));
        return;
      }
      if (ch.visual === 'bank' && r && r.log) {
        vBody.append(h('div', { class: 'bank-ledger' }, r.log.map(([lab, bal]) => h('div', { class: 'acct' }, h('span', null, lab), h('b', null, typeof bal === 'number' ? MJ.fmtDouble(bal) + ' lei' : bal)))));
        vBody.append(cmpCards(ts, r)); return;
      }
      if (ch.visual === 'catalog' && r && r.bars && r.bars.length) {
        const max = Math.max(...r.bars.map(b => b[1]), 1);
        const wrap = h('div', { class: 'bars' }, r.bars.map(([g, n]) => h('div', { class: 'barrow' }, h('span', null, g), h('span', null, h('i', { style: 'width:0%', 'data-w': (100 * n / max) + '%' })), h('b', { class: 'num' }, n))));
        vBody.append(wrap); vBody.append(cmpCards(ts, r));
        requestAnimationFrame(() => wrap.querySelectorAll('i').forEach(i => { i.style.width = i.dataset.w; }));
        return;
      }
      if (ch.visual === 'stack' && r && r.stackOf !== undefined) { vBody.append(stackViz(r.stackOf, r)); vBody.append(cmpCards(ts, r)); return; }
      vBody.append(cmpCards(ts, r));
    };
    const cmpCards = (ts, r) => {
      const want = r && r.want ? r.want : (ts.want !== undefined ? String(ts.want) : '…');
      const got = r ? r.got : '…';
      const long = (ts.show + want + got).length > 70 || /\n/.test(got);
      const box = h('div', { class: 'cmp' + (long ? ' long' : '') },
        h('div', null, h('small', null, t('input')), h('code', null, ts.show)),
        h('div', null, h('small', null, t('expected')), h('code', null, want)),
        h('div', { class: r ? (r.pass ? 'ok' : 'ko') : '' }, h('small', null, t('got')), h('code', null, r && r.error ? (r.error.exName ? r.error.exName + (r.error.message ? ': ' + r.error.message : '') : (S.lang === 'en' ? 'error (see below)' : 'eroare (vezi mai jos)')) : got)));
      const wrapEl = h('div', null, box);
      if (r && r.error && r.error.text) wrapEl.append(errCard(r.error.kind === 'compile' ? t('compile_error') : (S.lang === 'en' ? 'Runtime error' : 'Eroare la rulare'), r.error.kind === 'compile' ? MJ.formatError(r.error, editor.get()) : r.error.text));
      return wrapEl;
    };
    const errCard = (title, text) => {
      const pre = h('pre');
      String(text).split(/(Main\.java:\d+)/).forEach(seg => { const m = seg.match(/^Main\.java:(\d+)$/); pre.append(m ? h('span', { class: 'lnk', role: 'link', tabindex: '0', onclick: () => editor.goto(+m[1]) }, seg) : seg); });
      return h('div', { class: 'errcard', role: 'alert' }, h('small', null, title), pre);
    };
    const stackViz = (s, r) => {
      const steps = []; const st = []; let bad = -1, depth = 0;
      for (let i = 0; i < s.length; i++) {
        const c = s[i], o = '([{'.indexOf(c), cl = ')]}'.indexOf(c);
        if (o >= 0) { st.push(c); depth = Math.max(depth, st.length); }
        else if (cl >= 0) { if (!st.length || '([{'.indexOf(st[st.length - 1]) !== cl) { bad = i; steps.push({ i, st: [...st], bad: true }); break; } st.pop(); }
        steps.push({ i, st: [...st] });
      }
      const strEl = h('div', { class: 'str' }, [...s].map(c => h('span', null, c)));
      const pile = h('div', { class: 'pile' });
      const info = h('div', { class: 'mono', style: 'font-size:12.5px;color:var(--muted)' }, '');
      const box = h('div', { class: 'stackviz' }, strEl, h('div', { style: 'display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:end' }, h('span', { class: 'mono', style: 'font-size:11px;color:var(--dim)' }, 'Deque'), pile), info);
      let k = 0;
      const frame = () => {
        const stp = steps[Math.min(k, steps.length - 1)];
        strEl.querySelectorAll('span').forEach((el, i) => { el.className = stp && i === stp.i ? (stp.bad ? 'bad' : 'cur') : ''; });
        pile.innerHTML = ''; (stp ? stp.st : []).forEach(c => pile.append(h('span', null, c)));
        if (k >= steps.length - 1) { info.textContent = (bad >= 0 || st.length) ? (S.lang === 'en' ? `unbalanced (reference algorithm)` : `neechilibrat (algoritmul de referință)`) : (S.lang === 'en' ? `balanced, max depth ${depth} (reference algorithm)` : `echilibrat, adâncime maximă ${depth} (algoritmul de referință)`); clearInterval(stackTimer); }
        k++;
      };
      frame(); stackTimer = setInterval(frame, reduced ? 50 : 420);
      return box;
    };

    // run & submit
    const setBusy = (b) => { runBtn.disabled = b; subBtn.disabled = b; if (b) consoleWrite([['k', t('running')]]); };
    async function runTests() {
      const code = editor.get(); S.drafts[ch.id] = code; save();
      editor.clear(); setBusy(true); await sleep(20);
      const ce = A.compileCheck(code);
      if (ce) {
        results.fill(null); renderTests(); setBusy(false);
        consoleWrite([['err', `${t('compile_error')}\n\n${ce}`]]);
        const m = ce.match(/Main\.java:(\d+)/); if (m) editor.mark(+m[1], 'cm-error-line');
        clearInterval(stackTimer); if (rv) rv.stop();
        vBody.innerHTML = ''; vBody.append(errCard(t('compile_error'), ce));
        return;
      }
      for (let i = 0; i < testsSpec.length; i++) {
        results[i] = isRobot ? A.runRobot(code, ch.maps[i]) : A.runOne(ch, code, ch.tests[i]);
        renderTests(); await sleep(10);
      }
      setBusy(false);
      const firstBad = results.findIndex(r => !(isRobot ? r.ok : r.pass));
      sel = firstBad >= 0 ? firstBad : sel; renderTests(); showResult();
      if (firstBad < 0) { const extra = h('span', { class: 'ok' }, '\n\n' + t('all_visible')); cons.append(extra); }
    }
    async function submit() {
      const code = editor.get(); S.drafts[ch.id] = code; save();
      setBusy(true); await sleep(30);
      const res = A.submit(ch, code);
      setBusy(false);
      lastSubmit = res;
      if (res.compile) { consoleWrite([['err', `${t('compile_error')}\n\n${res.compile}`]]); const m = res.compile.match(/Main\.java:(\d+)/); if (m) editor.mark(+m[1], 'cm-error-line'); clearInterval(stackTimer); if (rv) rv.stop(); vBody.innerHTML = ''; vBody.append(errCard(t('compile_error'), res.compile)); return; }
      res.tests.forEach((r, i) => { results[i] = r; }); renderTests(); showResult();
      const prev = S.best[ch.id];
      const xpBefore = totalXP();
      const better = !prev || leagueRank(res.league) > leagueRank(prev.league) || (leagueRank(res.league) === leagueRank(prev.league) && res.metric !== null && prev.metric !== null && res.metric < prev.metric);
      if (better && res.league !== 'none') S.best[ch.id] = { league: res.league, metric: res.metric, score: res.score, at: Date.now() };
      save();
      const gain = totalXP() - xpBefore;
      renderRail('');
      $('#best-badge').replaceChildren(badge((S.best[ch.id] || {}).league));
      if (tab === 'leagues') renderTab();
      showSubmitModal(ch, res, gain);
    }
    const onKey = (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !window.CodeMirror) { e.preventDefault(); runTests(); } };
    document.addEventListener('keydown', onKey);
    const onResize = () => { if (rv) { rv.resize(); rv.draw(); } };
    window.addEventListener('resize', onResize);
    cleanup = () => { if (rv) rv.stop(); clearInterval(stackTimer); document.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize); clearTimeout(saveT); };
    renderTests(); showResult();
  }
  function drawShapes(cv, items) {
    const w = Math.max(260, cv.parentElement.clientWidth), hgt = 230, dpr = window.devicePixelRatio || 1;
    cv.width = w * dpr; cv.height = hgt * dpr; cv.style.height = hgt + 'px';
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = '#17120e'; c.fillRect(0, 0, w, hgt);
    const dims = items.map(d => d.k === 'Circle' ? [2 * d.p[0], 2 * d.p[0]] : d.k === 'Square' ? [d.p[0], d.p[0]] : d.k === 'Triangle' ? [d.p[2], triH(d.p)] : [d.p[0], d.p[1]]);
    const slot = w / items.length; const maxD = Math.max(...dims.map(([a, b]) => Math.max(a, b)));
    const scale = Math.min((slot - 30) / maxD, 150 / maxD);
    items.forEach((d, i) => {
      const cx = slot * i + slot / 2, cy = 95;
      c.lineWidth = 2; c.strokeStyle = d.ok ? '#7ed492' : '#ffb13d'; c.fillStyle = d.ok ? 'rgba(126,212,146,.14)' : 'rgba(255,177,61,.14)';
      c.beginPath();
      if (d.k === 'Circle') c.arc(cx, cy, d.p[0] * scale, 0, Math.PI * 2);
      else if (d.k === 'Triangle') {
        const [a, b, cc] = d.p; const x = (b * b + cc * cc - a * a) / (2 * cc), y = Math.sqrt(Math.max(0, b * b - x * x));
        const ox = cx - cc * scale / 2, oy = cy + y * scale / 2;
        c.moveTo(ox, oy); c.lineTo(ox + cc * scale, oy); c.lineTo(ox + x * scale, oy - y * scale); c.closePath();
      } else { const [ww, hh] = d.k === 'Square' ? [d.p[0], d.p[0]] : d.p; c.rect(cx - ww * scale / 2, cy - hh * scale / 2, ww * scale, hh * scale); }
      c.fill(); c.stroke();
      c.textAlign = 'center'; c.font = '600 12px "JetBrains Mono", monospace'; c.fillStyle = '#b09d8a';
      c.fillText(`${d.k}(${d.p.join(', ')})`, cx, 196);
      c.fillStyle = d.ok ? '#7ed492' : '#ff7070';
      c.fillText(d.label !== undefined ? d.label : `area = ${typeof d.area === 'number' ? (Math.round(d.area * 1000) / 1000) : '?'}`, cx, 215);
    });
  }
  const triH = ([a, b, c]) => { const x = (b * b + c * c - a * a) / (2 * c); return Math.sqrt(Math.max(0, b * b - x * x)); };

  function showSubmitModal(ch, res, gain) {
    const all = [...res.tests, ...res.validators];
    const isRobot = ch.kind === 'robot';
    const names = [...(isRobot ? ch.maps : ch.tests), ...(isRobot ? ch.hidden : ch.validators)].map(x => tr(x.name));
    const idx = ORDER_ALL.indexOf('c:' + ch.id);
    const nextRef = ORDER_ALL[idx + 1];
    const close = () => { ov.remove(); document.removeEventListener('keydown', esck); };
    const esck = (e) => { if (e.key === 'Escape') close(); };
    const ov = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'res-title', onclick: (e) => { if (e.target === ov) close(); } },
      h('div', { class: 'modal' },
        h('div', { class: 'top' }, badge(res.league, true),
          h('div', null,
            h('h2', { id: 'res-title' }, `${t('league')}: ${res.league === 'none' ? t('no_league') : tr(A.LEAGUE_NAME[res.league])}`),
            h('div', { class: 'sub num' }, `${t('score')}: ${res.score}%` + (res.metric !== null && res.metric !== undefined ? ` · ${res.metric} ${tr(ch.metric.label)}` : '') + ` · ${res.size} ${t('chars')}`),
            gain > 0 ? h('div', { class: 'xpgain' }, `+${gain} XP`) : null)),
        h('div', null, h('h3', { style: 'font-size:13px;font-family:var(--font-mono);color:var(--muted);margin-bottom:6px' }, `${t('tests')} + ${t('hidden')}`),
          h('ul', null, all.map((r, i) => h('li', null, h('span', { class: (r.pass || r.ok) ? 'y' : 'n' }, (r.pass || r.ok) ? '✓' : '✗'), h('span', null, names[i]), h('small', null, i >= res.tests.length ? t('hidden') : (isRobot ? `${r.actions} ${t('hud_actions')}` : '')))))),
        h('div', null, h('h3', { style: 'font-size:13px;font-family:var(--font-mono);color:var(--muted);margin-bottom:6px' }, t('reqs')),
          h('ul', null,
            ch.gate ? h('li', null, h('span', { class: res.gate ? 'y' : 'n' }, res.gate ? '✓' : '✗'), h('span', null, tr(ch.gate.label)), h('small', null, t('rule'))) : null,
            ch.bonus.map((b, i) => h('li', null, h('span', { class: res.bonusState[i] ? 'y' : 'n' }, res.bonusState[i] ? '✓' : '✗'), h('span', null, tr(b.label)), h('small', null, tr(A.LEAGUE_NAME[b.league])))))),
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost', onclick: close, id: 'modal-close' }, t('keep')),
          nextRef ? h('button', { class: 'btn primary', onclick: () => { close(); go((nextRef[0] === 'c' ? 'c-' : 'g-') + nextRef.slice(2)); } }, t('next_ch') + ' →') : null)));
    document.body.append(ov); document.addEventListener('keydown', esck);
    setTimeout(() => $('#modal-close') && $('#modal-close').focus(), 30);
  }

  // ---------- games ----------
  function gameHead(main, g, scoreEls) {
    main.append(h('div', { class: 'game-head' },
      h('button', { class: 'btn small ghost', onclick: () => go('map') }, icon('back'), t('back')),
      h('h1', null, tr(g.title)), h('span', { class: 'chip' }, `${t('ch')} ${g.ch}`),
      h('div', { class: 'scorebox' }, scoreEls)));
  }
  function recordGame(id, score, xp) {
    const prev = S.games[id] || { best: 0, xp: 0 };
    const before = totalXP();
    S.games[id] = { best: Math.max(prev.best || 0, score), xp: Math.max(prev.xp || 0, Math.min(GAMES[id].max, xp)), plays: (prev.plays || 0) + 1 };
    save(); renderRail('');
    return totalXP() - before;
  }
  function viewGame(id, main) {
    const wrap = h('div', { class: 'game' }); main.append(wrap);
    ({ predict: gamePredict, bughunt: gameBug, pipeline: gamePipeline, race: gameRace })[id](wrap, GAMES[id]);
  }
  function endCard(wrap, g, title, lines, gain, again) {
    wrap.append(h('div', { class: 'center-card' }, h('h2', null, title), ...lines.map(l => h('p', null, l)), gain > 0 ? h('div', { class: 'xpgain' }, `+${gain} XP`) : null,
      h('div', { class: 'cta' }, h('button', { class: 'btn primary', onclick: again }, t('again')), h('button', { class: 'btn ghost', onclick: () => go('map') }, t('back')))));
  }

  // "What does it print?"
  const predictCache = new Map();
  function actualOutput(code) {
    if (!predictCache.has(code)) { const r = MJ.run(wrapSnippet(code), {}); predictCache.set(code, r.ok ? r.stdout.replace(/\n$/, '') : (r.text || '').split('\n')[0]); }
    return predictCache.get(code);
  }
  function gamePredict(wrap, g) {
    const scoreB = h('b', { class: 'num' }, '0'), streakB = h('b', { class: 'num' }, '0');
    gameHead(wrap, g, [h('span', null, t('points'), ': ', scoreB), h('span', null, t('streak'), ': ', streakB)]);
    const body = h('div'); wrap.append(body);
    let qs, qi, score, streak, correct, timer, left;
    const startScreen = () => {
      body.innerHTML = '';
      const best = (S.games.predict || {}).best;
      body.append(h('div', { class: 'center-card' }, h('h2', null, tr(g.title)), h('p', null, tr(g.blurb)),
        h('p', null, S.lang === 'en' ? 'Fast answers score more. Three in a row doubles your points.' : 'Răspunsurile rapide aduc mai multe puncte. Trei la rând îți dublează punctele.'),
        best ? h('p', { class: 'mono' }, `${t('best')}: ${best} ${t('points')}`) : null,
        h('button', { class: 'btn primary', id: 'predict-start', onclick: begin }, t('start'))));
    };
    const begin = () => { qs = shuffle(G.PREDICT).slice(0, 10); qi = 0; score = 0; streak = 0; correct = 0; scoreB.textContent = '0'; streakB.textContent = '0'; ask(); };
    const ask = () => {
      clearInterval(timer);
      body.innerHTML = '';
      const q = qs[qi]; const right = actualOutput(q.code);
      const opts = shuffle([right, ...q.wrong.slice(0, 3)]);
      left = 20;
      const bar = h('i', { style: 'width:100%' });
      const optBtns = opts.map((o, i) => h('button', { class: 'opt', 'data-i': i, onclick: () => answer(i) }, h('kbd', null, i + 1), h('span', null, o)));
      const after = h('div');
      body.append(h('div', { class: 'mono', style: 'color:var(--muted);font-size:13px;display:flex;justify-content:space-between' }, h('span', null, `${t('q_of')} ${qi + 1}/${qs.length} · ${t('ch')} ${q.ch}`), h('span', { class: 'num', id: 'tleft' }, '20s')),
        h('div', { class: 'timer' }, bar), codeBlock(q.code), h('div', { class: 'options' }, optBtns), after);
      let done = false;
      const answer = (i) => {
        if (done) return; done = true; clearInterval(timer);
        const ok = i >= 0 && opts[i] === right;
        optBtns.forEach((b, k) => { b.disabled = true; if (opts[k] === right) b.classList.add('right'); else if (k === i) b.classList.add('wrong'); });
        if (ok) { streak++; correct++; const pts = (10 + Math.ceil(left / 4)) * (streak >= 3 ? 2 : 1); score += pts; } else streak = 0;
        scoreB.textContent = score; streakB.textContent = streak;
        after.append(h('div', { class: 'explain' }, h('b', { style: `color:var(--${ok ? 'ok' : 'bad'})` }, i < 0 ? t('timeup') : ok ? t('right') : t('wrong')), ' ', h('span', { html: tr(q.why) })),
          h('div', { class: 'cta' }, h('button', { class: 'btn primary', id: 'predict-next', onclick: () => { qi++; if (qi < qs.length) ask(); else finish(); } }, t('next'), ' →')));
        setTimeout(() => $('#predict-next') && $('#predict-next').focus(), 20);
      };
      timer = setInterval(() => { left -= 0.1; bar.style.width = Math.max(0, left / 20 * 100) + '%'; bar.style.backgroundPosition = `${100 - left * 5}% 0`; const tl = $('#tleft'); if (tl) tl.textContent = Math.ceil(Math.max(0, left)) + 's'; if (left <= 0) answer(-1); }, 100);
      keyHandler = (e) => { if (!done && /^[1-4]$/.test(e.key)) answer(+e.key - 1); };
    };
    let keyHandler = null;
    const onKey = (e) => keyHandler && keyHandler(e);
    document.addEventListener('keydown', onKey);
    const finish = () => {
      body.innerHTML = '';
      const gain = recordGame('predict', score, Math.round(score / 5));
      endCard(body, g, `${score} ${t('points')}`, [`${correct}/${qs.length} ${t('accuracy')}`], gain, begin);
    };
    cleanup = () => { clearInterval(timer); document.removeEventListener('keydown', onKey); };
    startScreen();
  }

  // Bug hunt
  function gameBug(wrap, g) {
    const scoreB = h('b', { class: 'num' }, '0');
    gameHead(wrap, g, [h('span', null, t('points'), ': ', scoreB)]);
    const body = h('div'); wrap.append(body);
    let rounds, ri, score;
    const begin = () => { rounds = shuffle(G.BUGS).slice(0, 8); ri = 0; score = 0; scoreB.textContent = '0'; play(); };
    const play = () => {
      body.innerHTML = '';
      const b = rounds[ri]; let tries = 0, done = false;
      const triesEl = h('span', { class: 'num' }, `2 ${t('tries')}`);
      const after = h('div');
      const block = codeBlock(b.code, {
        clickable: true, onLine: (line, row) => {
          if (done) return;
          if (line === b.line) { row.classList.add('hit'); score += tries === 0 ? 10 : 5; finishRound(true); }
          else {
            row.classList.remove('miss'); void row.offsetWidth; row.classList.add('miss'); tries++;
            triesEl.textContent = `${2 - tries} ${t('tries')}`;
            if (tries >= 2) { block.querySelector(`[data-line="${b.line}"]`).classList.add('hit'); finishRound(false); }
          }
        }
      });
      const finishRound = (ok) => {
        done = true; scoreB.textContent = score;
        const runOut = h('pre', { class: 'javac', style: 'color:var(--muted)' });
        after.append(h('div', { class: 'explain' },
          h('b', { style: `color:var(--${ok ? 'ok' : 'bad'})` }, ok ? t('right') : t('wrong')), ' ', h('span', { html: tr(b.why) }),
          h('pre', { class: 'javac' }, b.kind === 'compile' ? b.msg.replace(/^Main\.java:(\d+): /, 'Main.java:$1: ') : b.msg)),
          h('div', { class: 'cta' },
            h('button', { class: 'btn small', onclick: () => { const r = MJ.run(b.code, {}); runOut.textContent = r.ok ? r.stdout : MJ.formatError(r, b.code); } }, icon('play'), t('run_it')),
            h('button', { class: 'btn primary', id: 'bug-next', onclick: () => { ri++; if (ri < rounds.length) play(); else finish(); } }, t('next'), ' →')),
          runOut);
      };
      body.append(h('div', { class: 'mono', style: 'color:var(--muted);font-size:13px;display:flex;gap:14px;flex-wrap:wrap;margin-bottom:10px' },
        h('span', null, `${t('round')} ${ri + 1}/${rounds.length} · ${t('ch')} ${b.ch}`), h('span', { style: `color:var(--${b.kind === 'compile' ? 'warn' : 'bad'})` }, b.kind === 'compile' ? t('bug_compile') : t('bug_runtime')), triesEl),
        h('p', { style: 'margin:0 0 10px' }, t('bug_prompt')), block, after);
    };
    const finish = () => {
      body.innerHTML = '';
      const gain = recordGame('bughunt', score, Math.round(score * 0.75));
      endCard(body, g, `${score} / ${rounds.length * 10} ${t('points')}`, [], gain, begin);
    };
    body.append(h('div', { class: 'center-card' }, h('h2', null, tr(g.title)), h('p', null, tr(g.blurb)),
      h('p', null, S.lang === 'en' ? '8 rounds. 10 points on the first try, 5 on the second.' : '8 runde. 10 puncte din prima încercare, 5 din a doua.'),
      h('button', { class: 'btn primary', id: 'bug-start', onclick: begin }, t('start'))));
  }

  // Pipeline
  function gamePipeline(wrap, g) {
    const scoreB = h('b', { class: 'num' }, '0');
    gameHead(wrap, g, [h('span', null, t('points'), ': ', scoreB)]);
    const body = h('div'); wrap.append(body);
    let ri = 0, total = 0;
    const begin = () => { ri = 0; total = 0; scoreB.textContent = '0'; round(); };
    const round = () => {
      body.innerHTML = '';
      const R = G.PIPELINE[ri]; let mistakes = 0;
      const mist = h('span', { class: 'num' }, `0 ${t('mistakes')}`);
      const done = () => {
        const pts = Math.max(3, 15 - 3 * mistakes); total += pts; scoreB.textContent = total;
        body.append(h('div', { class: 'cta', style: 'margin-top:14px' }, h('span', { class: 'xpgain' }, `+${pts}`), h('button', { class: 'btn primary', id: 'pipe-next', onclick: () => { ri++; if (ri < G.PIPELINE.length) round(); else finish(); } }, t('next'), ' →')));
      };
      body.append(h('div', { class: 'mono', style: 'color:var(--muted);font-size:13px;display:flex;gap:14px' }, h('span', null, `${t('round')} ${ri + 1}/${G.PIPELINE.length}`), mist),
        h('h2', { style: 'font-size:20px;margin:10px 0 4px' }, tr(R.title)), h('p', { style: 'color:var(--muted);margin:0 0 10px' }, tr(R.prompt)));
      if (R.kind === 'order') {
        const lane = h('ol', { class: 'lane' });
        let next = 0;
        const pool = h('div', { class: 'chips-pool' }, shuffle(R.items.map((it, i) => [it, i])).map(([it, i]) => {
          const b = h('button', { class: 'chipbtn', onclick: () => {
            if (b.classList.contains('done')) return;
            if (i === next) { b.classList.add('done'); b.disabled = true; lane.append(h('li', null, h('span', null, tr(it)))); next++; if (next === R.items.length) done(); }
            else { mistakes++; mist.textContent = `${mistakes} ${t('mistakes')}`; b.classList.remove('miss'); void b.offsetWidth; b.classList.add('miss'); }
          } }, tr(it));
          return b;
        }));
        body.append(pool, lane);
      } else {
        let selTool = null, matched = 0;
        const tools = shuffle(R.pairs.map((p, i) => [p[0], i])).map(([name, i]) => { const b = h('button', { class: 'chipbtn', onclick: () => { if (b.classList.contains('done')) return; tools.forEach(x => x.classList.remove('sel')); b.classList.add('sel'); selTool = [i, b]; } }, name); return b; });
        const descs = shuffle(R.pairs.map((p, i) => [p[1], i])).map(([d, i]) => { const b = h('button', { class: 'chipbtn', onclick: () => {
          if (!selTool || b.classList.contains('done')) return;
          if (selTool[0] === i) { b.classList.add('done'); selTool[1].classList.remove('sel'); selTool[1].classList.add('done'); b.disabled = true; selTool[1].disabled = true; selTool = null; matched++; if (matched === R.pairs.length) done(); }
          else { mistakes++; mist.textContent = `${mistakes} ${t('mistakes')}`; b.classList.remove('miss'); void b.offsetWidth; b.classList.add('miss'); }
        } }, tr(d)); return b; });
        body.append(h('div', { class: 'match' }, h('div', { class: 'colm' }, tools), h('div', { class: 'colm' }, descs)));
      }
    };
    const finish = () => { body.innerHTML = ''; const gain = recordGame('pipeline', total, total); endCard(body, g, `${total} / 45 ${t('points')}`, [], gain, begin); };
    begin();
  }

  // Race condition
  function gameRace(wrap, g) {
    const lvlB = h('b', { class: 'num' }, '1');
    gameHead(wrap, g, [h('span', null, t('level'), ': ', lvlB)]);
    const body = h('div'); wrap.append(body);
    let li = 0, earned = 0;
    const lines = ['tmp = count;      // READ', 'tmp = tmp + 1;    // ADD', 'count = tmp;      // WRITE'];
    const level = () => {
      body.innerHTML = '';
      const R = G.RACE[li]; lvlB.textContent = `${li + 1}/${G.RACE.length}`;
      const th = [{ pc: 0, tmp: '?' }, { pc: 0, tmp: '?' }];
      let count = 0, lock = null; const log = [];
      const total = R.incs * 3;
      const memEl = h('b', { class: 'num' }, '0'), lockEl = h('div', { class: 'lock' });
      const logEl = h('pre', { class: 'racelog', 'aria-live': 'polite' });
      const res = h('div');
      const threadEls = [0, 1].map(k => {
        const pre = h('pre'); const tmpEl = h('div', { class: 'tmp' }); const state = h('div', { class: 'blocked' });
        const btn = h('button', { class: 'btn', id: 'race-' + (k ? 'b' : 'a'), onclick: () => step(k) }, icon('play'), k ? t('step_b') : t('step_a'));
        return { box: h('div', { class: 'thread' }, h('h3', null, h('span', null, `Thread ${k ? 'B' : 'A'}`), h('span', { style: 'color:var(--dim)' }, `count++ × ${R.incs}`)), pre, tmpEl, state, btn), pre, tmpEl, state, btn };
      });
      const blocked = (k) => R.sync && th[k].pc % 3 === 0 && lock !== null && lock !== k;
      const render = () => {
        threadEls.forEach((el, k) => {
          const T0 = th[k]; el.pre.innerHTML = '';
          for (let i = 0; i < R.incs; i++) {
            if (R.sync) el.pre.append(h('span', null, 'synchronized (lock) {'));
            lines.forEach((ln, j) => { const pc = i * 3 + j; el.pre.append(h('span', { class: pc < T0.pc ? 'done' : pc === T0.pc ? 'cur' : '' }, (R.sync ? '  ' : '') + ln)); });
            if (R.sync) el.pre.append(h('span', null, '}'));
          }
          el.tmpEl.innerHTML = `tmp = <b>${T0.tmp}</b>`;
          const fin = T0.pc >= total;
          el.state.textContent = fin ? t('finished') : blocked(k) ? t('waiting') : '';
          el.btn.disabled = fin || blocked(k);
        });
        memEl.textContent = count;
        lockEl.textContent = R.sync ? (lock === null ? 'lock: —' : `${t('lock_by')} ${lock ? 'B' : 'A'}`) : '';
        logEl.textContent = log.join('\n');
        logEl.scrollTop = logEl.scrollHeight;
      };
      const step = (k) => {
        const T0 = th[k]; if (T0.pc >= total || blocked(k)) return;
        const j = T0.pc % 3; const name = k ? 'B' : 'A';
        if (j === 0) { if (R.sync) lock = k; T0.tmp = count; log.push(`${name}: tmp = count   → tmp = ${T0.tmp}`); }
        else if (j === 1) { T0.tmp = T0.tmp + 1; log.push(`${name}: tmp = tmp + 1 → tmp = ${T0.tmp}`); }
        else { count = T0.tmp; if (R.sync) lock = null; log.push(`${name}: count = tmp   → count = ${count}`); }
        T0.pc++;
        render();
        if (th[0].pc >= total && th[1].pc >= total) evaluate();
      };
      const evaluate = () => {
        const ok = count === R.goal;
        res.innerHTML = '';
        if (ok) {
          earned += 15;
          const msg = R.sync ? (S.lang === 'en' ? `count = ${count}. With the lock, READ-ADD-WRITE runs as one indivisible block, so no update is lost whatever the order. In practice you can also use AtomicInteger.incrementAndGet().` : `count = ${count}. Cu lacătul, READ-ADD-WRITE rulează ca un singur bloc indivizibil, deci nicio actualizare nu se pierde, oricare ar fi ordinea. În practică poți folosi și AtomicInteger.incrementAndGet().`)
            : (S.lang === 'en' ? `count = ${count} instead of ${R.incs * 2}. Both threads read the same old value, so one write overwrote the other. That is a race condition.` : `count = ${count} în loc de ${R.incs * 2}. Ambele fire au citit aceeași valoare veche, așa că o scriere a suprascris-o pe cealaltă. Asta este o condiție de cursă.`);
          res.append(h('div', { class: 'explain' }, h('b', { style: 'color:var(--ok)' }, t('race_ok')), ' ', msg),
            h('div', { class: 'cta' }, h('button', { class: 'btn primary', id: 'race-next', onclick: () => { li++; if (li < G.RACE.length) level(); else finish(); } }, t('next'), ' →')));
        } else {
          res.append(h('div', { class: 'explain' }, h('b', { style: 'color:var(--warn)' }, `count = ${count}. `), t('race_retry')), h('div', { class: 'cta' }, h('button', { class: 'btn', onclick: level }, t('restart'))));
        }
      };
      body.append(h('h2', { style: 'font-size:20px;margin:4px 0' }, `${t('level')} ${li + 1}: ${tr(R.title)}`),
        h('p', { style: 'color:var(--muted);margin:4px 0 12px', html: tr(R.prompt) }),
        h('p', { class: 'mono', style: 'font-size:13px;margin:0 0 12px' }, `${t('goal')}: count = ${R.goal}`),
        h('div', { class: 'race' }, threadEls[0].box, h('div', { class: 'memory' }, h('small', null, t('shared')), memEl, h('small', null, 'int count'), lockEl), threadEls[1].box),
        logEl, res, h('div', { class: 'cta', style: 'margin-top:10px' }, h('button', { class: 'btn small ghost', onclick: level }, t('restart'))));
      render();
    };
    const finish = () => { body.innerHTML = ''; const gain = recordGame('race', earned, earned); endCard(body, g, `${earned} / 45 XP`, [S.lang === 'en' ? 'Chapter 7: synchronized, locks and atomic variables.' : 'Capitolul 7: synchronized, lacăte și variabile atomice.'], gain, () => { li = 0; earned = 0; level(); }); };
    level();
  }

  // ---------- progress view ----------
  function viewProgress(main) {
    const xp = totalXP(), lv = levelOf(xp), nxt = LEVELS[lv + 1], cur = LEVELS[lv];
    const nickIn = h('input', { id: 'nick', value: S.nick, placeholder: t('nick_ph'), maxlength: '40', oninput: (e) => { S.nick = e.target.value.trim(); save(); renderRail('progress'); } });
    main.append(h('div', { class: 'profile' },
      h('div', { class: 'lvlbig' }, lv + 1),
      h('div', null,
        h('h1', { style: 'font-size:24px' }, t('profile'), ': ', tr(LEVEL_TITLES[lv])),
        h('div', { class: 'bigbar' }, h('i', { style: `width:${nxt ? Math.round(100 * (xp - cur) / (nxt - cur)) : 100}%` })),
        h('div', { class: 'num', style: 'font-size:13px;color:var(--muted);margin-bottom:12px' }, nxt ? `${xp} XP · ${nxt - xp} ${t('to_next')}` : `${xp} XP · ${t('max_lvl')}`),
        h('label', { for: 'nick' }, t('nick')), nickIn)));
    const rows = ORDER_ALL.map(ref => {
      const [k, id] = ref.split(':');
      if (k === 'g') { const g = GAMES[id], st = S.games[id]; return h('tr', null, h('td', null, h('button', { class: 'linky', onclick: () => go('g-' + id) }, tr(g.title))), h('td', null, g.ch), h('td', null, st ? `${st.best} ${t('points')}` : '—'), h('td', null, ''), h('td', { class: 'r' }, st ? st.xp : 0)); }
      const c = CH[id], b = S.best[id];
      return h('tr', null, h('td', null, h('button', { class: 'linky', onclick: () => go('c-' + id) }, tr(c.title))), h('td', null, String(c.ch).padStart(2, '0')),
        h('td', null, badge(b && b.league)), h('td', { class: 'num' }, b ? metricText(c, b) : '—'), h('td', { class: 'r' }, b ? LXP[b.league] : 0));
    });
    main.append(h('div', { class: 'tablewrap' }, h('table', { class: 'prog' },
      h('thead', null, h('tr', null, h('th', null, t('activity')), h('th', null, t('chapter')), h('th', null, t('best_league')), h('th', null, t('metric')), h('th', { style: 'text-align:right' }, 'XP'))),
      h('tbody', null, rows))));
    const out = h('div');
    const summary = () => {
      const lines = [`Java Arena · ${S.nick || 'Student'}`, `${t('level')} ${lv + 1} · ${tr(LEVEL_TITLES[lv])} · ${xp} XP`];
      for (const c of A.challenges) { const b = S.best[c.id]; lines.push(`${tr(c.title)}: ${b ? tr(A.LEAGUE_NAME[b.league]) + (b.metric !== null && b.metric !== undefined ? ` (${metricText(c, b)})` : '') : '—'}`); }
      for (const id in GAMES) { const s = S.games[id]; lines.push(`${tr(GAMES[id].title)}: ${s ? s.best + ' ' + t('points') : '—'}`); }
      return lines.join('\n');
    };
    const confirmRow = h('span', { style: 'display:none;gap:8px;align-items:center;flex-wrap:wrap' }, h('span', { style: 'color:var(--warn)' }, t('reset_all_q')),
      h('button', { class: 'btn small', onclick: () => { S.best = {}; S.games = {}; S.drafts = {}; save(); route(); } }, t('delete')),
      h('button', { class: 'btn small ghost', onclick: () => { confirmRow.style.display = 'none'; delBtn.style.display = ''; } }, t('cancel')));
    const delBtn = h('button', { class: 'btn small ghost', onclick: () => { delBtn.style.display = 'none'; confirmRow.style.display = 'inline-flex'; } }, t('reset_all'));
    main.append(h('div', { class: 'cta', style: 'margin-top:14px' },
      h('button', { class: 'btn', onclick: async () => {
        const text = summary();
        try { await navigator.clipboard.writeText(text); toast(t('copied')); }
        catch (e) { out.innerHTML = ''; out.append(h('p', { style: 'color:var(--muted)' }, t('copy_manual')), h('textarea', { class: 'copybox', readonly: true, 'aria-label': t('copy_sum') }, text)); out.querySelector('textarea').select(); }
      } }, t('copy_sum')), delBtn, confirmRow), out);
  }

  // ---------- boot ----------
  function start(data) {
    if (data && data.drafts) for (const k in data.drafts) if (!S.drafts[k]) S.drafts[k] = data.drafts[k];
    window.addEventListener('hashchange', route);
    route();
  }
  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) { try { hot.snapshot(() => ({ drafts: S.drafts })); } catch (e) { } }
  if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
})();
