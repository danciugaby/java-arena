// ===== Java Arena: challenge definitions (bilingual) =====
const Arena = (() => {
  const M = (typeof MiniJava !== 'undefined') ? MiniJava : require('../dist/minijava.js');

  // ---------- helpers ----------
  function stripComments(src) {
    return src.replace(/"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, m => (m[0] === '/' ? ' ' : m));
  }
  function codeSize(src) { return stripComments(src).replace(/\s+/g, '').length; }
  function codeOnly(src) { return stripComments(src).replace(/"(?:\\.|[^"\\\n])*"/g, '""'); }
  function hasLoop(src) { return /\b(for|while|do)\b/.test(codeOnly(src)); }
  const fmtNum = (x) => M.fmtDouble(x);
  const L = (ro, en) => ({ ro, en });

  class TestFail extends Error { constructor(msg, got, want) { super(msg); this.got = got; this.want = want; } }
  // context handed to each test: a fresh interpreter loaded with the player's code
  function makeCtx(code, extra) {
    const loaded = M.load(code, extra || {});
    if (loaded.error) return { error: loaded.error };
    const I = loaded.interp;
    const wrap = (fn) => {
      const r = I.guard(fn);
      if (!r.ok) { const e = new TestFail(r.kind === 'compile' ? M.formatError(r, code) : (r.text || 'error')); e.javaErr = r; throw e; }
      return r.value;
    };
    const ctx = {
      I, M,
      call: (name, ...args) => wrap(() => I.callByName(name, args)),
      obj: (cls, ...args) => wrap(() => I.newObject(cls, args)),
      inv: (o, name, ...args) => wrap(() => I.call(o, name, args)),
      str: (v) => I.toStr(v),
      list: (a) => M.list(a),
      ints: (a) => M.intArr(a),
      strs: (a) => M.strArr(a),
      dbl: (x) => M.dbl(x),
      main: (stdin) => { I.stdinText = stdin || ''; I.stdinPos = 0; const r = I.runMain(); if (!r.ok) { const e = new TestFail(r.text); e.javaErr = r; e.out = I.stdout(); throw e; } return I.stdout(); },
      expectThrow: (fn, exName) => {
        const r = I.guard(fn);
        if (r.ok) throw new TestFail('expected exception', 'returned ' + I.toStr(r.value), exName);
        if (r.kind !== 'exception') throw new TestFail(r.text);
        if (!I.isInstance(r.ex, exName)) throw new TestFail('wrong exception', r.exName + (r.message ? ': ' + r.message : ''), exName);
        return r.ex;
      },
      cls: (n) => I.classes.get(n),
    };
    return ctx;
  }
  const eq = (got, want) => ({ pass: got === want, got, want });
  const near = (got, want, tol = 1e-6) => ({ pass: typeof got === 'number' && Math.abs(got - want) <= tol, got: typeof got === 'number' ? fmtNum(got) : String(got), want: fmtNum(want) });
  const asNum = (v) => (v && typeof v === 'object' && 'v' in v) ? v.v : v;
  const mapEntries = (I, m) => m && m.entries ? m.entries(I).map(e => I.toStr(e.k) + '=' + I.toStr(e.v)) : null;

  // ---------- robot world ----------
  const DIRS = { '^': [-1, 0], '>': [0, 1], 'v': [1, 0], '<': [0, -1] };
  const ORDER = ['^', '>', 'v', '<'];
  function parseMap(rows) {
    const g = rows.map(r => r.split(''));
    let start = null; const gems = [];
    g.forEach((row, y) => row.forEach((c, x) => {
      if (DIRS[c]) { start = { y, x, d: ORDER.indexOf(c) }; row[x] = '.'; }
      if (c === 'G') gems.push(y + ',' + x);
    }));
    return { g, start, gems };
  }
  class Robot {
    constructor(map, limit) {
      const m = parseMap(map.rows);
      this.g = m.g; this.y = m.start.y; this.x = m.start.x; this.d = m.start.d;
      this.gems = new Set(m.gems); this.total = m.gems.length; this.picked = 0;
      this.actions = 0; this.limit = limit || 400; this.trace = [{ t: 'start', y: this.y, x: this.x, d: this.d }];
      this.crashed = false;
    }
    cell(y, x) { return (this.g[y] && this.g[y][x]) || '#'; }
    look(rel) { const d = ORDER[(this.d + rel + 4) % 4]; const [dy, dx] = DIRS[d]; return this.cell(this.y + dy, this.x + dx) !== '#'; }
    jtype() { return 'Robot'; }
    isA(t) { return t === 'Robot' || t === 'Object'; }
    toJava() { return `Robot[x=${this.x}, y=${this.y}, gems=${this.picked}/${this.total}]`; }
    jm(n, args, I, node) {
      const fail = (msg) => { this.crashed = true; this.trace.push({ t: 'crash', y: this.y, x: this.x, d: this.d }); I.throwJava('IllegalStateException', msg); };
      switch (n) {
        case 'move': {
          this.actions++; if (this.actions > this.limit) { this.trace.push({ t: 'battery' }); I.throwJava('IllegalStateException', 'battery empty: more than ' + this.limit + ' actions'); }
          if (!this.look(0)) fail('robot hit a wall at (' + this.x + ',' + this.y + ')');
          const [dy, dx] = DIRS[ORDER[this.d]]; this.y += dy; this.x += dx;
          this.trace.push({ t: 'move', y: this.y, x: this.x, d: this.d, ln: I.ln }); return undefined;
        }
        case 'turnLeft': case 'turnRight': {
          this.actions++; if (this.actions > this.limit) { this.trace.push({ t: 'battery' }); I.throwJava('IllegalStateException', 'battery empty: more than ' + this.limit + ' actions'); }
          this.d = (this.d + (n === 'turnLeft' ? 3 : 1)) % 4;
          this.trace.push({ t: 'turn', y: this.y, x: this.x, d: this.d, ln: I.ln }); return undefined;
        }
        case 'pickGem': {
          this.actions++; if (this.actions > this.limit) { this.trace.push({ t: 'battery' }); I.throwJava('IllegalStateException', 'battery empty'); }
          const k = this.y + ',' + this.x;
          if (this.gems.has(k)) { this.gems.delete(k); this.picked++; this.trace.push({ t: 'pick', y: this.y, x: this.x, d: this.d, ln: I.ln }); }
          else this.trace.push({ t: 'miss', y: this.y, x: this.x, d: this.d, ln: I.ln });
          return undefined;
        }
        case 'frontIsClear': return this.look(0);
        case 'leftIsClear': return this.look(-1);
        case 'rightIsClear': return this.look(1);
        case 'onGem': return this.gems.has(this.y + ',' + this.x);
        case 'atExit': return this.cell(this.y, this.x) === 'E';
        case 'gemsLeft': return this.gems.size;
        case 'actions': return this.actions;
        case 'toString': return this.toJava();
      }
      I.semErr(`cannot find symbol\n  symbol:   method ${n}()\n  location: class Robot\n  (available: move, turnLeft, turnRight, pickGem, frontIsClear, leftIsClear, rightIsClear, onGem, atExit, gemsLeft)`, node.ln);
    }
  }
  function runRobot(code, map) {
    const robot = new Robot(map);
    const loaded = M.load(code, { globals: { robot }, maxSteps: 400000 });
    if (loaded.error) return { compile: loaded.error, robot };
    const I = loaded.interp;
    const r = I.runMain();
    const atExit = robot.cell(robot.y, robot.x) === 'E';
    const ok = r.ok && atExit && robot.gems.size === 0;
    let why = '';
    if (!r.ok) why = r.text;
    else if (!atExit) why = 'not-exit';
    else if (robot.gems.size) why = 'gems';
    return { ok, robot, res: r, why, out: I.stdout() + I.stderr(), actions: robot.actions };
  }
  const ROBOT_MAPS = [
    { name: L('Coridorul', 'The corridor'), rows: ['#########', '#>..G..E#', '#########'] },
    { name: L('Colțul', 'The corner'), rows: ['#######', '#>.G..#', '#####.#', '#####G#', '#####.#', '#####E#', '#######'] },
    { name: L('Serpentina', 'The serpentine'), rows: ['###########', '#>...#....#', '####.#.##.#', '####.#.##.#', '####...##G#', '#########.#', '#E....G...#', '###########'] },
  ];
  const ROBOT_HIDDEN = [
    { name: L('Spirala', 'The spiral'), rows: ['#########', '#>......#', '#######.#', '#...G.#.#', '#.###.#.#', '#.#E..#.#', '#.#####.#', '#..G....#', '#########'] },
    { name: L('Fântâna', 'The well'), rows: ['#######', '#E#...#', '#.#.#G#', '#.#.#.#', '#.G.#^#', '#######'] },
    { name: L('Fundătura', 'The dead end'), rows: ['########', '#..G..E#', '#.######', '#v######', '########'] },
  ];

  // ---------- leagues ----------
  const LEAGUES = ['wood', 'bronze', 'silver', 'gold', 'legend'];
  const LEAGUE_NAME = { wood: L('Lemn', 'Wood'), bronze: L('Bronz', 'Bronze'), silver: L('Argint', 'Silver'), gold: L('Aur', 'Gold'), legend: L('Legendă', 'Legend') };
  const LEAGUE_XP = { none: 0, wood: 10, bronze: 25, silver: 45, gold: 70, legend: 100 };

  // ---------- challenge list ----------
  const C = [];

  // ===== Ch 2: first program =====
  C.push({
    id: 'hello', ch: 2, kind: 'tests', icon: 'terminal',
    title: L('Salut, Arenă!', 'Hello, Arena!'),
    blurb: L('Citește un nume și salută-l. Cu cât mai scurt, cu atât mai bine.', 'Read a name and greet it. The shorter, the better.'),
    statement: L(
      `<p>Programul primește <b>un nume</b> pe prima linie de la intrarea standard și trebuie să afișeze exact:</p><pre>Hello, NUME!</pre><p>De exemplu, pentru intrarea <code>Ana</code> se afișează <code>Hello, Ana!</code>.</p><p>Poți folosi forma clasică <code>public static void main(String[] args)</code> cu <code>Scanner</code>, sau forma compactă din <b>Java 25</b> (capitolul 2): <code>void main()</code> împreună cu <code>IO.readln()</code> și <code>IO.println()</code>.</p><p class="note">Ligile superioare se câștigă cu cod mai scurt (se numără caracterele fără spații și comentarii).</p>`,
      `<p>The program receives <b>a name</b> on the first line of standard input and must print exactly:</p><pre>Hello, NAME!</pre><p>For the input <code>Ana</code>, print <code>Hello, Ana!</code>.</p><p>You may use the classic <code>public static void main(String[] args)</code> with a <code>Scanner</code>, or the compact <b>Java 25</b> form (chapter 2): <code>void main()</code> with <code>IO.readln()</code> and <code>IO.println()</code>.</p><p class="note">Higher leagues need shorter code (characters are counted without whitespace and comments).</p>`),
    starter: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String name = sc.nextLine();
        // TODO: print "Hello, " + name + "!"
        System.out.println("Hello?");
    }
}
`,
    ref: `void main(){IO.println("Hello, "+IO.readln()+"!");}`,
    tests: [
      { name: L('Ana', 'Ana'), show: 'stdin: Ana', want: 'Hello, Ana!', run: (c) => eq(c.main('Ana\n').trimEnd(), 'Hello, Ana!') },
      { name: L('Nume compus', 'Two-word name'), show: 'stdin: Maria Ioana', want: 'Hello, Maria Ioana!', run: (c) => eq(c.main('Maria Ioana\n').trimEnd(), 'Hello, Maria Ioana!') },
    ],
    validators: [
      { name: L('Diacritice', 'Diacritics'), run: (c) => eq(c.main('Ștefan\n').trimEnd(), 'Hello, Ștefan!') },
      { name: L('Java', 'Java'), run: (c) => eq(c.main('Duke\n').trimEnd(), 'Hello, Duke!') },
    ],
    metric: { kind: 'chars', label: L('caractere', 'characters') },
    bonus: [
      { league: 'silver', label: L('cod ≤ 150 caractere', 'code ≤ 150 characters'), check: (x) => x.size <= 150 },
      { league: 'gold', label: L('cod ≤ 100 caractere', 'code ≤ 100 characters'), check: (x) => x.size <= 100 },
      { league: 'legend', label: L('cod ≤ 55 caractere (indiciu: Java 25)', 'code ≤ 55 characters (hint: Java 25)'), check: (x) => x.size <= 55 },
    ],
    hints: [L('Concatenarea șirurilor: <code>"Hello, " + name + "!"</code>', 'String concatenation: <code>"Hello, " + name + "!"</code>'),
      L('Java 25: un fișier poate conține direct <code>void main() { ... }</code>, fără clasă.', 'Java 25: a file can contain just <code>void main() { ... }</code>, no class needed.')],
  });

  // ===== Ch 3: robot optimization =====
  C.push({
    id: 'robot', ch: 3, kind: 'robot', icon: 'robot', featured: true,
    title: L('Robotul de cristale', 'The Crystal Robot'),
    blurb: L('Ghidează robotul prin labirint cu bucle și condiții. Cât mai puține acțiuni!', 'Guide the robot through the maze with loops and conditions. Use as few actions as possible!'),
    statement: L(
      `<p>Robotul trebuie să <b>adune toate cristalele</b> și să ajungă la <b>ieșire</b> (E). Același program rulează pe toate hărțile, inclusiv pe 3 hărți ascunse la trimitere, deci nu poți scrie pașii „de mână”.</p>
<p>Ai la dispoziție obiectul <code>robot</code>:</p>
<table class="api"><tr><td><code>robot.move()</code></td><td>un pas înainte <span class="cost">1 acțiune</span></td></tr>
<tr><td><code>robot.turnLeft()</code> / <code>robot.turnRight()</code></td><td>rotire 90° <span class="cost">1 acțiune</span></td></tr>
<tr><td><code>robot.pickGem()</code></td><td>culege cristalul de sub robot <span class="cost">1 acțiune</span></td></tr>
<tr><td><code>robot.frontIsClear()</code>, <code>leftIsClear()</code>, <code>rightIsClear()</code></td><td><code>boolean</code>, gratuit</td></tr>
<tr><td><code>robot.onGem()</code>, <code>robot.atExit()</code></td><td><code>boolean</code>, gratuit</td></tr></table>
<p>Hărțile sunt coridoare fără ramificații. Dacă robotul intră în perete, încercarea eșuează. <b>Scorul</b> este numărul total de acțiuni pe toate hărțile: cu cât mai mic, cu atât mai bine.</p>`,
      `<p>The robot must <b>collect every crystal</b> and reach the <b>exit</b> (E). The same program runs on every map, including 3 hidden maps on submit, so you can't hard-code the steps.</p>
<p>You get a ready-made <code>robot</code> object:</p>
<table class="api"><tr><td><code>robot.move()</code></td><td>one step forward <span class="cost">1 action</span></td></tr>
<tr><td><code>robot.turnLeft()</code> / <code>robot.turnRight()</code></td><td>turn 90° <span class="cost">1 action</span></td></tr>
<tr><td><code>robot.pickGem()</code></td><td>pick up the crystal under the robot <span class="cost">1 action</span></td></tr>
<tr><td><code>robot.frontIsClear()</code>, <code>leftIsClear()</code>, <code>rightIsClear()</code></td><td><code>boolean</code>, free</td></tr>
<tr><td><code>robot.onGem()</code>, <code>robot.atExit()</code></td><td><code>boolean</code>, free</td></tr></table>
<p>Maps are corridors without branches. Walking into a wall fails the run. Your <b>score</b> is the total number of actions over all maps: lower is better.</p>`),
    starter: `public class Main {
    public static void main(String[] args) {
        // The robot walks forward while it can...
        while (robot.frontIsClear()) {
            robot.move();
        }
        // TODO: turn at corners, pick crystals with robot.pickGem()
        // and stop when robot.atExit() is true
    }
}
`,
    ref: `void main(){while(!robot.atExit()){if(robot.onGem())robot.pickGem();if(robot.frontIsClear())robot.move();else if(robot.leftIsClear())robot.turnLeft();else robot.turnRight();}}`,
    maps: ROBOT_MAPS, hidden: ROBOT_HIDDEN,
    metric: { kind: 'actions', label: L('acțiuni', 'actions') },
    bonus: [
      { league: 'silver', label: L('total ≤ 150 acțiuni', 'total ≤ 150 actions'), check: (x) => x.metric <= 150 },
      { league: 'gold', label: L('total = 121 acțiuni (optim)', 'total = 121 actions (optimal)'), check: (x) => x.metric <= 121 },
      { league: 'legend', label: L('optim și cod ≤ 180 caractere', 'optimal and code ≤ 180 characters'), check: (x) => x.metric <= 121 && x.size <= 180 },
    ],
    hints: [L('Gândește-te la o buclă <code>while (!robot.atExit())</code>: la fiecare pas decide ce face robotul.', 'Think of a loop <code>while (!robot.atExit())</code>: at each step decide what the robot does.'),
      L('Rotirea de 3 ori la stânga = o rotire la dreapta, dar costă de 3 ori mai mult. Verifică ambele părți.', 'Three left turns equal one right turn, but cost three times as much. Check both sides.')],
  });

  // ===== Ch 3: temperatures =====
  C.push({
    id: 'temps', ch: 3, kind: 'tests', icon: 'thermo',
    title: L('Termometrul', 'The Thermometer'),
    blurb: L('Găsește temperatura cea mai apropiată de zero. Clasicul vectorilor.', 'Find the temperature closest to zero. The array classic.'),
    statement: L(
      `<p>Scrie metoda</p><pre>static int closestToZero(int[] temps)</pre><p>care întoarce temperatura cea mai apropiată de 0.</p><ul><li>La egalitate între o valoare negativă și una pozitivă (de ex. <code>-5</code> și <code>5</code>), întoarce valoarea <b>pozitivă</b>.</li><li>Dacă vectorul este gol, întoarce <code>0</code>.</li></ul>`,
      `<p>Write the method</p><pre>static int closestToZero(int[] temps)</pre><p>that returns the temperature closest to 0.</p><ul><li>If a negative and a positive value are equally close (e.g. <code>-5</code> and <code>5</code>), return the <b>positive</b> one.</li><li>If the array is empty, return <code>0</code>.</li></ul>`),
    starter: `public class Main {
    static int closestToZero(int[] temps) {
        // TODO
        return temps[0];
    }

    public static void main(String[] args) {
        System.out.println(closestToZero(new int[]{1, -2, -8, 4, 5}));
    }
}
`,
    ref: `static int closestToZero(int[] t){int b=t.length>0?t[0]:0;for(int x:t)if(Math.abs(x)<Math.abs(b)||x==-b&&x>0)b=x;return b;}`,
    tests: [
      { name: L('Simplu', 'Simple'), show: 'closestToZero({1, -2, -8, 4, 5})', want: '1', run: (c) => eq(c.call('closestToZero', c.ints([1, -2, -8, 4, 5])), 1) },
      { name: L('Doar negative', 'Only negatives'), show: 'closestToZero({-12, -5, -137})', want: '-5', run: (c) => eq(c.call('closestToZero', c.ints([-12, -5, -137])), -5) },
      { name: L('Egalitate', 'A tie'), show: 'closestToZero({42, -5, 12, 21, 5, 24})', want: '5', run: (c) => eq(c.call('closestToZero', c.ints([42, -5, 12, 21, 5, 24])), 5) },
      { name: L('Vector gol', 'Empty array'), show: 'closestToZero({})', want: '0', run: (c) => eq(c.call('closestToZero', c.ints([])), 0) },
    ],
    validators: [
      { name: L('Un singur element', 'Single value'), run: (c) => eq(c.call('closestToZero', c.ints([-273])), -273) },
      { name: L('Egalitate inversă', 'Reversed tie'), run: (c) => eq(c.call('closestToZero', c.ints([7, -7])), 7) },
      { name: L('Egalitate negativă', 'Negative tie'), run: (c) => eq(c.call('closestToZero', c.ints([-7, 7])), 7) },
      { name: L('Conține zero', 'Contains zero'), run: (c) => eq(c.call('closestToZero', c.ints([5, 0, -5])), 0) },
      { name: L('Multe valori', 'Many values'), run: (c) => eq(c.call('closestToZero', c.ints([-5, -4, -2, 12, -40, 4, 2, 18, 11, 5])), 2) },
    ],
    metric: { kind: 'chars', label: L('caractere', 'characters') },
    bonus: [
      { league: 'silver', label: L('cod ≤ 260 caractere', 'code ≤ 260 characters'), check: (x) => x.size <= 260 },
      { league: 'gold', label: L('cod ≤ 170 caractere', 'code ≤ 170 characters'), check: (x) => x.size <= 170 },
      { league: 'legend', label: L('cod ≤ 125 caractere', 'code ≤ 125 characters'), check: (x) => x.size <= 125 },
    ],
    hints: [L('Folosește <code>Math.abs(x)</code> și păstrează „cel mai bun” candidat într-o variabilă.', 'Use <code>Math.abs(x)</code> and keep the best candidate in a variable.'),
      L('Pentru egalitate: <code>x == -best && x > 0</code>.', 'For a tie: <code>x == -best && x > 0</code>.')],
  });

  // ===== Ch 4: bank account =====
  C.push({
    id: 'bank', ch: 4, kind: 'tests', icon: 'bank', visual: 'bank',
    title: L('Contul bancar', 'The Bank Account'),
    blurb: L('Clase, constructori, încapsulare și un câmp static.', 'Classes, constructors, encapsulation and a static field.'),
    statement: L(
      `<p>Scrie clasa <code>BankAccount</code>:</p><pre>BankAccount(String owner, double initialBalance)
String getOwner()
double getBalance()
boolean deposit(double amount)     // false dacă amount &lt;= 0
boolean withdraw(double amount)    // false dacă amount &lt;= 0 sau fonduri insuficiente
boolean transferTo(BankAccount other, double amount)
static int getAccountCount()       // câte conturi s-au creat
String toString()                  // ex: "Ana: 150.0 lei"</pre><p>O operație eșuată nu schimbă soldul. Ligile superioare verifică <b>încapsularea</b>: câmpurile trebuie protejate.</p>`,
      `<p>Write the class <code>BankAccount</code>:</p><pre>BankAccount(String owner, double initialBalance)
String getOwner()
double getBalance()
boolean deposit(double amount)     // false if amount &lt;= 0
boolean withdraw(double amount)    // false if amount &lt;= 0 or not enough money
boolean transferTo(BankAccount other, double amount)
static int getAccountCount()       // how many accounts were created
String toString()                  // e.g. "Ana: 150.0 lei"</pre><p>A failed operation leaves the balance unchanged. Higher leagues check <b>encapsulation</b>: fields must be protected.</p>`),
    starter: `class BankAccount {
    String owner;
    double balance;

    BankAccount(String owner, double initialBalance) {
        this.owner = owner;
        this.balance = initialBalance;
    }

    double getBalance() { return balance; }

    // TODO: getOwner, deposit, withdraw, transferTo, getAccountCount, toString
}

public class Main {
    public static void main(String[] args) {
        BankAccount a = new BankAccount("Ana", 100);
        System.out.println(a.getBalance());
    }
}
`,
    ref: `class BankAccount{private final String owner;private double balance;private static int count;
BankAccount(String o,double b){owner=o;balance=b;count++;}
String getOwner(){return owner;}double getBalance(){return balance;}
boolean deposit(double a){if(a<=0)return false;balance+=a;return true;}
boolean withdraw(double a){if(a<=0||a>balance)return false;balance-=a;return true;}
boolean transferTo(BankAccount o,double a){if(!withdraw(a))return false;o.deposit(a);return true;}
static int getAccountCount(){return count;}
public String toString(){return owner+": "+balance+" lei";}}`,
    tests: [
      { name: L('Depunere', 'Deposit'), show: 'new BankAccount("Ana", 100).deposit(50) → getBalance()', want: 'true, 150.0', run: (c) => { const a = c.obj('BankAccount', 'Ana', c.dbl(100)); const ok = c.inv(a, 'deposit', c.dbl(50)); const b = asNum(c.inv(a, 'getBalance')); c.log = [['Ana', 100], ['deposit 50 → ' + ok, b]]; return { pass: ok === true && b === 150, got: `${ok}, ${fmtNum(b)}`, want: 'true, 150.0' }; } },
      { name: L('Retragere prea mare', 'Withdraw too much'), show: 'balance 100, withdraw(250)', want: 'false, 100.0', run: (c) => { const a = c.obj('BankAccount', 'Dan', c.dbl(100)); const ok = c.inv(a, 'withdraw', c.dbl(250)); const b = asNum(c.inv(a, 'getBalance')); c.log = [['Dan', 100], ['withdraw 250 → ' + ok, b]]; return { pass: ok === false && b === 100, got: `${ok}, ${fmtNum(b)}`, want: 'false, 100.0' }; } },
      { name: L('Transfer', 'Transfer'), show: 'a(100).transferTo(b(20), 30)', want: 'true, 70.0, 50.0', run: (c) => { const a = c.obj('BankAccount', 'Ana', c.dbl(100)), b = c.obj('BankAccount', 'Ion', c.dbl(20)); const ok = c.inv(a, 'transferTo', b, c.dbl(30)); const x = asNum(c.inv(a, 'getBalance')), y = asNum(c.inv(b, 'getBalance')); c.log = [['Ana → Ion 30', `${fmtNum(x)} / ${fmtNum(y)}`]]; return { pass: ok === true && x === 70 && y === 50, got: `${ok}, ${fmtNum(x)}, ${fmtNum(y)}`, want: 'true, 70.0, 50.0' }; } },
      { name: L('toString', 'toString'), show: 'new BankAccount("Ana", 150).toString()', want: 'Ana: 150.0 lei', run: (c) => eq(c.str(c.obj('BankAccount', 'Ana', c.dbl(150))), 'Ana: 150.0 lei') },
    ],
    validators: [
      { name: L('Depunere negativă', 'Negative deposit'), run: (c) => { const a = c.obj('BankAccount', 'X', c.dbl(10)); const ok = c.inv(a, 'deposit', c.dbl(-5)); const b = asNum(c.inv(a, 'getBalance')); return { pass: ok === false && b === 10, got: `${ok}, ${fmtNum(b)}`, want: 'false, 10.0' }; } },
      { name: L('Transfer eșuat', 'Failed transfer'), run: (c) => { const a = c.obj('BankAccount', 'A', c.dbl(10)), b = c.obj('BankAccount', 'B', c.dbl(0)); const ok = c.inv(a, 'transferTo', b, c.dbl(30)); const x = asNum(c.inv(a, 'getBalance')), y = asNum(c.inv(b, 'getBalance')); return { pass: ok === false && x === 10 && y === 0, got: `${ok}, ${fmtNum(x)}, ${fmtNum(y)}`, want: 'false, 10.0, 0.0' }; } },
      { name: L('Contor static', 'Static counter'), run: (c) => { c.obj('BankAccount', 'A', c.dbl(1)); c.obj('BankAccount', 'B', c.dbl(2)); c.obj('BankAccount', 'C', c.dbl(3)); return eq(c.call('getAccountCount'), 3); } },
      { name: L('getOwner', 'getOwner'), run: (c) => eq(c.inv(c.obj('BankAccount', 'Maria', c.dbl(5)), 'getOwner'), 'Maria') },
    ],
    bonus: [
      { league: 'silver', label: L('câmpurile owner și balance sunt private', 'fields owner and balance are private'), check: (x) => { const k = x.cls('BankAccount'); return !!(k && k.fieldInfo.owner && k.fieldInfo.balance && k.fieldInfo.owner.isPrivate && k.fieldInfo.balance.isPrivate); } },
      { league: 'gold', label: L('transferTo refolosește withdraw/deposit (nu modifică direct alt sold)', 'transferTo reuses withdraw/deposit (no direct change of another balance)'), check: (x) => !/\b\w+\s*\.\s*balance\s*[+\-]?=/.test(codeOnly(x.code).replace(/this\s*\.\s*balance/g, '')) },
      { league: 'legend', label: L('owner este private final', 'owner is private final'), check: (x) => { const k = x.cls('BankAccount'); return !!(k && k.fieldInfo.owner && k.fieldInfo.owner.isFinal && k.fieldInfo.owner.isPrivate); } },
    ],
    hints: [L('Un câmp <code>private static int count</code> crește în constructor.', 'A <code>private static int count</code> field grows in the constructor.'),
      L('Pentru <code>toString</code>, adaugă <code>public String toString()</code>; un <code>double</code> se afișează ca <code>150.0</code>.', 'For <code>toString</code> add <code>public String toString()</code>; a <code>double</code> prints as <code>150.0</code>.')],
  });

  // ===== Ch 5: shapes (inheritance & polymorphism) =====
  const SHAPES_DEMO = [['Circle', [1]], ['Rectangle', [2, 3]], ['Square', [4]], ['Circle', [0.5]]];
  C.push({
    id: 'shapes', ch: 5, kind: 'tests', icon: 'shapes', visual: 'shapes',
    title: L('Fabrica de forme', 'The Shape Factory'),
    blurb: L('Clase abstracte, moștenire și polimorfism în acțiune.', 'Abstract classes, inheritance and polymorphism in action.'),
    statement: L(
      `<p>Construiește ierarhia:</p><pre>abstract class Shape        // double area(), double perimeter()
class Circle extends Shape  // Circle(double r)
class Rectangle extends Shape // Rectangle(double w, double h)
class Square ...            // Square(double side)</pre><p>și metodele statice</p><pre>static double totalArea(Shape[] shapes)
static Shape largest(Shape[] shapes)   // forma cu aria cea mai mare (prima, la egalitate)</pre><p>Formele desenate în vizualizator primesc aria calculată de codul tău. Ligile superioare cer ca <code>Shape</code> să fie abstractă și ca <code>Square</code> să fie un caz particular de <code>Rectangle</code>, fără cod duplicat.</p>`,
      `<p>Build the hierarchy:</p><pre>abstract class Shape        // double area(), double perimeter()
class Circle extends Shape  // Circle(double r)
class Rectangle extends Shape // Rectangle(double w, double h)
class Square ...            // Square(double side)</pre><p>and the static methods</p><pre>static double totalArea(Shape[] shapes)
static Shape largest(Shape[] shapes)   // the shape with the largest area (first one on ties)</pre><p>The viewer draws each shape with the area your code computes. Higher leagues require an abstract <code>Shape</code> and a <code>Square</code> that is a special <code>Rectangle</code>, with no duplicated code.</p>`),
    starter: `abstract class Shape {
    abstract double area();
    abstract double perimeter();
}

class Circle extends Shape {
    private final double r;
    Circle(double r) { this.r = r; }
    double area() { return 0; }        // TODO
    double perimeter() { return 0; }   // TODO
}

// TODO: Rectangle, Square

public class Main {
    static double totalArea(Shape[] shapes) {
        return 0; // TODO
    }

    static Shape largest(Shape[] shapes) {
        return null; // TODO
    }

    public static void main(String[] args) {
        Shape c = new Circle(1);
        System.out.println(c.area());
    }
}
`,
    ref: `abstract class Shape{abstract double area();abstract double perimeter();}
class Circle extends Shape{private final double r;Circle(double r){this.r=r;}double area(){return Math.PI*r*r;}double perimeter(){return 2*Math.PI*r;}}
class Rectangle extends Shape{private final double w,h;Rectangle(double w,double h){this.w=w;this.h=h;}double area(){return w*h;}double perimeter(){return 2*(w+h);}}
class Square extends Rectangle{Square(double s){super(s,s);}}
public class Main{static double totalArea(Shape[] s){double t=0;for(Shape x:s)t+=x.area();return t;}
static Shape largest(Shape[] s){Shape b=null;for(Shape x:s)if(b==null||x.area()>b.area())b=x;return b;}}`,
    tests: [
      { name: L('Cercul', 'The circle'), show: 'new Circle(1): area, perimeter', want: '3.141592653589793, 6.283185307179586', run: (c) => { const o = c.obj('Circle', c.dbl(1)); const a = asNum(c.inv(o, 'area')), p = asNum(c.inv(o, 'perimeter')); c.draw = [{ k: 'Circle', p: [1], area: a, ok: Math.abs(a - Math.PI) < 1e-6 }]; return { pass: Math.abs(a - Math.PI) < 1e-6 && Math.abs(p - 2 * Math.PI) < 1e-6, got: `${fmtNum(a)}, ${fmtNum(p)}`, want: `${fmtNum(Math.PI)}, ${fmtNum(2 * Math.PI)}` }; } },
      { name: L('Dreptunghiul', 'The rectangle'), show: 'new Rectangle(2, 3): area, perimeter', want: '6.0, 10.0', run: (c) => { const o = c.obj('Rectangle', c.dbl(2), c.dbl(3)); const a = asNum(c.inv(o, 'area')), p = asNum(c.inv(o, 'perimeter')); c.draw = [{ k: 'Rectangle', p: [2, 3], area: a, ok: a === 6 }]; return { pass: a === 6 && p === 10, got: `${fmtNum(a)}, ${fmtNum(p)}`, want: '6.0, 10.0' }; } },
      { name: L('Pătratul', 'The square'), show: 'new Square(4): area, perimeter', want: '16.0, 16.0', run: (c) => { const o = c.obj('Square', c.dbl(4)); const a = asNum(c.inv(o, 'area')), p = asNum(c.inv(o, 'perimeter')); c.draw = [{ k: 'Square', p: [4], area: a, ok: a === 16 }]; return { pass: a === 16 && p === 16, got: `${fmtNum(a)}, ${fmtNum(p)}`, want: '16.0, 16.0' }; } },
      { name: L('Aria totală', 'Total area'), show: 'totalArea({Circle(1), Rectangle(2,3), Square(4), Circle(0.5)})', want: '25.926990816987242', run: (c) => {
        const objs = SHAPES_DEMO.map(([k, p]) => c.obj(k, ...p.map(c.dbl)));
        const arr = new M.JArray({ n: 'Shape', args: [], dims: 0 }, objs);
        const t = asNum(c.call('totalArea', arr));
        const want = Math.PI + 6 + 16 + Math.PI * 0.25;
        c.draw = SHAPES_DEMO.map(([k, p], i) => { const a = asNum(c.inv(objs[i], 'area')); return { k, p, area: a, ok: true }; });
        return near(t, want);
      } },
    ],
    validators: [
      { name: L('Cea mai mare formă', 'Largest shape'), run: (c) => { const objs = SHAPES_DEMO.map(([k, p]) => c.obj(k, ...p.map(c.dbl))); const arr = new M.JArray({ n: 'Shape', args: [], dims: 0 }, objs); const r = c.call('largest', arr); return { pass: r === objs[2], got: c.str(r), want: 'Square(4)' }; } },
      { name: L('Egalitate la arie', 'Tie on area'), run: (c) => { const a = c.obj('Rectangle', c.dbl(2), c.dbl(8)), b = c.obj('Square', c.dbl(4)); const r = c.call('largest', new M.JArray({ n: 'Shape', args: [], dims: 0 }, [a, b])); return { pass: r === a, got: r === b ? 'Square(4)' : c.str(r), want: 'Rectangle(2, 8)' }; } },
      { name: L('Vector gol', 'Empty array'), run: (c) => near(asNum(c.call('totalArea', new M.JArray({ n: 'Shape', args: [], dims: 0 }, []))), 0) },
      { name: L('Polimorfism', 'Polymorphism'), run: (c) => { const o = c.obj('Square', c.dbl(3)); return { pass: c.I.isInstance(o, 'Shape'), got: c.I.isInstance(o, 'Shape') ? 'Square is a Shape' : 'Square is not a Shape', want: 'Square is a Shape' }; } },
    ],
    bonus: [
      { league: 'silver', label: L('Shape este abstractă', 'Shape is abstract'), check: (x) => { const k = x.cls('Shape'); return !!(k && (k.isAbstract || k.kind === 'interface')); } },
      { league: 'gold', label: L('Square extinde Rectangle', 'Square extends Rectangle'), check: (x) => { const k = x.cls('Square'); return !!(k && k.superclass && k.superclass.name === 'Rectangle'); } },
      { league: 'legend', label: L('Square nu rescrie area() / perimeter()', 'Square does not override area() / perimeter()'), check: (x) => { const k = x.cls('Square'); return !!(k && !k.methods.has('area') && !k.methods.has('perimeter')); } },
    ],
    hints: [L('Aria cercului: <code>Math.PI * r * r</code>; perimetrul: <code>2 * Math.PI * r</code>.', 'Circle area: <code>Math.PI * r * r</code>; perimeter: <code>2 * Math.PI * r</code>.'),
      L('Un pătrat este un dreptunghi cu laturi egale: <code>super(side, side)</code>.', 'A square is a rectangle with equal sides: <code>super(side, side)</code>.')],
  });

  // ===== Ch 6: catalog (collections) =====
  const STUDENTS = [['Ana', '4LF341', 9.5], ['Dan', '4LF342', 7.0], ['Ion', '4LF341', 8.0], ['Eva', '4LF343', 10.0], ['Bogdan', '4LF342', 6.5], ['Carmen', '4LF341', 9.5]];
  const mkStudents = (c, rows) => c.list(rows.map(([n, g, x]) => c.obj('Student', n, g, c.dbl(x))));
  C.push({
    id: 'catalog', ch: 6, kind: 'tests', icon: 'table', visual: 'catalog',
    title: L('Catalogul grupei', 'The Class Register'),
    blurb: L('List, Map și sortare pe datele din laborator.', 'List, Map and sorting on the lab data.'),
    statement: L(
      `<p>Clasa <code>Student</code> (nume, grupă, notă) este gata. Scrie metodele statice:</p><pre>Map&lt;String, Integer&gt; countByGroup(List&lt;Student&gt; s)  // câți studenți are fiecare grupă
List&lt;String&gt; namesAlphabetical(List&lt;Student&gt; s)       // numele, sortate alfabetic
double averageOf(List&lt;Student&gt; s, String group)        // media grupei, 0.0 dacă nu există
String topStudent(List&lt;Student&gt; s)                      // nota maximă; primul la egalitate; "" dacă lista e goală</pre><p class="note">Nu modifica lista primită. Liga Legendă se câștigă fără nicio buclă <code>for</code>/<code>while</code>, doar cu stream-uri (capitolul 9).</p>`,
      `<p>The <code>Student</code> class (name, group, grade) is ready. Write the static methods:</p><pre>Map&lt;String, Integer&gt; countByGroup(List&lt;Student&gt; s)  // how many students in each group
List&lt;String&gt; namesAlphabetical(List&lt;Student&gt; s)       // the names, sorted alphabetically
double averageOf(List&lt;Student&gt; s, String group)        // the group's average, 0.0 if none
String topStudent(List&lt;Student&gt; s)                      // highest grade; first one on ties; "" if the list is empty</pre><p class="note">Don't modify the list you receive. The Legend league needs no <code>for</code>/<code>while</code> loop at all, only streams (chapter 9).</p>`),
    starter: `import java.util.*;

class Student {
    private final String name;
    private final String group;
    private final double grade;

    Student(String name, String group, double grade) {
        this.name = name; this.group = group; this.grade = grade;
    }
    String getName() { return name; }
    String getGroup() { return group; }
    double getGrade() { return grade; }
}

public class Main {
    static Map<String, Integer> countByGroup(List<Student> students) {
        Map<String, Integer> result = new HashMap<>();
        // TODO
        return result;
    }

    static List<String> namesAlphabetical(List<Student> students) {
        return new ArrayList<>(); // TODO
    }

    static double averageOf(List<Student> students, String group) {
        return 0; // TODO
    }

    static String topStudent(List<Student> students) {
        return ""; // TODO
    }
}
`,
    ref: `import java.util.*;import java.util.stream.*;
class Student{private final String name,group;private final double grade;Student(String n,String g,double x){name=n;group=g;grade=x;}String getName(){return name;}String getGroup(){return group;}double getGrade(){return grade;}}
public class Main{
static Map<String,Integer> countByGroup(List<Student> s){return s.stream().collect(Collectors.groupingBy(Student::getGroup,TreeMap::new,Collectors.summingInt(x->1)));}
static List<String> namesAlphabetical(List<Student> s){return s.stream().map(Student::getName).sorted().toList();}
static double averageOf(List<Student> s,String g){return s.stream().filter(x->x.getGroup().equals(g)).mapToDouble(Student::getGrade).average().orElse(0);}
static String topStudent(List<Student> s){return s.stream().reduce((a,b)->b.getGrade()>a.getGrade()?b:a).map(Student::getName).orElse("");}}`,
    tests: [
      { name: L('Numără pe grupe', 'Count per group'), show: 'countByGroup(6 studenți / students)', want: '4LF341=3, 4LF342=2, 4LF343=1', run: (c) => { const m = c.call('countByGroup', mkStudents(c, STUDENTS)); const got = (mapEntries(c.I, m) || [c.str(m)]).sort().join(', '); c.bars = m && m.entries ? m.entries(c.I).map(e => [c.str(e.k), asNum(e.v)]) : []; return eq(got, '4LF341=3, 4LF342=2, 4LF343=1'); } },
      { name: L('Alfabetic', 'Alphabetical'), show: 'namesAlphabetical(...)', want: '[Ana, Bogdan, Carmen, Dan, Eva, Ion]', run: (c) => eq(c.str(c.call('namesAlphabetical', mkStudents(c, STUDENTS))), '[Ana, Bogdan, Carmen, Dan, Eva, Ion]') },
      { name: L('Media grupei', 'Group average'), show: 'averageOf(..., "4LF341")', want: '9.0', run: (c) => near(asNum(c.call('averageOf', mkStudents(c, STUDENTS), '4LF341')), 9.0) },
      { name: L('Șeful promoției', 'Top student'), show: 'topStudent(...)', want: 'Eva', run: (c) => eq(c.call('topStudent', mkStudents(c, STUDENTS)), 'Eva') },
    ],
    validators: [
      { name: L('Egalitate la notă', 'Tied grades'), run: (c) => eq(c.call('topStudent', mkStudents(c, [['Zoe', 'A', 9], ['Ada', 'B', 9], ['Max', 'A', 8]])), 'Zoe') },
      { name: L('Grupă inexistentă', 'Missing group'), run: (c) => near(asNum(c.call('averageOf', mkStudents(c, STUDENTS), '9ZZ999')), 0) },
      { name: L('Listă goală', 'Empty list'), run: (c) => { const t = c.call('topStudent', c.list([])); const m = c.call('countByGroup', c.list([])); return { pass: t === '' && m && m.size === 0, got: `"${t}", ${c.str(m)}`, want: '"", {}' }; } },
      { name: L('Lista rămâne neschimbată', 'Input list unchanged'), run: (c) => { const l = mkStudents(c, STUDENTS); const before = l.a.map(o => o.f.name).join(','); c.call('namesAlphabetical', l); c.call('countByGroup', l); const after = l.a.map(o => o.f.name).join(','); return { pass: before === after, got: after, want: before }; } },
    ],
    bonus: [
      { league: 'silver', label: L('countByGroup întoarce un TreeMap (grupe sortate)', 'countByGroup returns a TreeMap (sorted groups)'), check: (x) => x.extra.treeMap === true },
      { league: 'gold', label: L('cod ≤ 900 caractere', 'code ≤ 900 characters'), check: (x) => x.size <= 900 },
      { league: 'legend', label: L('fără bucle for / while (doar stream-uri)', 'no for / while loops (streams only)'), check: (x) => !hasLoop(x.code) },
    ],
    probe: (c, extra) => { const m = c.call('countByGroup', mkStudents(c, STUDENTS)); extra.treeMap = !!(m && m.kind === 'TreeMap'); },
    hints: [L('<code>map.put(g, map.getOrDefault(g, 0) + 1)</code> sau <code>map.merge(g, 1, Integer::sum)</code>.', '<code>map.put(g, map.getOrDefault(g, 0) + 1)</code> or <code>map.merge(g, 1, Integer::sum)</code>.'),
      L('Copiază lista înainte de sortare: <code>new ArrayList&lt;&gt;(names)</code>.', 'Copy before sorting: <code>new ArrayList&lt;&gt;(names)</code>.')],
  });

  // ===== Ch 7: exceptions =====
  C.push({
    id: 'exceptions', ch: 7, kind: 'tests', icon: 'shield',
    title: L('Evadarea din excepții', 'The Exception Escape'),
    blurb: L('Excepții proprii, try/catch și înlănțuirea cauzelor.', 'Custom exceptions, try/catch and exception chaining.'),
    statement: L(
      `<p>Notele vin ca text și unele sunt greșite. Scrie:</p><pre>class InvalidGradeException extends ...   // excepția ta
static int parseGrade(String text) throws InvalidGradeException
static double average(String[] grades)
static String report(String[] grades)</pre><ul><li><code>parseGrade</code> elimină spațiile, acceptă doar întregi de la 1 la 10 și altfel aruncă <code>InvalidGradeException</code> cu mesajul <code>"Invalid grade: " + text</code>. Pentru <code>null</code> aruncă tot <code>InvalidGradeException</code>.</li><li><code>average</code> face media notelor valide (le ignoră pe cele greșite); <code>0.0</code> dacă nu e niciuna.</li><li><code>report</code> întoarce de ex. <code>"3 valid, 1 invalid"</code>.</li></ul><p class="note">Ligile superioare cer o excepție <b>verificată</b> (checked), păstrarea cauzei originale și prinderea unor tipuri precise, nu a lui <code>Exception</code>.</p>`,
      `<p>Grades arrive as text and some are wrong. Write:</p><pre>class InvalidGradeException extends ...   // your exception
static int parseGrade(String text) throws InvalidGradeException
static double average(String[] grades)
static String report(String[] grades)</pre><ul><li><code>parseGrade</code> trims spaces, accepts only whole numbers from 1 to 10, and otherwise throws <code>InvalidGradeException</code> with the message <code>"Invalid grade: " + text</code>. For <code>null</code> it also throws <code>InvalidGradeException</code>.</li><li><code>average</code> averages the valid grades (skipping invalid ones); <code>0.0</code> if there are none.</li><li><code>report</code> returns e.g. <code>"3 valid, 1 invalid"</code>.</li></ul><p class="note">Higher leagues need a <b>checked</b> exception, the original cause preserved, and catching precise types rather than <code>Exception</code>.</p>`),
    starter: `class InvalidGradeException extends RuntimeException {
    InvalidGradeException(String message) {
        super(message);
    }
}

public class Main {
    static int parseGrade(String text) {
        return Integer.parseInt(text); // TODO: validate, trim, wrap errors
    }

    static double average(String[] grades) {
        return 0; // TODO
    }

    static String report(String[] grades) {
        return ""; // TODO
    }

    public static void main(String[] args) {
        System.out.println(parseGrade("7"));
    }
}
`,
    ref: `class InvalidGradeException extends Exception{InvalidGradeException(String m,Throwable c){super(m,c);}}
public class Main{
static int parseGrade(String t)throws InvalidGradeException{if(t==null)throw new InvalidGradeException("Invalid grade: null",null);int g;try{g=Integer.parseInt(t.trim());}catch(NumberFormatException e){throw new InvalidGradeException("Invalid grade: "+t,e);}if(g<1||g>10)throw new InvalidGradeException("Invalid grade: "+t,null);return g;}
static double average(String[] a){int s=0,n=0;for(String x:a){try{s+=parseGrade(x);n++;}catch(InvalidGradeException e){}}return n==0?0:(double)s/n;}
static String report(String[] a){int n=0;for(String x:a){try{parseGrade(x);n++;}catch(InvalidGradeException e){}}return n+" valid, "+(a.length-n)+" invalid";}}`,
    tests: [
      { name: L('Notă validă', 'Valid grade'), show: 'parseGrade(" 10 ")', want: '10', run: (c) => eq(c.call('parseGrade', ' 10 '), 10) },
      { name: L('Peste 10', 'Above 10'), show: 'parseGrade("11")', want: 'InvalidGradeException: Invalid grade: 11', run: (c) => { const ex = c.expectThrow(() => c.I.callByName('parseGrade', ['11']), 'InvalidGradeException'); const msg = ex.f.message; return { pass: msg === 'Invalid grade: 11', got: 'InvalidGradeException: ' + msg, want: 'InvalidGradeException: Invalid grade: 11' }; } },
      { name: L('Nu e număr', 'Not a number'), show: 'parseGrade("abc")', want: 'InvalidGradeException: Invalid grade: abc', run: (c) => { const ex = c.expectThrow(() => c.I.callByName('parseGrade', ['abc']), 'InvalidGradeException'); return { pass: ex.f.message === 'Invalid grade: abc', got: 'InvalidGradeException: ' + ex.f.message, want: 'InvalidGradeException: Invalid grade: abc' }; } },
      { name: L('Media', 'Average'), show: 'average({"10", "x", "8"})', want: '9.0', run: (c) => near(asNum(c.call('average', c.strs(['10', 'x', '8']))), 9.0) },
    ],
    validators: [
      { name: L('null', 'null'), run: (c) => { c.expectThrow(() => c.I.callByName('parseGrade', [null]), 'InvalidGradeException'); return { pass: true, got: 'InvalidGradeException', want: 'InvalidGradeException' }; } },
      { name: L('Zero', 'Zero'), run: (c) => { c.expectThrow(() => c.I.callByName('parseGrade', ['0']), 'InvalidGradeException'); return { pass: true, got: 'InvalidGradeException', want: 'InvalidGradeException' }; } },
      { name: L('Media fără note valide', 'Average with no valid grades'), run: (c) => near(asNum(c.call('average', c.strs(['-', 'zece']))), 0) },
      { name: L('Raport', 'Report'), run: (c) => eq(c.call('report', c.strs(['5', 'five', '0', ' 7'])), '2 valid, 2 invalid') },
      { name: L('Zecimale', 'Decimals'), run: (c) => { c.expectThrow(() => c.I.callByName('parseGrade', ['9.5']), 'InvalidGradeException'); return { pass: true, got: 'InvalidGradeException', want: 'InvalidGradeException' }; } },
    ],
    bonus: [
      { league: 'silver', label: L('InvalidGradeException este verificată (extends Exception)', 'InvalidGradeException is checked (extends Exception)'), check: (x) => { const k = x.cls('InvalidGradeException'); return !!(k && x.I.clsIsA(k, 'Exception') && !x.I.clsIsA(k, 'RuntimeException')); } },
      { league: 'gold', label: L('pentru "abc", getCause() este NumberFormatException', 'for "abc", getCause() is a NumberFormatException'), check: (x) => x.extra.cause === 'NumberFormatException' },
      { league: 'legend', label: L('fără catch (Exception e) sau catch (Throwable e)', 'no catch (Exception e) or catch (Throwable e)'), check: (x) => !/catch\s*\(\s*(final\s+)?(Exception|Throwable|RuntimeException)\s+\w+\s*\)/.test(codeOnly(x.code)) },
    ],
    probe: (c, extra) => { const r = c.I.guard(() => c.I.callByName('parseGrade', ['abc'])); extra.cause = (!r.ok && r.ex && r.ex.f.cause) ? r.ex.f.cause.cls.name : null; },
    hints: [L('Prinde <code>NumberFormatException</code> și aruncă excepția ta, dând-o pe cea veche drept cauză: <code>super(message, cause)</code>.', 'Catch <code>NumberFormatException</code> and throw your own, passing the old one as cause: <code>super(message, cause)</code>.'),
      L('O excepție verificată extinde <code>Exception</code>; metoda trebuie să declare <code>throws</code>.', 'A checked exception extends <code>Exception</code>; the method must declare <code>throws</code>.')],
  });

  // ===== Ch 8: balanced brackets (Deque) =====
  C.push({
    id: 'brackets', ch: 8, kind: 'tests', icon: 'stack', visual: 'stack',
    title: L('Turnul de paranteze', 'The Bracket Tower'),
    blurb: L('Stive cu Deque: verifică parantezele și adâncimea lor.', 'Stacks with Deque: check brackets and their depth.'),
    statement: L(
      `<p>Scrie:</p><pre>static boolean isBalanced(String s)  // (), [], {} închise corect, în ordine
static int maxDepth(String s)        // adâncimea maximă; -1 dacă nu e echilibrat</pre><p>Celelalte caractere se ignoră. De exemplu <code>"([]{})"</code> este echilibrat, <code>"([)]"</code> nu. <code>maxDepth("(a(b)[c{d}])")</code> este <code>3</code>.</p><p class="note">Capitolul 8 recomandă <code>Deque</code> / <code>ArrayDeque</code> în locul clasei vechi <code>Stack</code>.</p>`,
      `<p>Write:</p><pre>static boolean isBalanced(String s)  // (), [], {} closed correctly, in order
static int maxDepth(String s)        // maximum nesting depth; -1 if unbalanced</pre><p>Other characters are ignored. For example <code>"([]{})"</code> is balanced, <code>"([)]"</code> is not. <code>maxDepth("(a(b)[c{d}])")</code> is <code>3</code>.</p><p class="note">Chapter 8 recommends <code>Deque</code> / <code>ArrayDeque</code> over the legacy <code>Stack</code> class.</p>`),
    starter: `import java.util.*;

public class Main {
    static boolean isBalanced(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            // TODO: push opening brackets, check closing ones
        }
        return stack.isEmpty();
    }

    static int maxDepth(String s) {
        return 0; // TODO
    }

    public static void main(String[] args) {
        System.out.println(isBalanced("([]{})"));
    }
}
`,
    ref: `import java.util.*;public class Main{static int maxDepth(String s){Deque<Character> d=new ArrayDeque<>();int m=0;for(char c:s.toCharArray()){int i="([{".indexOf(c),j=")]}".indexOf(c);if(i>=0){d.push(")]}".charAt(i));m=Math.max(m,d.size());}else if(j>=0&&(d.isEmpty()||d.pop()!=c))return -1;}return d.isEmpty()?m:-1;}static boolean isBalanced(String s){return maxDepth(s)>=0;}}`,
    tests: [
      { name: L('Echilibrat', 'Balanced'), show: 'isBalanced("([]{})")', want: 'true', run: (c) => { c.stackOf = '([]{})'; return eq(c.call('isBalanced', '([]{})'), true); } },
      { name: L('Încrucișat', 'Crossed'), show: 'isBalanced("([)]")', want: 'false', run: (c) => { c.stackOf = '([)]'; return eq(c.call('isBalanced', '([)]'), false); } },
      { name: L('Rămân deschise', 'Left open'), show: 'isBalanced("((")', want: 'false', run: (c) => { c.stackOf = '(('; return eq(c.call('isBalanced', '(('), false); } },
      { name: L('Adâncime', 'Depth'), show: 'maxDepth("(a(b)[c{d}])")', want: '3', run: (c) => { c.stackOf = '(a(b)[c{d}])'; return eq(c.call('maxDepth', '(a(b)[c{d}])'), 3); } },
    ],
    validators: [
      { name: L('Șir gol', 'Empty string'), run: (c) => { const a = c.call('isBalanced', ''), b = c.call('maxDepth', ''); return { pass: a === true && b === 0, got: `${a}, ${b}`, want: 'true, 0' }; } },
      { name: L('Închidere fără deschidere', 'Close without open'), run: (c) => { const a = c.call('isBalanced', ')('), b = c.call('maxDepth', ')('); return { pass: a === false && b === -1, got: `${a}, ${b}`, want: 'false, -1' }; } },
      { name: L('Text cu paranteze', 'Text with brackets'), run: (c) => eq(c.call('isBalanced', 'if (a[i] == b) { x = f(y); }'), true) },
      { name: L('Adâncime mare', 'Deep nesting'), run: (c) => eq(c.call('maxDepth', '{'.repeat(40) + '[]' + '}'.repeat(40)), 41) },
      { name: L('Dezechilibrat la final', 'Unbalanced at the end'), run: (c) => eq(c.call('maxDepth', '(())]'), -1) },
    ],
    metric: { kind: 'chars', label: L('caractere', 'characters') },
    bonus: [
      { league: 'silver', label: L('folosește ArrayDeque, nu Stack', 'uses ArrayDeque, not Stack'), check: (x) => /\bArrayDeque\b/.test(codeOnly(x.code)) && !/\bnew\s+Stack\b/.test(codeOnly(x.code)) },
      { league: 'gold', label: L('cod ≤ 480 caractere', 'code ≤ 480 characters'), check: (x) => x.size <= 480 },
      { league: 'legend', label: L('cod ≤ 360 caractere', 'code ≤ 360 characters'), check: (x) => x.size <= 360 },
    ],
    hints: [L('Pune pe stivă paranteza de închidere așteptată: la <code>(</code> împinge <code>)</code>.', 'Push the closing bracket you expect: on <code>(</code> push <code>)</code>.'),
      L('Adâncimea curentă este <code>stack.size()</code> imediat după un <code>push</code>.', 'The current depth is <code>stack.size()</code> right after a <code>push</code>.')],
  });

  // ===== Ch 9: pattern matching =====
  C.push({
    id: 'patterns', ch: 9, kind: 'tests', icon: 'switch', visual: 'shapes',
    title: L('Arena tiparelor', 'The Pattern Arena'),
    blurb: L('Records, interfețe sealed și switch cu tipare (Java 21+).', 'Records, sealed interfaces and pattern switch (Java 21+).'),
    statement: L(
      `<p>Formele sunt <b>records</b> sub o interfață <b>sealed</b> (gata scrise). Implementează cu <code>switch</code> pe tipare:</p><pre>static double area(Shape s)        // Triangle: formula lui Heron
static String describe(Shape s)    // "circle r=1.0", "square 2.0", "rect 2.0x3.0", "triangle 3.0/4.0/5.0"
static String classify(Object o)   // null → "null", Integer negativ → "negative int",
                                   // Integer → "int", String s → "string(" + lungime + ")",
                                   // Shape → "shape", altceva → "other"</pre><p>Un <code>Rect</code> cu <code>w == h</code> se descrie ca <code>square</code>.</p>`,
      `<p>Shapes are <b>records</b> under a <b>sealed</b> interface (already written). Implement with a pattern <code>switch</code>:</p><pre>static double area(Shape s)        // Triangle: Heron's formula
static String describe(Shape s)    // "circle r=1.0", "square 2.0", "rect 2.0x3.0", "triangle 3.0/4.0/5.0"
static String classify(Object o)   // null → "null", negative Integer → "negative int",
                                   // Integer → "int", String s → "string(" + length + ")",
                                   // Shape → "shape", anything else → "other"</pre><p>A <code>Rect</code> with <code>w == h</code> is described as a <code>square</code>.</p>`),
    starter: `sealed interface Shape permits Circle, Rect, Triangle {}
record Circle(double r) implements Shape {}
record Rect(double w, double h) implements Shape {}
record Triangle(double a, double b, double c) implements Shape {}

public class Main {
    static double area(Shape s) {
        if (s instanceof Circle c) {
            return Math.PI * c.r() * c.r();
        }
        return 0; // TODO: Rect, Triangle
    }

    static String describe(Shape s) {
        return "?"; // TODO
    }

    static String classify(Object o) {
        return "other"; // TODO
    }

    public static void main(String[] args) {
        System.out.println(area(new Circle(1)));
    }
}
`,
    ref: `sealed interface Shape permits Circle,Rect,Triangle{}record Circle(double r)implements Shape{}record Rect(double w,double h)implements Shape{}record Triangle(double a,double b,double c)implements Shape{}
public class Main{static double area(Shape s){return switch(s){case Circle(double r)->Math.PI*r*r;case Rect(double w,double h)->w*h;case Triangle(double a,double b,double c)->{double p=(a+b+c)/2;yield Math.sqrt(p*(p-a)*(p-b)*(p-c));}};}
static String describe(Shape s){return switch(s){case Circle c->"circle r="+c.r();case Rect(double w,double h) when w==h->"square "+w;case Rect(double w,double h)->"rect "+w+"x"+h;case Triangle t->"triangle "+t.a()+"/"+t.b()+"/"+t.c();};}
static String classify(Object o){return switch(o){case null->"null";case Integer i when i<0->"negative int";case Integer i->"int";case String t->"string("+t.length()+")";case Shape x->"shape";default->"other";};}}`,
    tests: [
      { name: L('Aria triunghiului', 'Triangle area'), show: 'area(new Triangle(3, 4, 5))', want: '6.0', run: (c) => { const t = c.obj('Triangle', c.dbl(3), c.dbl(4), c.dbl(5)); const a = asNum(c.call('area', t)); c.draw = [{ k: 'Triangle', p: [3, 4, 5], area: a, ok: Math.abs(a - 6) < 1e-9 }]; return near(a, 6); } },
      { name: L('Descrieri', 'Descriptions'), show: 'describe(Circle(1)), describe(Rect(2,2)), describe(Rect(2,3))', want: 'circle r=1.0 | square 2.0 | rect 2.0x3.0', run: (c) => {
        const r = ['describe', 'describe', 'describe'].map((m, i) => c.call(m, [c.obj('Circle', c.dbl(1)), c.obj('Rect', c.dbl(2), c.dbl(2)), c.obj('Rect', c.dbl(2), c.dbl(3))][i]));
        c.draw = [{ k: 'Circle', p: [1], label: r[0], ok: r[0] === 'circle r=1.0' }, { k: 'Square', p: [2], label: r[1], ok: r[1] === 'square 2.0' }, { k: 'Rectangle', p: [2, 3], label: r[2], ok: r[2] === 'rect 2.0x3.0' }];
        return eq(r.join(' | '), 'circle r=1.0 | square 2.0 | rect 2.0x3.0');
      } },
      { name: L('Clasificare', 'Classify'), show: 'classify(-5), classify("Java"), classify(3.5)', want: 'negative int | string(4) | other', run: (c) => eq([c.call('classify', -5), c.call('classify', 'Java'), c.call('classify', c.dbl(3.5))].join(' | '), 'negative int | string(4) | other') },
    ],
    validators: [
      { name: L('Triunghi descris', 'Triangle described'), run: (c) => eq(c.call('describe', c.obj('Triangle', c.dbl(3), c.dbl(4), c.dbl(5))), 'triangle 3.0/4.0/5.0') },
      { name: L('null și forme', 'null and shapes'), run: (c) => eq([c.call('classify', null), c.call('classify', c.obj('Circle', c.dbl(2))), c.call('classify', 7)].join(' | '), 'null | shape | int') },
      { name: L('Aria dreptunghiului', 'Rectangle area'), run: (c) => near(asNum(c.call('area', c.obj('Rect', c.dbl(2.5), c.dbl(4)))), 10) },
      { name: L('Aria cercului', 'Circle area'), run: (c) => near(asNum(c.call('area', c.obj('Circle', c.dbl(2)))), 4 * Math.PI) },
    ],
    bonus: [
      { league: 'silver', label: L('folosește switch cu tipare', 'uses a pattern switch'), check: (x) => /case\s+(Circle|Rect|Triangle|Integer|String|Shape)\b/.test(codeOnly(x.code)) },
      { league: 'gold', label: L('fără instanceof și fără if', 'no instanceof and no if'), check: (x) => !/\b(instanceof|if)\b/.test(codeOnly(x.code)) },
      { league: 'legend', label: L('deconstrucție de record + gardă when', 'record deconstruction + a when guard'), check: (x) => /case\s+(Circle|Rect|Triangle)\s*\(/.test(codeOnly(x.code)) && /\bwhen\b/.test(codeOnly(x.code)) },
    ],
    hints: [L('<code>return switch (s) { case Circle c -&gt; ...; case Rect r -&gt; ...; ... };</code> nu are nevoie de <code>default</code>: interfața e sealed.', '<code>return switch (s) { case Circle c -&gt; ...; case Rect r -&gt; ...; ... };</code> needs no <code>default</code>: the interface is sealed.'),
      L('Deconstrucție: <code>case Rect(double w, double h) when w == h -&gt; ...</code>', 'Deconstruction: <code>case Rect(double w, double h) when w == h -&gt; ...</code>')],
  });

  // ===== Ch 9: stream golf =====
  const WORDS = ['java', 'is', 'a', 'language', 'java', 'runs', 'on', 'the', 'jvm', 'and', 'java', 'is', 'fun'];
  C.push({
    id: 'streamgolf', ch: 9, kind: 'tests', icon: 'stream',
    title: L('Golf cu stream-uri', 'Stream Golf'),
    blurb: L('Fără nicio buclă. Doar stream-uri, lambda și method references.', 'No loops at all. Only streams, lambdas and method references.'),
    statement: L(
      `<p><b>Regulă:</b> nu ai voie să folosești <code>for</code>, <code>while</code> sau <code>do</code>. Scrie, pe o listă de cuvinte:</p><pre>static long countLonger(List&lt;String&gt; words, int n)    // câte au lungimea &gt; n
static String initials(List&lt;String&gt; words)           // prima literă, majusculă: [java, is, fun] → "JIF"
static Map&lt;Integer, List&lt;String&gt;&gt; byLength(List&lt;String&gt; words)  // TreeMap: lungime → cuvinte (ordinea inițială)
static List&lt;String&gt; topWords(List&lt;String&gt; words, int n) // cele mai frecvente n cuvinte; la egalitate, alfabetic</pre><p class="note">Ligile superioare se câștigă cu cod mai scurt.</p>`,
      `<p><b>Rule:</b> you may not use <code>for</code>, <code>while</code> or <code>do</code>. On a list of words, write:</p><pre>static long countLonger(List&lt;String&gt; words, int n)    // how many are longer than n
static String initials(List&lt;String&gt; words)           // first letters, uppercase: [java, is, fun] → "JIF"
static Map&lt;Integer, List&lt;String&gt;&gt; byLength(List&lt;String&gt; words)  // TreeMap: length → words (original order)
static List&lt;String&gt; topWords(List&lt;String&gt; words, int n) // the n most frequent words; alphabetical on ties</pre><p class="note">Higher leagues need shorter code.</p>`),
    starter: `import java.util.*;
import java.util.stream.*;

public class Main {
    static long countLonger(List<String> words, int n) {
        return words.stream().filter(w -> w.length() > n).count();
    }

    static String initials(List<String> words) {
        return ""; // TODO
    }

    static Map<Integer, List<String>> byLength(List<String> words) {
        return new TreeMap<>(); // TODO: Collectors.groupingBy
    }

    static List<String> topWords(List<String> words, int n) {
        return List.of(); // TODO
    }
}
`,
    ref: `import java.util.*;import java.util.stream.*;import static java.util.stream.Collectors.*;public class Main{
static long countLonger(List<String> w,int n){return w.stream().filter(x->x.length()>n).count();}
static String initials(List<String> w){return w.stream().map(x->x.substring(0,1).toUpperCase()).collect(joining());}
static Map<Integer,List<String>> byLength(List<String> w){return w.stream().collect(groupingBy(String::length,TreeMap::new,toList()));}
static List<String> topWords(List<String> w,int n){return w.stream().collect(groupingBy(x->x,counting())).entrySet().stream().sorted(Map.Entry.<String,Long>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey())).limit(n).map(Map.Entry::getKey).toList();}}`,
    tests: [
      { name: L('Cuvinte lungi', 'Long words'), show: 'countLonger(words, 3)', want: '5', run: (c) => eq(c.call('countLonger', c.list(WORDS), 3), 5) },
      { name: L('Inițiale', 'Initials'), show: 'initials([java, is, fun])', want: 'JIF', run: (c) => eq(c.call('initials', c.list(['java', 'is', 'fun'])), 'JIF') },
      { name: L('Pe lungimi', 'By length'), show: 'byLength([java, is, a, fun, go])', want: '{1=[a], 2=[is, go], 3=[fun], 4=[java]}', run: (c) => eq(c.str(c.call('byLength', c.list(['java', 'is', 'a', 'fun', 'go']))), '{1=[a], 2=[is, go], 3=[fun], 4=[java]}') },
      { name: L('Top 2', 'Top 2'), show: 'topWords(words, 2)', want: '[java, is]', run: (c) => eq(c.str(c.call('topWords', c.list(WORDS), 2)), '[java, is]') },
    ],
    validators: [
      { name: L('Listă goală', 'Empty list'), run: (c) => eq([c.call('countLonger', c.list([]), 1), c.call('initials', c.list([])), c.str(c.call('byLength', c.list([])))].join(' | '), '0 |  | {}') },
      { name: L('Egalitate alfabetică', 'Alphabetical tie'), run: (c) => eq(c.str(c.call('topWords', c.list(['b', 'a', 'c', 'b', 'a', 'c', 'd']), 3)), '[a, b, c]') },
      { name: L('Ordinea inițială', 'Original order'), run: (c) => eq(c.str(c.call('byLength', c.list(['bb', 'aa', 'c', 'dd']))), '{1=[c], 2=[bb, aa, dd]}') },
      { name: L('Prag mare', 'High threshold'), run: (c) => eq(c.call('countLonger', c.list(WORDS), 10), 0) },
    ],
    metric: { kind: 'chars', label: L('caractere', 'characters') },
    gate: { label: L('fără bucle (for / while / do)', 'no loops (for / while / do)'), check: (x) => !hasLoop(x.code) },
    bonus: [
      { league: 'silver', label: L('cod ≤ 1000 caractere', 'code ≤ 1000 characters'), check: (x) => x.size <= 1000 },
      { league: 'gold', label: L('cod ≤ 820 caractere', 'code ≤ 820 characters'), check: (x) => x.size <= 820 },
      { league: 'legend', label: L('cod ≤ 720 caractere', 'code ≤ 720 characters'), check: (x) => x.size <= 720 },
    ],
    hints: [L('<code>Collectors.groupingBy(String::length, TreeMap::new, Collectors.toList())</code>', '<code>Collectors.groupingBy(String::length, TreeMap::new, Collectors.toList())</code>'),
      L('Pentru frecvențe: <code>groupingBy(w -&gt; w, counting())</code>, apoi sortează intrările după valoare.', 'For frequencies: <code>groupingBy(w -&gt; w, counting())</code>, then sort the entries by value.')],
  });

  // ===== Ch 12: boss (labs) =====
  C.push({
    id: 'boss', ch: 12, kind: 'tests', icon: 'crown', boss: true,
    title: L('Boss: CourseManager', 'Boss: CourseManager'),
    blurb: L('Proiectul de laborator: clase, colecții, excepții și stream-uri împreună.', 'The lab project: classes, collections, exceptions and streams together.'),
    statement: L(
      `<p>Ca în laboratoare, gestionează cursurile facultății. <code>record Course(String name, String professor, int credits)</code> este dat. Scrie <code>CourseNotFoundException</code> și clasa:</p><pre>class CourseManager {
    void addCourse(String name, String professor, int credits)
        // IllegalArgumentException dacă numele există deja (fără a ține cont de majuscule)
        // sau dacă credits nu este între 1 și 10
    Course findCourse(String name) throws CourseNotFoundException  // fără a ține cont de majuscule
    boolean removeCourse(String name)
    int totalCredits()
    List&lt;String&gt; coursesOf(String professor)   // numele, sortate alfabetic
    Map&lt;String, Integer&gt; creditsByProfessor()  // TreeMap: profesor → total credite
}</pre>`,
      `<p>As in the labs, manage the faculty's courses. <code>record Course(String name, String professor, int credits)</code> is given. Write <code>CourseNotFoundException</code> and the class:</p><pre>class CourseManager {
    void addCourse(String name, String professor, int credits)
        // IllegalArgumentException if the name already exists (ignoring case)
        // or if credits is not between 1 and 10
    Course findCourse(String name) throws CourseNotFoundException  // ignoring case
    boolean removeCourse(String name)
    int totalCredits()
    List&lt;String&gt; coursesOf(String professor)   // the names, sorted alphabetically
    Map&lt;String, Integer&gt; creditsByProfessor()  // TreeMap: professor → total credits
}</pre>`),
    starter: `import java.util.*;

record Course(String name, String professor, int credits) {}

class CourseNotFoundException extends Exception {
    CourseNotFoundException(String message) { super(message); }
}

class CourseManager {
    private final List<Course> courses = new ArrayList<>();

    void addCourse(String name, String professor, int credits) {
        courses.add(new Course(name, professor, credits)); // TODO: validation
    }

    Course findCourse(String name) throws CourseNotFoundException {
        throw new CourseNotFoundException(name); // TODO
    }

    // TODO: removeCourse, totalCredits, coursesOf, creditsByProfessor
}

public class Main {
    public static void main(String[] args) throws Exception {
        CourseManager m = new CourseManager();
        m.addCourse("POO", "Danciu", 6);
        System.out.println(m.findCourse("poo"));
    }
}
`,
    ref: `import java.util.*;import java.util.stream.*;
record Course(String name,String professor,int credits){}
class CourseNotFoundException extends Exception{CourseNotFoundException(String m){super(m);}}
class CourseManager{private final List<Course> c=new ArrayList<>();
void addCourse(String n,String p,int k){if(k<1||k>10||c.stream().anyMatch(x->x.name().equalsIgnoreCase(n)))throw new IllegalArgumentException(n);c.add(new Course(n,p,k));}
Course findCourse(String n)throws CourseNotFoundException{return c.stream().filter(x->x.name().equalsIgnoreCase(n)).findFirst().orElseThrow(()->new CourseNotFoundException(n));}
boolean removeCourse(String n){return c.removeIf(x->x.name().equalsIgnoreCase(n));}
int totalCredits(){return c.stream().mapToInt(Course::credits).sum();}
List<String> coursesOf(String p){return c.stream().filter(x->x.professor().equals(p)).map(Course::name).sorted().toList();}
Map<String,Integer> creditsByProfessor(){return c.stream().collect(Collectors.groupingBy(Course::professor,TreeMap::new,Collectors.summingInt(Course::credits)));}}`,
    setup: (c) => { const m = c.obj('CourseManager'); [['POO', 'Danciu', 6], ['Baze de date', 'Popescu', 5], ['Java Avansat', 'Danciu', 4], ['Algoritmi', 'Ionescu', 6]].forEach(([n, p, k]) => c.inv(m, 'addCourse', n, p, k)); return m; },
    tests: [
      { name: L('Căutare', 'Find'), show: 'findCourse("poo")', want: 'Course[name=POO, professor=Danciu, credits=6]', run: (c) => { const m = C_BOSS.setup(c); return eq(c.str(c.inv(m, 'findCourse', 'poo')), 'Course[name=POO, professor=Danciu, credits=6]'); } },
      { name: L('Curs inexistent', 'Missing course'), show: 'findCourse("Chimie")', want: 'CourseNotFoundException', run: (c) => { const m = C_BOSS.setup(c); c.expectThrow(() => c.I.call(m, 'findCourse', ['Chimie']), 'CourseNotFoundException'); return { pass: true, got: 'CourseNotFoundException', want: 'CourseNotFoundException' }; } },
      { name: L('Total credite', 'Total credits'), show: 'totalCredits()', want: '21', run: (c) => eq(c.inv(C_BOSS.setup(c), 'totalCredits'), 21) },
      { name: L('Cursurile unui profesor', 'A professor\'s courses'), show: 'coursesOf("Danciu")', want: '[Java Avansat, POO]', run: (c) => eq(c.str(c.inv(C_BOSS.setup(c), 'coursesOf', 'Danciu')), '[Java Avansat, POO]') },
    ],
    validators: [
      { name: L('Duplicat', 'Duplicate'), run: (c) => { const m = C_BOSS.setup(c); c.expectThrow(() => c.I.call(m, 'addCourse', ['poo', 'X', 3]), 'IllegalArgumentException'); return eq(c.inv(m, 'totalCredits'), 21); } },
      { name: L('Credite invalide', 'Invalid credits'), run: (c) => { const m = C_BOSS.setup(c); c.expectThrow(() => c.I.call(m, 'addCourse', ['Fizica', 'X', 0]), 'IllegalArgumentException'); c.expectThrow(() => c.I.call(m, 'addCourse', ['Chimie', 'X', 11]), 'IllegalArgumentException'); return { pass: true, got: 'IllegalArgumentException', want: 'IllegalArgumentException' }; } },
      { name: L('Ștergere', 'Remove'), run: (c) => { const m = C_BOSS.setup(c); const a = c.inv(m, 'removeCourse', 'ALGORITMI'), b = c.inv(m, 'removeCourse', 'Algoritmi'); return { pass: a === true && b === false && c.inv(m, 'totalCredits') === 15, got: `${a}, ${b}, ${c.inv(m, 'totalCredits')}`, want: 'true, false, 15' }; } },
      { name: L('Pe profesori', 'By professor'), run: (c) => eq(c.str(c.inv(C_BOSS.setup(c), 'creditsByProfessor')), '{Danciu=10, Ionescu=6, Popescu=5}') },
      { name: L('Manager gol', 'Empty manager'), run: (c) => { const m = c.obj('CourseManager'); return eq([c.inv(m, 'totalCredits'), c.str(c.inv(m, 'coursesOf', 'X')), c.str(c.inv(m, 'creditsByProfessor'))].join(' | '), '0 | [] | {}'); } },
    ],
    bonus: [
      { league: 'silver', label: L('lista de cursuri este private', 'the course list is private'), check: (x) => { const k = x.cls('CourseManager'); return !!(k && k.fields.length && k.fields.every(f => f.isPrivate)); } },
      { league: 'gold', label: L('CourseNotFoundException este verificată', 'CourseNotFoundException is checked'), check: (x) => { const k = x.cls('CourseNotFoundException'); return !!(k && !x.I.clsIsA(k, 'RuntimeException')); } },
      { league: 'legend', label: L('fără bucle for / while (stream-uri)', 'no for / while loops (streams)'), check: (x) => !hasLoop(x.code) },
    ],
    hints: [L('Pentru comparații fără majuscule: <code>a.equalsIgnoreCase(b)</code>.', 'Case-insensitive comparison: <code>a.equalsIgnoreCase(b)</code>.'),
      L('<code>Collectors.groupingBy(Course::professor, TreeMap::new, Collectors.summingInt(Course::credits))</code>', '<code>Collectors.groupingBy(Course::professor, TreeMap::new, Collectors.summingInt(Course::credits))</code>')],
  });
  const C_BOSS = C[C.length - 1];

  // ---------- running ----------
  function runOne(ch, code, t) {
    const ctx = makeCtx(code, { maxSteps: 600000 });
    if (ctx.error) return { compile: ctx.error };
    try {
      const r = t.run(ctx);
      return { pass: !!r.pass, got: r.got === undefined ? '' : String(r.got), want: r.want === undefined ? '' : String(r.want), out: ctx.I.stdout() + ctx.I.stderr(), draw: ctx.draw, log: ctx.log, bars: ctx.bars, stackOf: ctx.stackOf };
    } catch (e) {
      if (e instanceof TestFail) return { pass: false, got: e.got !== undefined ? e.got : e.message, want: e.want !== undefined ? e.want : (t.want !== undefined ? t.want : ''), error: e.javaErr ? e.javaErr : null, errText: e.message, out: ctx.I.stdout() + ctx.I.stderr(), draw: ctx.draw, stackOf: ctx.stackOf };
      return { pass: false, got: 'internal error: ' + e.message, want: '', errText: String(e && e.stack) };
    }
  }
  function compileCheck(code) {
    const L0 = M.load(code, {});
    return L0.error ? M.formatError(L0.error, code) : null;
  }
  // Submit: visible tests + hidden validators + league
  function submit(ch, code) {
    const res = { tests: [], validators: [], size: codeSize(code), code };
    const ce = compileCheck(code);
    if (ce) { res.compile = ce; res.league = 'none'; return res; }
    if (ch.kind === 'robot') {
      res.tests = ch.maps.map(m => runRobot(code, m));
      res.validators = ch.hidden.map(m => runRobot(code, m));
      res.metric = [...res.tests, ...res.validators].reduce((s, r) => s + r.actions, 0);
    } else {
      res.tests = ch.tests.map(t => runOne(ch, code, t));
      res.validators = ch.validators.map(t => runOne(ch, code, t));
      res.metric = ch.metric && ch.metric.kind === 'chars' ? res.size : null;
    }
    const visOk = res.tests.every(t => t.pass !== false && t.ok !== false);
    const allOk = visOk && res.validators.every(t => t.pass !== false && t.ok !== false);
    const passed = [...res.tests, ...res.validators].filter(t => t.pass || t.ok).length;
    res.score = Math.round(100 * passed / (res.tests.length + res.validators.length));
    let league = visOk ? 'wood' : 'none';
    // static/structural context for bonus checks
    const ctx = makeCtx(code, {});
    const extra = {};
    if (!ctx.error && ch.probe) { try { ch.probe(ctx, extra); } catch (e) { } }
    const x = { code, size: res.size, metric: res.metric, extra, cls: (n) => ctx.I && ctx.I.classes.get(n), I: ctx.I };
    res.gate = ch.gate ? ch.gate.check(x) : true;
    if (allOk && res.gate) {
      league = 'bronze';
      for (const lg of ['silver', 'gold', 'legend']) {
        const checks = ch.bonus.filter(b => b.league === lg);
        if (checks.every(b => { try { return b.check(x); } catch (e) { return false; } })) league = lg; else break;
      }
    }
    res.bonusState = ch.bonus.map(b => { try { return b.check(x); } catch (e) { return false; } });
    res.league = league;
    return res;
  }
  return { challenges: C, LEAGUES, LEAGUE_NAME, LEAGUE_XP, runOne, runRobot, submit, compileCheck, codeSize, hasLoop, parseMap, Robot, ROBOT_ORDER: ORDER, L };
})();
if (typeof module !== 'undefined') module.exports = Arena;
