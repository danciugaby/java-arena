// ===== MiniJava standard library subset =====
const KNOWN_TYPES = new Set(('String Integer Long Short Byte Double Float Character Boolean Number Comparable CharSequence Object List ArrayList LinkedList ' +
  'Map HashMap TreeMap LinkedHashMap Set HashSet TreeSet LinkedHashSet Collection Iterable Queue Deque ArrayDeque Stack Vector PriorityQueue Optional OptionalInt OptionalDouble ' +
  'Stream IntStream DoubleStream LongStream StringBuilder StringBuffer Scanner Random Thread Runnable Comparator Function BiFunction Predicate BiPredicate Consumer Supplier BiConsumer ' +
  'UnaryOperator BinaryOperator IntBinaryOperator IntUnaryOperator IntPredicate IntFunction ToIntFunction ToDoubleFunction Iterator Map.Entry Entry AtomicInteger AtomicLong ExecutorService Future Callable ' +
  'Record Enum Cloneable SequencedCollection SequencedMap ConcurrentHashMap CopyOnWriteArrayList Collector').split(' '));
const BUILTIN_STATIC_CLASSES = new Set(['Math', 'Integer', 'Long', 'Double', 'Float', 'Character', 'Boolean', 'String', 'System', 'Arrays', 'Collections', 'List', 'Set', 'Map',
  'Objects', 'Stream', 'IntStream', 'DoubleStream', 'LongStream', 'Collectors', 'Comparator', 'Optional', 'OptionalInt', 'OptionalDouble', 'Function', 'Predicate', 'UnaryOperator', 'Thread',
  'Executors', 'IO', 'Map.Entry', 'Entry', 'StrictMath', 'TimeUnit', 'Short', 'Byte', 'ThreadLocalRandom', 'Duration', 'Runtime', 'BinaryOperator']);
const STATIC_BUILTIN_METHODS = {
  Math: new Set('abs max min pow sqrt cbrt floor ceil round rint random sin cos tan asin acos atan atan2 exp log log10 hypot signum toRadians toDegrees floorDiv floorMod addExact subtractExact multiplyExact clamp'.split(' ')),
  Integer: new Set('parseInt valueOf toString toBinaryString toHexString toOctalString compare max min sum signum bitCount reverse'.split(' ')),
  Long: new Set('parseLong valueOf toString compare max min sum'.split(' ')),
  Double: new Set('parseDouble valueOf toString compare max min sum isNaN isInfinite isFinite'.split(' ')),
  Character: new Set('isDigit isLetter isLetterOrDigit isAlphabetic isUpperCase isLowerCase isWhitespace isSpaceChar toUpperCase toLowerCase getNumericValue valueOf toString compare'.split(' ')),
  Boolean: new Set('parseBoolean valueOf toString compare logicalAnd logicalOr logicalXor'.split(' ')),
  String: new Set('valueOf join format copyValueOf'.split(' ')),
  Objects: new Set('equals hash hashCode toString requireNonNull isNull nonNull requireNonNullElse compare'.split(' ')),
  Arrays: new Set('toString sort fill copyOf copyOfRange asList stream equals deepToString binarySearch hashCode setAll'.split(' ')),
  Collections: new Set('sort reverse shuffle max min frequency unmodifiableList emptyList singletonList nCopies swap addAll reverseOrder'.split(' ')),
  List: new Set(['of', 'copyOf']), Set: new Set(['of', 'copyOf']), Map: new Set(['of', 'entry', 'ofEntries', 'copyOf']),
  System: new Set(['currentTimeMillis', 'nanoTime', 'exit', 'arraycopy', 'lineSeparator', 'identityHashCode']),
  IO: new Set(['println', 'print', 'readln']), Thread: new Set(['sleep', 'currentThread']), Optional: new Set(['of', 'ofNullable', 'empty']),
  Stream: new Set(['of', 'iterate', 'generate', 'empty', 'concat']), IntStream: new Set(['range', 'rangeClosed', 'of', 'iterate', 'generate', 'empty', 'concat']),
};

function jsArr(I, v, ln) { if (v instanceof JArray) return v.a; if (v && v.jiter) return [...v.jiter(I)]; I.semErr('expected an array or collection', ln); }

// ---------------- formatting ----------------
function jformat(I, fmt, args) {
  if (fmt === null) I.throwJava('NullPointerException', null);
  let ai = 0;
  return fmt.replace(/%(\d+\$)?([-#+ 0,(]*)(\d+)?(\.\d+)?([a-zA-Z%])/g, (all, pos, flags, width, prec, conv) => {
    if (conv === 'n') return '\n';
    if (conv === '%') return width ? '%'.padStart(+width) : '%';
    let arg;
    if (pos) arg = args[parseInt(pos) - 1];
    else { if (ai >= args.length) I.throwJava('MissingFormatArgumentException', `Format specifier '${all}'`); arg = args[ai++]; }
    let s;
    const p = prec ? parseInt(prec.slice(1)) : null;
    const lc = conv.toLowerCase();
    switch (lc) {
      case 'd': {
        if (arg === null) { s = 'null'; break; }
        if (typeof arg !== 'number') I.throwJava('IllegalFormatConversionException', `d != ${arg instanceof JDouble ? 'java.lang.Double' : typeof arg === 'string' ? 'java.lang.String' : arg instanceof JChar ? 'java.lang.Character' : 'java.lang.Object'}`);
        s = String(Math.abs(arg));
        if (flags.includes(',')) s = groupThousands(s);
        if (arg < 0) s = (flags.includes('(') ? '(' + s + ')' : '-' + s);
        else if (flags.includes('+')) s = '+' + s; else if (flags.includes(' ')) s = ' ' + s;
        if (flags.includes('0') && width && s.length < +width) { const neg = /^[-+ ]/.test(s) ? s[0] : ''; s = neg + s.slice(neg.length).padStart(+width - neg.length, '0'); }
        break;
      }
      case 'f': case 'e': {
        if (arg === null) { s = 'null'; break; }
        if (!(arg instanceof JDouble)) I.throwJava('IllegalFormatConversionException', `${conv} != ${typeof arg === 'number' ? 'java.lang.Integer' : typeof arg === 'string' ? 'java.lang.String' : 'java.lang.Object'}`);
        const x = arg.v; const pp = p === null ? 6 : p;
        if (lc === 'f') { s = fmtFixed(Math.abs(x), pp); if (flags.includes(',')) s = groupThousands(s); }
        else { let t = Math.abs(x).toExponential(pp); t = t.replace(/e([+-])(\d)$/, 'e$10$2'); s = conv === 'E' ? t.toUpperCase() : t; }
        if (x < 0 || Object.is(x, -0)) s = '-' + s; else if (flags.includes('+')) s = '+' + s; else if (flags.includes(' ')) s = ' ' + s;
        if (flags.includes('0') && width && s.length < +width) { const neg = /^[-+ ]/.test(s) ? s[0] : ''; s = neg + s.slice(neg.length).padStart(+width - neg.length, '0'); }
        break;
      }
      case 's': s = I.toStr(arg); if (p !== null) s = s.slice(0, p); break;
      case 'c': s = arg === null ? 'null' : arg instanceof JChar ? String.fromCharCode(arg.c) : typeof arg === 'number' ? String.fromCharCode(arg) : I.throwJava('IllegalFormatConversionException', 'c != ' + I.typeNameOf(arg)); break;
      case 'b': s = arg === null ? 'false' : typeof arg === 'boolean' ? String(arg) : 'true'; break;
      case 'x': if (typeof arg !== 'number') I.throwJava('IllegalFormatConversionException', 'x != ' + I.typeNameOf(arg)); s = (arg >>> 0).toString(16); if (flags.includes('0') && width) s = s.padStart(+width, '0'); break;
      case 'o': s = (arg >>> 0).toString(8); break;
      default: I.throwJava('UnknownFormatConversionException', `Conversion = '${conv}'`);
    }
    if (conv === 'S' || conv === 'X' || conv === 'B') s = s.toUpperCase();
    if (width && s.length < +width) s = flags.includes('-') ? s.padEnd(+width) : s.padStart(+width);
    return s;
  });
}

// ---------------- I/O ----------------
class JPrint {
  constructor(err) { this.err = err; }
  jtype() { return 'PrintStream'; }
  isA(t) { return t === 'PrintStream' || t === 'Object'; }
  str(I, v) { if (v instanceof JArray && v.et.n === 'char' && !v.et.dims) return v.a.map(c => String.fromCharCode(c.c)).join(''); return I.toStr(v); }
  jm(n, args, I, node) {
    switch (n) {
      case 'println': if (args.length > 1) I.noMethodErr(null, n, args, node.ln); I.print((args.length ? this.str(I, args[0]) : '') + '\n', this.err); return undefined;
      case 'print': if (args.length !== 1) I.semErr(`no suitable method found for print(${args.map(a => I.typeNameOf(a)).join(',')})`, node.ln); if (args[0] === undefined) I.semErr("'void' type not allowed here", node.ln); I.print(this.str(I, args[0]), this.err); return undefined;
      case 'printf': case 'format': I.print(jformat(I, args[0], args.slice(1).length === 1 && args[1] instanceof JArray && !PRIMS.has(args[1].et.n) ? args[1].a : args.slice(1)), this.err); return this;
      case 'flush': case 'close': return undefined;
      case 'write': I.print(String.fromCharCode(args[0]), this.err); return undefined;
    }
    I.semErr(`cannot find symbol\n  symbol:   method ${n}\n  location: class PrintStream`, node.ln);
  }
}
const STDIN = { jtype() { return 'InputStream'; }, isA(t) { return t === 'InputStream'; }, jm(n, args, I) { if (n === 'read') { if (I.stdinPos >= I.stdinText.length) return -1; return I.stdinText.charCodeAt(I.stdinPos++); } return undefined; } };
class JScanner {
  constructor(text, isReader) { this.useOwn = text !== null; this.own = text; this.pos = 0; this.isReader = isReader; }
  src(I) { return this.useOwn ? this.own : I.stdinText; }
  getPos(I) { return this.useOwn ? this.pos : I.stdinPos; }
  setPos(I, p) { if (this.useOwn) this.pos = p; else I.stdinPos = p; }
  jtype() { return this.isReader ? 'BufferedReader' : 'Scanner'; }
  isA(t) { return t === this.jtype() || t === 'Object' || t === 'AutoCloseable' || t === 'Closeable'; }
  peekToken(I) {
    const s = this.src(I); let p = this.getPos(I);
    while (p < s.length && /\s/.test(s[p])) p++;
    if (p >= s.length) return null;
    let q = p; while (q < s.length && !/\s/.test(s[q])) q++;
    return { tok: s.slice(p, q), end: q };
  }
  nextToken(I) { const t = this.peekToken(I); if (!t) I.throwJava('NoSuchElementException', null); this.setPos(I, t.end); return t.tok; }
  readLine(I) {
    const s = this.src(I); const p = this.getPos(I);
    if (p >= s.length) return null;
    let q = s.indexOf('\n', p); if (q < 0) q = s.length;
    this.setPos(I, q + 1);
    return s.slice(p, q).replace(/\r$/, '');
  }
  jm(n, args, I, node) {
    switch (n) {
      case 'nextInt': case 'nextLong': case 'nextShort': case 'nextByte': {
        const t = this.peekToken(I); if (!t) I.throwJava('NoSuchElementException', null);
        if (!/^[-+]?\d+$/.test(t.tok)) I.throwJava('InputMismatchException', `For input string: "${t.tok}"`);
        this.setPos(I, t.end); return parseInt(t.tok, 10);
      }
      case 'nextDouble': case 'nextFloat': {
        const t = this.peekToken(I); if (!t) I.throwJava('NoSuchElementException', null);
        if (isNaN(Number(t.tok))) I.throwJava('InputMismatchException', `For input string: "${t.tok}"`);
        this.setPos(I, t.end); return new JDouble(Number(t.tok));
      }
      case 'nextBoolean': { const t = this.nextToken(I); if (!/^(true|false)$/i.test(t)) I.throwJava('InputMismatchException', t); return t.toLowerCase() === 'true'; }
      case 'next': return this.nextToken(I);
      case 'nextLine': { const l = this.readLine(I); if (l === null) I.throwJava('NoSuchElementException', 'No line found'); return l; }
      case 'readLine': return this.readLine(I);
      case 'hasNext': return this.peekToken(I) !== null;
      case 'hasNextInt': case 'hasNextLong': { const t = this.peekToken(I); return !!t && /^[-+]?\d+$/.test(t.tok); }
      case 'hasNextDouble': { const t = this.peekToken(I); return !!t && !isNaN(Number(t.tok)); }
      case 'hasNextLine': return this.getPos(I) < this.src(I).length;
      case 'lines': { const out = []; let l; while ((l = this.readLine(I)) !== null) out.push(l); return new JStream(I, out, 'obj'); }
      case 'close': return undefined;
      case 'ready': return this.getPos(I) < this.src(I).length;
    }
    I.semErr(`cannot find symbol\n  symbol:   method ${n}\n  location: class ${this.jtype()}`, node.ln);
  }
}
class JRandom {
  constructor(seed) {
    this.mask = (1n << 48n) - 1n;
    if (seed === undefined) seed = Math.floor(Math.random() * 2 ** 47);
    this.seed = (BigInt(seed) ^ 0x5DEECE66Dn) & this.mask;
  }
  next(bits) { this.seed = (this.seed * 0x5DEECE66Dn + 0xBn) & this.mask; return Number(BigInt.asIntN(32, this.seed >> BigInt(48 - bits))); }
  nextInt(bound, I) {
    if (bound === undefined) return this.next(32);
    if (bound <= 0) I.throwJava('IllegalArgumentException', 'bound must be positive');
    let r = this.next(31); const m = bound - 1;
    if ((bound & m) === 0) return Number((BigInt(bound) * BigInt(r)) >> 31n);
    for (let u = r; ((u - (r = u % bound) + m) | 0) < 0; u = this.next(31));
    return r;
  }
  jtype() { return 'Random'; }
  isA(t) { return t === 'Random' || t === 'Object'; }
  jm(n, args, I, node) {
    switch (n) {
      case 'nextInt': if (args.length === 2) return args[0] + this.nextInt(args[1] - args[0], I); return this.nextInt(args[0], I);
      case 'nextDouble': return new JDouble(((this.next(26) * 134217728) + this.next(27)) / 9007199254740992);
      case 'nextBoolean': return this.next(1) !== 0;
      case 'nextLong': return this.next(32) * 4294967296 + this.next(32);
      case 'ints': { const self = this; const [cnt, lo, hi] = args; return new JStream(I, (function* () { for (let i = 0; i < cnt; i++) yield lo + self.nextInt(hi - lo, I); })(), 'int'); }
      case 'setSeed': this.seed = (BigInt(args[0]) ^ 0x5DEECE66Dn) & this.mask; return undefined;
    }
    I.semErr(`cannot find symbol\n  symbol:   method ${n}\n  location: class Random`, node.ln);
  }
}
class JSB {
  constructor(s) { this.s = s; }
  jtype() { return 'StringBuilder'; }
  isA(t) { return t === 'StringBuilder' || t === 'StringBuffer' || t === 'CharSequence' || t === 'Object'; }
  toJava() { return this.s; }
  chk(I, i, len) { if (i < 0 || i >= len) I.throwJava('StringIndexOutOfBoundsException', `index ${i},length ${len}`); }
  jm(n, args, I, node) {
    const a0 = args[0];
    switch (n) {
      case 'append': this.s += (a0 instanceof JArray && a0.et.n === 'char') ? a0.a.map(c => String.fromCharCode(c.c)).join('') : I.toStr(a0); return this;
      case 'toString': return this.s;
      case 'length': return this.s.length;
      case 'reverse': this.s = [...this.s].reverse().join(''); return this;
      case 'insert': if (a0 < 0 || a0 > this.s.length) I.throwJava('StringIndexOutOfBoundsException', `offset ${a0}, length ${this.s.length}`); this.s = this.s.slice(0, a0) + I.toStr(args[1]) + this.s.slice(a0); return this;
      case 'charAt': this.chk(I, a0, this.s.length); return jchar(this.s.charCodeAt(a0));
      case 'setCharAt': this.chk(I, a0, this.s.length); this.s = this.s.slice(0, a0) + I.toStr(args[1]) + this.s.slice(a0 + 1); return undefined;
      case 'deleteCharAt': this.chk(I, a0, this.s.length); this.s = this.s.slice(0, a0) + this.s.slice(a0 + 1); return this;
      case 'delete': { const e = Math.min(args[1], this.s.length); this.s = this.s.slice(0, a0) + this.s.slice(e); return this; }
      case 'replace': this.s = this.s.slice(0, a0) + args[2] + this.s.slice(Math.min(args[1], this.s.length)); return this;
      case 'indexOf': return this.s.indexOf(a0, args[1] || 0);
      case 'lastIndexOf': return this.s.lastIndexOf(a0);
      case 'setLength': this.s = a0 <= this.s.length ? this.s.slice(0, a0) : this.s + '\0'.repeat(a0 - this.s.length); return undefined;
      case 'isEmpty': return this.s.length === 0;
      case 'substring': return I.strMethod(this.s, 'substring', args, node);
      case 'chars': return I.strMethod(this.s, 'chars', args, node);
      case 'equals': return this === a0;
      case 'hashCode': return parseInt(I.identityHash(this), 16);
      case 'compareTo': return I.compare(this.s, a0.s);
      case 'capacity': return Math.max(16, this.s.length);
    }
    I.semErr(`cannot find symbol\n  symbol:   method ${n}\n  location: class StringBuilder`, node.ln);
  }
}

// ---------------- collections ----------------
function tableSizeFor(c) { let n = 1; while (n < c) n *= 2; return Math.max(1, n); }
class JMap {
  constructor(kind, cmp) { this.kind = kind; this.cmp = cmp || null; this.buckets = new Map(); this.size = 0; this.seq = 0; this.cap = 16; this.imm = false; this.modCount = 0; }
  jtype() { return this.kind; }
  isA(t) { return t === this.kind || t === 'Map' || t === 'Object' || (this.kind === 'TreeMap' && (t === 'SortedMap' || t === 'NavigableMap' || t === 'SequencedMap')) || (this.kind === 'LinkedHashMap' && (t === 'HashMap' || t === 'SequencedMap')) || (this.kind === 'ConcurrentHashMap'); }
  find(I, k) {
    const key = I.keyOf(k); const b = this.buckets.get(key);
    if (!b) return null;
    if (key[0] !== 'h') return b[0];
    return b.find(e => I.jequals(e.k, k)) || null;
  }
  checkKey(I, k) { if (this.kind === 'TreeMap') { if (k === null && !this.cmp) I.throwJava('NullPointerException', null); if (this.size === 0 && !this.cmp) I.compare(k, k); } }
  put(I, k, v) {
    if (this.imm) I.throwJava('UnsupportedOperationException', null);
    this.checkKey(I, k);
    const key = I.keyOf(k); let b = this.buckets.get(key);
    if (b) { const e = key[0] === 'h' ? b.find(x => I.jequals(x.k, k)) : b[0]; if (e) { const old = e.v; e.v = v; return old; } }
    else { b = []; this.buckets.set(key, b); }
    if (this.kind === 'TreeMap' && this.size > 0) { const any = this.entries(I)[0]; this.cmp ? I.callFn(this.cmp, [k, any.k]) : I.compare(k, any.k); }
    b.push({ k, v, seq: this.seq++, h: I.jhash(k) }); this.size++; this.modCount++;
    if (this.size > this.cap * 0.75) this.cap *= 2;
    return null;
  }
  remove(I, k) {
    if (this.imm) I.throwJava('UnsupportedOperationException', null);
    const key = I.keyOf(k); const b = this.buckets.get(key); if (!b) return null;
    const idx = key[0] === 'h' ? b.findIndex(x => I.jequals(x.k, k)) : 0;
    if (idx < 0) return null;
    const [e] = b.splice(idx, 1); if (!b.length) this.buckets.delete(key);
    this.size--; this.modCount++;
    return e.v;
  }
  entries(I) {
    const all = []; for (const b of this.buckets.values()) for (const e of b) all.push(e);
    if (this.kind === 'LinkedHashMap' || this.kind === 'ImmutableMap') all.sort((a, b) => a.seq - b.seq);
    else if (this.kind === 'TreeMap') all.sort((a, b) => this.cmp ? I.num(I.callFn(this.cmp, [a.k, b.k])) : I.compare(a.k, b.k));
    else { const m = this.cap - 1; const ix = e => (e.h ^ (e.h >>> 16)) & m; all.sort((a, b) => ix(a) - ix(b) || a.seq - b.seq); }
    return all;
  }
  toJava(I) { return '{' + this.entries(I).map(e => (e.k === this ? '(this Map)' : I.toStr(e.k)) + '=' + (e.v === this ? '(this Map)' : I.toStr(e.v))).join(', ') + '}'; }
  jequals(o, I) { if (!(o instanceof JMap) || o.size !== this.size) return false; return this.entries(I).every(e => { const f = o.find(I, e.k); return f && I.jequals(e.v, f.v); }); }
  jhash(I) { let h = 0; for (const e of this.entries(I)) h = (h + (I.jhash(e.k) ^ I.jhash(e.v))) | 0; return h; }
  keyOf(I) { return 'm{' + this.entries(I).map(e => I.keyOf(e.k) + '=' + I.keyOf(e.v)).join(',') + '}'; }
  view(I, items, kind) { const l = new JList(items, 'View', 1); l.src = this; l.mc0 = this.modCount; l.setLike = kind !== 'values'; return l; }
  jm(n, args, I, node) {
    const [a, b, c] = args;
    switch (n) {
      case 'put': return this.put(I, a, b);
      case 'get': { const e = this.find(I, a); return e ? e.v : null; }
      case 'getOrDefault': { const e = this.find(I, a); return e ? e.v : b; }
      case 'containsKey': return !!this.find(I, a);
      case 'containsValue': return this.entries(I).some(e => I.jequals(e.v, a));
      case 'remove': if (args.length === 2) { const e = this.find(I, a); if (e && I.jequals(e.v, b)) { this.remove(I, a); return true; } return false; } return this.remove(I, a);
      case 'size': return this.size;
      case 'isEmpty': return this.size === 0;
      case 'clear': if (this.imm) I.throwJava('UnsupportedOperationException', null); this.buckets.clear(); this.size = 0; this.modCount++; return undefined;
      case 'keySet': case 'navigableKeySet': case 'sequencedKeySet': return this.view(I, this.entries(I).map(e => e.k), 'keys');
      case 'values': case 'sequencedValues': return this.view(I, this.entries(I).map(e => e.v), 'values');
      case 'entrySet': case 'sequencedEntrySet': return this.view(I, this.entries(I).map(e => new JEntry(e.k, e.v, this, e)), 'entries');
      case 'putIfAbsent': { const e = this.find(I, a); if (e && e.v !== null) return e.v; this.put(I, a, b); return null; }
      case 'putAll': for (const e of a.entries(I)) this.put(I, e.k, e.v); return undefined;
      case 'merge': { const e = this.find(I, a); if (!e || e.v === null) { this.put(I, a, b); return b; } const nv = I.callFn(c, [e.v, b]); if (nv === null) { this.remove(I, a); return null; } e.v = nv; return nv; }
      case 'computeIfAbsent': { const e = this.find(I, a); if (e && e.v !== null) return e.v; const nv = I.callFn(b, [a]); if (nv !== null) this.put(I, a, nv); return nv; }
      case 'computeIfPresent': { const e = this.find(I, a); if (!e || e.v === null) return null; const nv = I.callFn(b, [a, e.v]); if (nv === null) this.remove(I, a); else e.v = nv; return nv; }
      case 'compute': { const e = this.find(I, a); const nv = I.callFn(b, [a, e ? e.v : null]); if (nv === null) { if (e) this.remove(I, a); } else if (e) e.v = nv; else this.put(I, a, nv); return nv; }
      case 'replace': { const e = this.find(I, a); if (!e) return null; const old = e.v; e.v = b; return old; }
      case 'replaceAll': for (const e of this.entries(I)) e.v = I.callFn(a, [e.k, e.v]); return undefined;
      case 'forEach': { const mc = this.modCount; for (const e of this.entries(I)) { I.callFn(a, [e.k, e.v]); if (this.modCount !== mc) I.throwJava('ConcurrentModificationException', null); } return undefined; }
      case 'toString': return this.toJava(I);
      case 'equals': return this.jequals(a, I);
      case 'hashCode': return this.jhash(I);
    }
    if (this.kind === 'TreeMap' || this.kind === 'LinkedHashMap') {
      const es = this.entries(I);
      const mk = (e) => e ? new JEntry(e.k, e.v, this, e) : null;
      const cmp = (x, y) => this.cmp ? I.num(I.callFn(this.cmp, [x, y])) : I.compare(x, y);
      switch (n) {
        case 'firstKey': if (!es.length) I.throwJava('NoSuchElementException', null); return es[0].k;
        case 'lastKey': if (!es.length) I.throwJava('NoSuchElementException', null); return es[es.length - 1].k;
        case 'firstEntry': return mk(es[0]);
        case 'lastEntry': return mk(es[es.length - 1]);
        case 'pollFirstEntry': { const e = es[0]; if (e) this.remove(I, e.k); return mk(e); }
        case 'pollLastEntry': { const e = es[es.length - 1]; if (e) this.remove(I, e.k); return mk(e); }
        case 'floorKey': { let r = null; for (const e of es) if (cmp(e.k, a) <= 0) r = e.k; return r; }
        case 'ceilingKey': { for (const e of es) if (cmp(e.k, a) >= 0) return e.k; return null; }
        case 'lowerKey': { let r = null; for (const e of es) if (cmp(e.k, a) < 0) r = e.k; return r; }
        case 'higherKey': { for (const e of es) if (cmp(e.k, a) > 0) return e.k; return null; }
        case 'headMap': { const m = new JMap('TreeMap', this.cmp); for (const e of es) if (cmp(e.k, a) < 0 || (b === true && cmp(e.k, a) === 0)) m.put(I, e.k, e.v); return m; }
        case 'tailMap': { const m = new JMap('TreeMap', this.cmp); for (const e of es) if (cmp(e.k, a) > 0 || (b !== false && cmp(e.k, a) === 0)) m.put(I, e.k, e.v); return m; }
        case 'descendingMap': case 'reversed': { const m = new JMap('LinkedHashMap'); for (const e of es.reverse()) m.put(I, e.k, e.v); return m; }
        case 'descendingKeySet': return this.view(I, es.reverse().map(e => e.k), 'keys');
      }
    }
    I.semErr(`cannot find symbol\n  symbol:   method ${n}(${args.map(x => I.typeNameOf(x)).join(',')})\n  location: interface Map`, node.ln);
  }
}
class JEntry {
  constructor(k, v, map, raw) { this.k = k; this.v = v; this.map = map; this.raw = raw; }
  jtype() { return 'Map.Entry'; }
  isA(t) { return t === 'Map.Entry' || t === 'Entry' || t === 'Object'; }
  toJava(I) { return I.toStr(this.k) + '=' + I.toStr(this.v); }
  jequals(o, I) { return o instanceof JEntry && I.jequals(this.k, o.k) && I.jequals(this.v, o.v); }
  jhash(I) { return I.jhash(this.k) ^ I.jhash(this.v); }
  keyOf(I) { return 'E' + I.keyOf(this.k) + '=' + I.keyOf(this.v); }
  jm(n, args, I, node) {
    switch (n) {
      case 'getKey': case 'key': return this.k;
      case 'getValue': case 'value': return this.v;
      case 'setValue': { if (!this.map) I.throwJava('UnsupportedOperationException', null); const old = this.v; this.v = args[0]; if (this.raw) this.raw.v = args[0]; return old; }
      case 'toString': return this.toJava(I);
      case 'equals': return this.jequals(args[0], I);
      case 'hashCode': return this.jhash(I);
    }
    I.semErr(`cannot find symbol\n  symbol:   method ${n}\n  location: interface Map.Entry`, node.ln);
  }
}
class JList {
  constructor(a, kind, imm) { this.a = a || []; this.kind = kind || 'ArrayList'; this.imm = imm || 0; this.modCount = 0; }
  jtype() { return this.kind === 'View' ? (this.setLike ? 'Set' : 'Collection') : this.kind === 'ImmutableList' ? 'List' : this.kind; }
  isA(t) {
    if (t === 'Object' || t === 'Collection' || t === 'Iterable' || t === 'SequencedCollection') return true;
    if (this.kind === 'View') return this.setLike ? t === 'Set' : false;
    if (t === 'List') return this.kind !== 'ArrayDeque' && this.kind !== 'PriorityQueue';
    if (t === this.kind) return true;
    if ((t === 'Queue' || t === 'Deque') && (this.kind === 'LinkedList' || this.kind === 'ArrayDeque')) return true;
    if ((t === 'Vector') && this.kind === 'Stack') return true;
    return false;
  }
  mut(I, structural) {
    if (this.imm === 1 || (this.imm === 2 && structural)) I.throwJava('UnsupportedOperationException', null);
    if (structural) this.modCount++;
  }
  idx(I, i, size) { if (typeof i !== 'number') I.semErr(`incompatible types: ${I.typeNameOf(i)} cannot be converted to int`, I.ln); if (i < 0 || i >= size) I.throwJava('IndexOutOfBoundsException', `Index ${i} out of bounds for length ${size}`); }
  toJava(I) { return '[' + this.a.map(x => x === this ? '(this Collection)' : I.toStr(x)).join(', ') + ']'; }
  jequals(o, I) { if (!(o instanceof JList)) return false; if (this.setLike || o.setLike) { return o.a.length === this.a.length && this.a.every(x => o.a.some(y => I.jequals(x, y))); } return o.a.length === this.a.length && this.a.every((x, i) => I.jequals(x, o.a[i])); }
  jhash(I) { let h = 1; for (const x of this.a) h = (Math.imul(31, h) + I.jhash(x)) | 0; return h; }
  keyOf(I) { return 'l[' + this.a.map(x => I.keyOf(x)).join(',') + ']'; }
  *jiter(I) {
    let cursor = 0; const mc = this.modCount; const src = this.src;
    while (cursor !== this.a.length) {
      if (this.modCount !== mc || (src && src.modCount !== this.mc0)) I.throwJava('ConcurrentModificationException', null);
      if (cursor > this.a.length) I.throwJava('ConcurrentModificationException', null);
      yield this.a[cursor++];
    }
  }
  jm(n, args, I, node) {
    const a = this.a; const [x, y] = args;
    const isStack = this.kind === 'Stack';
    switch (n) {
      case 'add': case 'addLast': case 'offer': case 'offerLast':
        this.mut(I, true);
        if (args.length === 2) { if (x < 0 || x > a.length) I.throwJava('IndexOutOfBoundsException', `Index: ${x}, Size: ${a.length}`); a.splice(x, 0, y); return undefined; }
        if (this.kind === 'ArrayDeque' && x === null) I.throwJava('NullPointerException', null);
        a.push(x); return n === 'addLast' ? undefined : true;
      case 'addFirst': case 'offerFirst': this.mut(I, true); a.unshift(x); return n === 'offerFirst' ? true : undefined;
      case 'push': this.mut(I, true); if (isStack) { a.push(x); return x; } a.unshift(x); return undefined;
      case 'pop': this.mut(I, true); if (!a.length) I.throwJava(isStack ? 'EmptyStackException' : 'NoSuchElementException', null); return isStack ? a.pop() : a.shift();
      case 'peek': if (isStack) { if (!a.length) I.throwJava('EmptyStackException', null); return a[a.length - 1]; } return a.length ? a[0] : null;
      case 'peekFirst': return a.length ? a[0] : null;
      case 'peekLast': return a.length ? a[a.length - 1] : null;
      case 'poll': case 'pollFirst': this.mut(I, true); return a.length ? a.shift() : null;
      case 'pollLast': this.mut(I, true); return a.length ? a.pop() : null;
      case 'element': case 'getFirst': case 'firstElement': if (!a.length) I.throwJava('NoSuchElementException', null); return a[0];
      case 'getLast': case 'lastElement': if (!a.length) I.throwJava('NoSuchElementException', null); return a[a.length - 1];
      case 'removeFirst': this.mut(I, true); if (!a.length) I.throwJava('NoSuchElementException', null); return a.shift();
      case 'removeLast': this.mut(I, true); if (!a.length) I.throwJava('NoSuchElementException', null); return a.pop();
      case 'empty': return a.length === 0;
      case 'search': { const i = a.lastIndexOf(x); for (let k = a.length - 1; k >= 0; k--) if (I.jequals(a[k], x)) return a.length - k; return -1; }
      case 'get': this.idx(I, x, a.length); return a[x];
      case 'set': this.mut(I, false); this.idx(I, x, a.length); { const old = a[x]; a[x] = y; return old; }
      case 'size': return a.length;
      case 'isEmpty': return a.length === 0;
      case 'contains': return a.some(e => I.jequals(e, x));
      case 'indexOf': return a.findIndex(e => I.jequals(e, x));
      case 'lastIndexOf': for (let k = a.length - 1; k >= 0; k--) if (I.jequals(a[k], x)) return k; return -1;
      case 'remove':
        if (args.length === 0) { this.mut(I, true); if (!a.length) I.throwJava('NoSuchElementException', null); return a.shift(); }
        this.mut(I, true);
        if (typeof x === 'number' && this.kind !== 'ArrayDeque' && this.kind !== 'View' && !I._boxedArg) { this.idx(I, x, a.length); return a.splice(x, 1)[0]; }
        { const i = a.findIndex(e => I.jequals(e, x)); if (i >= 0) { a.splice(i, 1); return true; } this.modCount--; return false; }
      case 'clear': this.mut(I, true); a.length = 0; return undefined;
      case 'addAll': this.mut(I, true); if (args.length === 2) { a.splice(x, 0, ...jsArr(I, y)); return true; } { const items = jsArr(I, x); a.push(...items); return items.length > 0; }
      case 'removeAll': { this.mut(I, true); const rm = jsArr(I, x); const before = a.length; this.a = a.filter(e => !rm.some(r => I.jequals(e, r))); return this.a.length !== before; }
      case 'retainAll': { this.mut(I, true); const keep = jsArr(I, x); const before = a.length; this.a = a.filter(e => keep.some(r => I.jequals(e, r))); return this.a.length !== before; }
      case 'containsAll': return jsArr(I, x).every(r => a.some(e => I.jequals(e, r)));
      case 'removeIf': { this.mut(I, true); const before = a.length; this.a = a.filter(e => !I.truthy(I.callFn(x, [e]))); return this.a.length !== before; }
      case 'replaceAll': this.mut(I, false); for (let k = 0; k < a.length; k++) a[k] = I.callFn(x, [a[k]]); return undefined;
      case 'forEach': { const mc = this.modCount; for (const e of a.slice()) { I.callFn(x, [e]); if (this.modCount !== mc) I.throwJava('ConcurrentModificationException', null); } return undefined; }
      case 'sort': this.mut(I, false); { const cmp = x; a.sort((p, q) => cmp === null || cmp === undefined ? I.compare(p, q) : I.num(I.callFn(cmp, [p, q]))); this.modCount++; } return undefined;
      case 'stream': case 'parallelStream': return new JStream(I, a.slice(), 'obj');
      case 'iterator': case 'listIterator': return new JIterator(this, I);
      case 'descendingIterator': { const it = new JIterator(new JList(a.slice().reverse()), I); return it; }
      case 'toArray': return new JArray(T_OBJ, a.slice());
      case 'subList': if (x < 0 || y > a.length || x > y) I.throwJava('IndexOutOfBoundsException', `fromIndex: ${x}, toIndex: ${y}, size: ${a.length}`); return new JList(a.slice(x, y), 'ArrayList');
      case 'reversed': return new JList(a.slice().reverse(), this.kind === 'View' ? 'ArrayList' : this.kind, this.imm);
      case 'toString': return this.toJava(I);
      case 'equals': return this.jequals(x, I);
      case 'hashCode': return this.jhash(I);
      case 'ensureCapacity': case 'trimToSize': return undefined;
    }
    I.semErr(`cannot find symbol\n  symbol:   method ${n}(${args.map(v => I.typeNameOf(v)).join(',')})\n  location: class ${this.jtype()}`, node.ln);
  }
}
class JIterator {
  constructor(list, I) { this.list = list; this.cursor = 0; this.last = -1; this.mc = list.modCount; }
  jtype() { return 'Iterator'; }
  isA(t) { return t === 'Iterator' || t === 'ListIterator' || t === 'Object'; }
  jm(n, args, I) {
    const l = this.list;
    switch (n) {
      case 'hasNext': return this.cursor !== l.a.length;
      case 'next': if (l.modCount !== this.mc) I.throwJava('ConcurrentModificationException', null); if (this.cursor >= l.a.length) I.throwJava('NoSuchElementException', null); this.last = this.cursor; return l.a[this.cursor++];
      case 'remove': if (this.last < 0) I.throwJava('IllegalStateException', null); l.a.splice(this.last, 1); this.cursor = this.last; this.last = -1; l.modCount++; this.mc = l.modCount; if (l.src) { l.src.remove(I, l.a[this.cursor]); } return undefined;
      case 'forEachRemaining': while (this.cursor < l.a.length) I.callFn(args[0], [l.a[this.cursor++]]); return undefined;
    }
    I.semErr(`cannot find symbol\n  symbol: method ${n}`, I.ln);
  }
}
class JSet {
  constructor(kind, cmp) { this.kind = kind; const mk = kind === 'TreeSet' ? 'TreeMap' : kind === 'LinkedHashSet' ? 'LinkedHashMap' : kind === 'ImmutableSet' ? 'ImmutableMap' : 'HashMap'; this.m = new JMap(mk, cmp); this.imm = false; }
  get modCount() { return this.m.modCount; }
  jtype() { return this.kind === 'ImmutableSet' ? 'Set' : this.kind; }
  isA(t) { return t === 'Set' || t === 'Collection' || t === 'Iterable' || t === 'Object' || t === this.kind || (this.kind === 'TreeSet' && (t === 'SortedSet' || t === 'NavigableSet')) || (this.kind === 'LinkedHashSet' && t === 'HashSet'); }
  items(I) { return this.m.entries(I).map(e => e.k); }
  add(I, x) { if (this.imm) I.throwJava('UnsupportedOperationException', null); if (this.m.find(I, x)) return false; this.m.put(I, x, true); return true; }
  toJava(I) { return '[' + this.items(I).map(x => I.toStr(x)).join(', ') + ']'; }
  jequals(o, I) { if (!(o && (o instanceof JSet || (o instanceof JList && o.setLike)))) return false; const oi = o instanceof JSet ? o.items(I) : o.a; const mine = this.items(I); return oi.length === mine.length && oi.every(x => this.m.find(I, x)); }
  jhash(I) { let h = 0; for (const x of this.items(I)) h = (h + I.jhash(x)) | 0; return h; }
  keyOf(I) { return 'S{' + this.items(I).map(x => I.keyOf(x)).sort().join(',') + '}'; }
  *jiter(I) { const mc = this.m.modCount; for (const x of this.items(I)) { if (this.m.modCount !== mc) I.throwJava('ConcurrentModificationException', null); yield x; } }
  jm(n, args, I, node) {
    const [x] = args;
    switch (n) {
      case 'add': return this.add(I, x);
      case 'contains': return !!this.m.find(I, x);
      case 'remove': if (this.imm) I.throwJava('UnsupportedOperationException', null); return this.m.find(I, x) ? (this.m.remove(I, x), true) : false;
      case 'size': return this.m.size;
      case 'isEmpty': return this.m.size === 0;
      case 'clear': if (this.imm) I.throwJava('UnsupportedOperationException', null); this.m.jm('clear', [], I, node); return undefined;
      case 'addAll': { let ch = false; for (const e of jsArr(I, x)) ch = this.add(I, e) || ch; return ch; }
      case 'removeAll': { let ch = false; for (const e of jsArr(I, x)) if (this.m.find(I, e)) { this.m.remove(I, e); ch = true; } return ch; }
      case 'retainAll': { const keep = jsArr(I, x); let ch = false; for (const e of this.items(I)) if (!keep.some(k => I.jequals(k, e))) { this.m.remove(I, e); ch = true; } return ch; }
      case 'containsAll': return jsArr(I, x).every(e => this.m.find(I, e));
      case 'removeIf': { let ch = false; for (const e of this.items(I)) if (I.truthy(I.callFn(x, [e]))) { this.m.remove(I, e); ch = true; } return ch; }
      case 'forEach': for (const e of this.items(I)) I.callFn(x, [e]); return undefined;
      case 'stream': return new JStream(I, this.items(I), 'obj');
      case 'iterator': { const l = new JList(this.items(I)); const it = new JIterator(l, I); const self = this; const orig = it.jm.bind(it); it.jm = (nn, aa, II) => { if (nn === 'remove') { const v = l.a[it.last]; self.m.remove(II, v); } return orig(nn, aa, II); }; return it; }
      case 'toArray': return new JArray(T_OBJ, this.items(I));
      case 'toString': return this.toJava(I);
      case 'equals': return this.jequals(x, I);
      case 'hashCode': return this.jhash(I);
    }
    if (this.kind === 'TreeSet' || this.kind === 'LinkedHashSet') {
      const it = this.items(I);
      const cmp = (p, q) => this.m.cmp ? I.num(I.callFn(this.m.cmp, [p, q])) : I.compare(p, q);
      switch (n) {
        case 'first': case 'getFirst': if (!it.length) I.throwJava('NoSuchElementException', null); return it[0];
        case 'last': case 'getLast': if (!it.length) I.throwJava('NoSuchElementException', null); return it[it.length - 1];
        case 'pollFirst': if (!it.length) return null; this.m.remove(I, it[0]); return it[0];
        case 'pollLast': if (!it.length) return null; this.m.remove(I, it[it.length - 1]); return it[it.length - 1];
        case 'floor': { let r = null; for (const e of it) if (cmp(e, x) <= 0) r = e; return r; }
        case 'ceiling': { for (const e of it) if (cmp(e, x) >= 0) return e; return null; }
        case 'lower': { let r = null; for (const e of it) if (cmp(e, x) < 0) r = e; return r; }
        case 'higher': { for (const e of it) if (cmp(e, x) > 0) return e; return null; }
        case 'headSet': { const s = new JSet('TreeSet', this.m.cmp); for (const e of it) if (cmp(e, x) < 0) s.add(I, e); return s; }
        case 'tailSet': { const s = new JSet('TreeSet', this.m.cmp); for (const e of it) if (cmp(e, x) >= 0) s.add(I, e); return s; }
        case 'subSet': { const s = new JSet('TreeSet', this.m.cmp); for (const e of it) if (cmp(e, x) >= 0 && cmp(e, args[1]) < 0) s.add(I, e); return s; }
        case 'descendingSet': case 'reversed': { const s = new JSet('LinkedHashSet'); for (const e of it.reverse()) s.add(I, e); return s; }
      }
    }
    I.semErr(`cannot find symbol\n  symbol:   method ${n}(${args.map(v => I.typeNameOf(v)).join(',')})\n  location: class ${this.jtype()}`, node.ln);
  }
}
class JPQ {
  constructor(cmp) { this.q = []; this.cmp = cmp || null; this.modCount = 0; }
  jtype() { return 'PriorityQueue'; }
  isA(t) { return t === 'PriorityQueue' || t === 'Queue' || t === 'Collection' || t === 'Iterable' || t === 'Object'; }
  c(I, a, b) { return this.cmp ? I.num(I.callFn(this.cmp, [a, b])) : I.compare(a, b); }
  offer(I, x) {
    if (x === null) I.throwJava('NullPointerException', null);
    if (!this.q.length && !this.cmp) I.compare(x, x);
    let k = this.q.length; this.q.push(x);
    while (k > 0) { const p = (k - 1) >>> 1; const e = this.q[p]; if (this.c(I, x, e) >= 0) break; this.q[k] = e; k = p; }
    this.q[k] = x; this.modCount++;
  }
  poll(I) {
    const q = this.q; if (!q.length) return null;
    const res = q[0]; const x = q.pop(); const n = q.length;
    if (n) {
      let k = 0; const half = n >>> 1;
      while (k < half) {
        let ch = 2 * k + 1, cv = q[ch]; const r = ch + 1;
        if (r < n && this.c(I, cv, q[r]) > 0) cv = q[ch = r];
        if (this.c(I, x, cv) <= 0) break;
        q[k] = cv; k = ch;
      }
      q[k] = x;
    }
    this.modCount++;
    return res;
  }
  toJava(I) { return '[' + this.q.map(x => I.toStr(x)).join(', ') + ']'; }
  *jiter(I) { yield* this.q.slice(); }
  jm(n, args, I, node) {
    switch (n) {
      case 'add': case 'offer': this.offer(I, args[0]); return true;
      case 'poll': return this.poll(I);
      case 'remove': if (!args.length) { if (!this.q.length) I.throwJava('NoSuchElementException', null); return this.poll(I); }
        { const i = this.q.findIndex(e => I.jequals(e, args[0])); if (i < 0) return false; const rest = this.q.filter((_, k) => k !== i); this.q = []; rest.forEach(e => this.offer(I, e)); return true; }
      case 'peek': return this.q.length ? this.q[0] : null;
      case 'element': if (!this.q.length) I.throwJava('NoSuchElementException', null); return this.q[0];
      case 'size': return this.q.length;
      case 'isEmpty': return this.q.length === 0;
      case 'clear': this.q = []; return undefined;
      case 'contains': return this.q.some(e => I.jequals(e, args[0]));
      case 'addAll': for (const e of jsArr(I, args[0])) this.offer(I, e); return true;
      case 'stream': return new JStream(I, this.q.slice(), 'obj');
      case 'toString': return this.toJava(I);
      case 'forEach': for (const e of this.q.slice()) I.callFn(args[0], [e]); return undefined;
      case 'toArray': return new JArray(T_OBJ, this.q.slice());
    }
    I.semErr(`cannot find symbol\n  symbol:   method ${n}\n  location: class PriorityQueue`, node.ln);
  }
}
class JOptional {
  constructor(has, v, kind) { this.has = has; this.v = v; this.kind = kind || 'obj'; }
  jtype() { return { obj: 'Optional', int: 'OptionalInt', double: 'OptionalDouble', long: 'OptionalLong' }[this.kind]; }
  isA(t) { return t === this.jtype() || t === 'Object'; }
  toJava(I) { const nm = this.jtype(); return this.has ? `${nm}[${I.toStr(this.v)}]` : `${nm}.empty`; }
  jequals(o, I) { return o instanceof JOptional && o.has === this.has && (!this.has || I.jequals(this.v, o.v)); }
  jm(n, args, I, node) {
    const nse = () => I.throwJava('NoSuchElementException', 'No value present');
    switch (n) {
      case 'isPresent': return this.has;
      case 'isEmpty': return !this.has;
      case 'get': case 'getAsInt': case 'getAsDouble': case 'getAsLong': case 'orElseThrow':
        if (!this.has) { if (n === 'orElseThrow' && args.length) throw new JavaThrow(I.callFn(args[0], [])); nse(); } return this.v;
      case 'orElse': return this.has ? this.v : args[0];
      case 'orElseGet': return this.has ? this.v : I.callFn(args[0], []);
      case 'ifPresent': if (this.has) I.callFn(args[0], [this.v]); return undefined;
      case 'ifPresentOrElse': if (this.has) I.callFn(args[0], [this.v]); else I.callFn(args[1], []); return undefined;
      case 'map': if (!this.has) return this; { const r = I.callFn(args[0], [this.v]); return r === null ? new JOptional(false, null) : new JOptional(true, r); }
      case 'flatMap': return this.has ? I.callFn(args[0], [this.v]) : this;
      case 'filter': return this.has && I.truthy(I.callFn(args[0], [this.v])) ? this : new JOptional(false, null, this.kind);
      case 'or': return this.has ? this : I.callFn(args[0], []);
      case 'stream': return new JStream(I, this.has ? [this.v] : [], this.kind);
      case 'toString': return this.toJava(I);
      case 'equals': return this.jequals(args[0], I);
    }
    I.semErr(`cannot find symbol\n  symbol:   method ${n}\n  location: class ${this.jtype()}`, node.ln);
  }
}
class JStats {
  constructor(kind) { this.kind = kind; this.count = 0; this.sum = 0; this.min = Infinity; this.max = -Infinity; }
  add(x) { this.count++; this.sum += x; this.min = Math.min(this.min, x); this.max = Math.max(this.max, x); }
  jtype() { return this.kind === 'int' ? 'IntSummaryStatistics' : 'DoubleSummaryStatistics'; }
  wrap(x) { return this.kind === 'int' ? x : new JDouble(x); }
  toJava() {
    const avg = this.count ? this.sum / this.count : 0;
    if (this.kind === 'int') return `IntSummaryStatistics{count=${this.count}, sum=${this.sum}, min=${this.count ? this.min : 2147483647}, average=${fmtFixed(avg, 6)}, max=${this.count ? this.max : -2147483648}}`;
    return `DoubleSummaryStatistics{count=${this.count}, sum=${fmtFixed(this.sum, 6)}, min=${fmtFixed(this.min, 6)}, average=${fmtFixed(avg, 6)}, max=${fmtFixed(this.max, 6)}}`;
  }
  jm(n, args, I, node) {
    switch (n) {
      case 'getCount': return this.count;
      case 'getSum': return this.wrap(this.sum);
      case 'getMin': return this.count ? this.wrap(this.min) : (this.kind === 'int' ? 2147483647 : new JDouble(Infinity));
      case 'getMax': return this.count ? this.wrap(this.max) : (this.kind === 'int' ? -2147483648 : new JDouble(-Infinity));
      case 'getAverage': return new JDouble(this.count ? this.sum / this.count : 0);
      case 'accept': this.add(I.num(args[0])); return undefined;
      case 'toString': return this.toJava();
    }
    I.semErr(`cannot find symbol: method ${n}`, node.ln);
  }
}

// ---------------- streams ----------------
class JStream {
  constructor(I, src, kind) { this.I = I; this.src = src; this.kind = kind || 'obj'; this.used = false; }
  jtype() { return { obj: 'Stream', int: 'IntStream', double: 'DoubleStream', long: 'LongStream' }[this.kind]; }
  isA(t) { return t === this.jtype() || t === 'BaseStream' || t === 'Object' || t === 'AutoCloseable'; }
  take() {
    if (this.used) this.I.throwJava('IllegalStateException', 'stream has already been operated upon or closed');
    this.used = true;
    return this.src[Symbol.iterator] ? this.src[Symbol.iterator]() : this.src;
  }
  wrapK(v) { if (this.kind === 'double') return v instanceof JDouble ? v : new JDouble(this.I.num(v)); if (this.kind === 'int' || this.kind === 'long') return v instanceof JChar ? v.c : v; return v; }
  toJava(I) { return 'java.util.stream.ReferencePipeline@' + I.identityHash(this); }
  jm(n, args, I, node) {
    const f = args[0];
    const K = this.kind;
    const mk = (gen, kind) => new JStream(I, gen, kind || K);
    switch (n) {
      // ----- intermediate -----
      case 'filter': { const it = this.take(); return mk((function* () { for (const x of it) if (I.truthy(I.callFn(f, [x]))) yield x; })()); }
      case 'map': { const it = this.take(); const self = this; return mk((function* () { for (const x of it) yield self.wrapK(I.callFn(f, [x])); })()); }
      case 'mapToInt': case 'mapToLong': { const it = this.take(); return mk((function* () { for (const x of it) { const r = I.callFn(f, [x]); if (r instanceof JDouble) I.semErr('incompatible types: bad return type in lambda expression\n    possible lossy conversion from double to int', node.ln); yield r instanceof JChar ? r.c : r; } })(), n === 'mapToInt' ? 'int' : 'long'); }
      case 'mapToDouble': case 'asDoubleStream': { const it = this.take(); return mk((function* () { for (const x of it) { const r = n === 'asDoubleStream' ? x : I.callFn(f, [x]); yield r instanceof JDouble ? r : new JDouble(I.num(r)); } })(), 'double'); }
      case 'mapToObj': { const it = this.take(); return mk((function* () { for (const x of it) yield I.callFn(f, [x]); })(), 'obj'); }
      case 'boxed': { const it = this.take(); return mk(it, 'obj'); }
      case 'asLongStream': { const it = this.take(); return mk(it, 'long'); }
      case 'flatMap': { const it = this.take(); return mk((function* () { for (const x of it) { const s = I.callFn(f, [x]); if (s instanceof JStream) yield* s.take(); else yield* jsArr(I, s); } })()); }
      case 'mapMulti': { const it = this.take(); return mk((function* () { for (const x of it) { const buf = []; I.callFn(f, [x, new JFunc(a => { buf.push(a[0]); })]); yield* buf; } })(), 'obj'); }
      case 'sorted': { const it = this.take(); return mk((function* () { const a = [...it]; a.sort((p, q) => f ? I.num(I.callFn(f, [p, q])) : I.compare(p, q)); yield* a; })()); }
      case 'distinct': { const it = this.take(); return mk((function* () { const seen = new JSet('LinkedHashSet'); for (const x of it) if (seen.add(I, x)) yield x; })()); }
      case 'limit': { const it = this.take(); if (f < 0) I.throwJava('IllegalArgumentException', String(f)); return mk((function* () { if (f <= 0) return; let i = 0; for (const x of it) { yield x; if (++i >= f) return; } })()); }
      case 'skip': { const it = this.take(); return mk((function* () { let i = 0; for (const x of it) { if (i++ >= f) yield x; } })()); }
      case 'peek': { const it = this.take(); return mk((function* () { for (const x of it) { I.callFn(f, [x]); yield x; } })()); }
      case 'takeWhile': { const it = this.take(); return mk((function* () { for (const x of it) { if (!I.truthy(I.callFn(f, [x]))) return; yield x; } })()); }
      case 'dropWhile': { const it = this.take(); return mk((function* () { let drop = true; for (const x of it) { if (drop && I.truthy(I.callFn(f, [x]))) continue; drop = false; yield x; } })()); }
      case 'parallel': case 'sequential': case 'unordered': case 'onClose': return this;
      // ----- terminal -----
      case 'forEach': case 'forEachOrdered': for (const x of this.take()) I.callFn(f, [x]); return undefined;
      case 'collect': {
        if (args.length === 3) { const c = I.callFn(args[0], []); for (const x of this.take()) I.callFn(args[1], [c, x]); return c; }
        if (!(f instanceof JCollector)) I.semErr('collect() expects a Collector, e.g. Collectors.toList()', node.ln);
        return f.run(I, this.take());
      }
      case 'toList': return new JList([...this.take()], 'ImmutableList', 1);
      case 'toArray': { const a = [...this.take()]; const et = K === 'int' ? T_INT : K === 'double' ? T_DOUBLE : K === 'long' ? { n: 'long', args: [], dims: 0 } : T_OBJ; return new JArray(et, a); }
      case 'count': { let c = 0; for (const _ of this.take()) c++; return c; }
      case 'sum': { let s = 0; for (const x of this.take()) s += I.num(x); return K === 'double' ? new JDouble(s) : K === 'int' ? s | 0 : s; }
      case 'average': { let s = 0, c = 0; for (const x of this.take()) { s += I.num(x); c++; } return c ? new JOptional(true, new JDouble(s / c), 'double') : new JOptional(false, null, 'double'); }
      case 'summaryStatistics': { const st = new JStats(K === 'double' ? 'double' : 'int'); for (const x of this.take()) st.add(I.num(x)); return st; }
      case 'min': case 'max': {
        let best, has = false;
        for (const x of this.take()) {
          if (!has) { best = x; has = true; continue; }
          const c = f ? I.num(I.callFn(f, [x, best])) : I.compare(x, best);
          if (n === 'min' ? c < 0 : c > 0) best = x;
        }
        return new JOptional(has, has ? best : null, K);
      }
      case 'reduce': {
        const it = this.take();
        if (args.length >= 2) { let acc = f; for (const x of it) acc = this.wrapK(I.callFn(args[1], [acc, x])); return acc; }
        let acc, has = false;
        for (const x of it) { if (!has) { acc = x; has = true; } else acc = this.wrapK(I.callFn(f, [acc, x])); }
        return new JOptional(has, has ? acc : null, K);
      }
      case 'anyMatch': for (const x of this.take()) if (I.truthy(I.callFn(f, [x]))) return true; return false;
      case 'allMatch': for (const x of this.take()) if (!I.truthy(I.callFn(f, [x]))) return false; return true;
      case 'noneMatch': for (const x of this.take()) if (I.truthy(I.callFn(f, [x]))) return false; return true;
      case 'findFirst': case 'findAny': { for (const x of this.take()) { if (x === null) I.throwJava('NullPointerException', null); return new JOptional(true, x, K); } return new JOptional(false, null, K); }
      case 'iterator': return new JIterator(new JList([...this.take()]), I);
      case 'close': return undefined;
      case 'getClass': { const r = new ClassRef(this.jtype()); r.isClassObj = true; return r; }
    }
    I.semErr(`cannot find symbol\n  symbol:   method ${n}(${args.map(v => I.typeNameOf(v)).join(',')})\n  location: interface ${this.jtype()}`, node.ln);
  }
}
class JCollector {
  constructor(sup, acc, fin) { this.sup = sup; this.acc = acc; this.fin = fin || (s => s); }
  jtype() { return 'Collector'; }
  isA(t) { return t === 'Collector' || t === 'Object'; }
  run(I, it) { const s = this.sup(); for (const x of it) this.acc(s, x); return this.fin(s); }
}
function collectorsStatic(I, n, args, node) {
  const [a, b, c, d] = args;
  const toList = () => new JCollector(() => [], (s, x) => s.push(x), s => new JList(s));
  switch (n) {
    case 'toList': return toList();
    case 'toUnmodifiableList': return new JCollector(() => [], (s, x) => s.push(x), s => new JList(s, 'ImmutableList', 1));
    case 'toSet': case 'toUnmodifiableSet': return new JCollector(() => new JSet('HashSet'), (s, x) => s.add(I, x));
    case 'toCollection': return new JCollector(() => I.callFn(a, []), (s, x) => s.jm('add', [x], I, node));
    case 'joining': return new JCollector(() => [], (s, x) => { if (typeof x !== 'string' && !(x instanceof JSB)) I.semErr(`incompatible types: ${I.typeNameOf(x)} cannot be converted to CharSequence\n  (map the elements to String first, e.g. .map(String::valueOf))`, node.ln); s.push(I.toStr(x)); }, s => (b || '') + s.join(a || '') + (c || ''));
    case 'counting': return new JCollector(() => ({ n: 0 }), (s) => { s.n++; }, s => s.n);
    case 'summingInt': case 'summingLong': return new JCollector(() => ({ n: 0 }), (s, x) => { s.n += I.num(I.callFn(a, [x])); }, s => s.n);
    case 'summingDouble': return new JCollector(() => ({ n: 0 }), (s, x) => { s.n += I.num(I.callFn(a, [x])); }, s => new JDouble(s.n));
    case 'averagingInt': case 'averagingDouble': case 'averagingLong': return new JCollector(() => ({ n: 0, c: 0 }), (s, x) => { s.n += I.num(I.callFn(a, [x])); s.c++; }, s => new JDouble(s.c ? s.n / s.c : 0));
    case 'minBy': case 'maxBy': return new JCollector(() => ({ has: false, v: null }), (s, x) => {
      if (!s.has) { s.has = true; s.v = x; return; } const r = I.num(I.callFn(a, [x, s.v])); if (n === 'minBy' ? r < 0 : r > 0) s.v = x;
    }, s => new JOptional(s.has, s.v));
    case 'mapping': return new JCollector(() => b.sup(), (s, x) => b.acc(s, I.callFn(a, [x])), s => b.fin(s));
    case 'filtering': return new JCollector(() => b.sup(), (s, x) => { if (I.truthy(I.callFn(a, [x]))) b.acc(s, x); }, s => b.fin(s));
    case 'reducing': return new JCollector(() => ({ v: a }), (s, x) => { s.v = I.callFn(b, [s.v, x]); }, s => s.v);
    case 'collectingAndThen': return new JCollector(() => a.sup(), (s, x) => a.acc(s, x), s => I.callFn(b, [a.fin(s)]));
    case 'groupingBy': case 'groupingByConcurrent': {
      let factory = null, down = toList();
      if (args.length === 2) down = b; else if (args.length === 3) { factory = b; down = c; }
      return new JCollector(() => ({ m: factory ? I.callFn(factory, []) : new JMap('HashMap'), states: new Map() }), (s, x) => {
        const k = I.callFn(a, [x]);
        if (k === null) I.throwJava('NullPointerException', 'element cannot be mapped to a null key');
        const key = I.keyOf(k);
        let st = s.states.get(key);
        if (!st) { st = { k, s: down.sup() }; s.states.set(key, st); s.m.put(I, k, null); }
        down.acc(st.s, x);
      }, s => { for (const st of s.states.values()) s.m.put(I, st.k, down.fin(st.s)); return s.m; });
    }
    case 'partitioningBy': {
      const down = b || toList();
      return new JCollector(() => ({ f: down.sup(), t: down.sup() }), (s, x) => down.acc(I.truthy(I.callFn(a, [x])) ? s.t : s.f, x), s => {
        const m = new JMap('LinkedHashMap'); m.put(I, false, down.fin(s.f)); m.put(I, true, down.fin(s.t)); return m;
      });
    }
    case 'toMap': case 'toUnmodifiableMap': return new JCollector(() => d ? I.callFn(d, []) : new JMap('HashMap'), (m, x) => {
      const k = I.callFn(a, [x]), v = I.callFn(b, [x]);
      const e = m.find(I, k);
      if (e) { if (!c) I.throwJava('IllegalStateException', `Duplicate key ${I.toStr(k)} (attempted merging values ${I.toStr(e.v)} and ${I.toStr(v)})`); e.v = I.callFn(c, [e.v, v]); }
      else m.put(I, k, v);
    });
    case 'teeing': return new JCollector(() => ({ x: a.sup(), y: b.sup() }), (s, v) => { a.acc(s.x, v); b.acc(s.y, v); }, s => I.callFn(c, [a.fin(s.x), b.fin(s.y)]));
  }
  I.semErr(`cannot find symbol\n  symbol:   method ${n}\n  location: class Collectors`, node.ln);
}

// ---------------- threads (simulated, sequential) ----------------
class JAtomic {
  constructor(v, kind) { this.v = v; this.kind = kind; }
  jtype() { return this.kind; }
  isA(t) { return t === this.kind || t === 'Number' || t === 'Object'; }
  toJava(I) { return I.toStr(this.v); }
  jm(n, args, I, node) {
    const [a, b] = args; const old = this.v;
    switch (n) {
      case 'get': case 'intValue': case 'longValue': case 'getPlain': case 'getAcquire': return this.v;
      case 'set': case 'lazySet': this.v = a; return undefined;
      case 'incrementAndGet': return ++this.v;
      case 'decrementAndGet': return --this.v;
      case 'getAndIncrement': this.v++; return old;
      case 'getAndDecrement': this.v--; return old;
      case 'addAndGet': this.v += a; return this.v;
      case 'getAndAdd': this.v += a; return old;
      case 'getAndSet': this.v = a; return old;
      case 'compareAndSet': if (I.jequals(this.v, a)) { this.v = b; return true; } return false;
      case 'updateAndGet': this.v = I.callFn(a, [this.v]); return this.v;
      case 'getAndUpdate': this.v = I.callFn(a, [this.v]); return old;
      case 'accumulateAndGet': this.v = I.callFn(b, [this.v, a]); return this.v;
      case 'toString': return I.toStr(this.v);
    }
    I.semErr(`cannot find symbol: method ${n}`, node.ln);
  }
}
class JFuture {
  constructor(v, ex) { this.v = v; this.ex = ex; }
  jtype() { return 'Future'; }
  isA(t) { return t === 'Future' || t === 'Object'; }
  jm(n, args, I) {
    switch (n) {
      case 'get': case 'join': case 'resultNow': if (this.ex) throw new JavaThrow(I.makeEx('ExecutionException', I.toStr(this.ex), this.ex)); return this.v;
      case 'isDone': return true; case 'isCancelled': return false; case 'cancel': return false;
    }
    return undefined;
  }
}
class JExecutor {
  constructor() { this.shut = false; }
  jtype() { return 'ExecutorService'; }
  isA(t) { return t === 'ExecutorService' || t === 'Executor' || t === 'AutoCloseable' || t === 'Object'; }
  runTask(I, task) {
    try { return new JFuture(I.runAsThread(task, 'pool-1-thread-1')); }
    catch (e) { if (e instanceof JavaThrow) return new JFuture(null, e.obj); throw e; }
  }
  jm(n, args, I, node) {
    switch (n) {
      case 'submit': if (this.shut) I.throwJava('RejectedExecutionException', null); return this.runTask(I, args[0]);
      case 'execute': I.runAsThread(args[0], 'pool-1-thread-1'); return undefined;
      case 'invokeAll': return new JList(jsArr(I, args[0]).map(t => this.runTask(I, t)));
      case 'shutdown': case 'close': case 'shutdownNow': this.shut = true; return n === 'shutdownNow' ? new JList([]) : undefined;
      case 'awaitTermination': return true;
      case 'isShutdown': case 'isTerminated': return this.shut;
    }
    I.semErr(`cannot find symbol: method ${n}`, node.ln);
  }
}
const TIME_UNIT = { jtype() { return 'TimeUnit'; }, isA(t) { return t === 'TimeUnit'; }, toJava() { return 'SECONDS'; }, jm(n) { return undefined; } };

// ---------------- Interp: builtin dispatch ----------------
Object.assign(Interp.prototype, {
  runAsThread(task, name) {
    const prev = this.curThread; this.curThread = name;
    try {
      if (task instanceof JObject && this.clsIsA(task.cls, 'Thread')) return this.callObjMethod(task, 'run', [], { ln: this.ln });
      return this.callFn(task, []);
    } finally { this.curThread = prev; }
  },
  sysOut(err) { if (err) return this._err || (this._err = new JPrint(true)); return this._out || (this._out = new JPrint(false)); },
  builtinStaticField(cn, n, node, quiet) {
    switch (cn) {
      case 'System': if (n === 'out') return this.sysOut(false); if (n === 'err') return this.sysOut(true); if (n === 'in') return STDIN; break;
      case 'Integer': if (n === 'MAX_VALUE') return 2147483647; if (n === 'MIN_VALUE') return -2147483648; if (n === 'SIZE') return 32; break;
      case 'Long': if (n === 'MAX_VALUE') return 9223372036854775807; if (n === 'MIN_VALUE') return -9223372036854775808; break;
      case 'Short': if (n === 'MAX_VALUE') return 32767; if (n === 'MIN_VALUE') return -32768; break;
      case 'Byte': if (n === 'MAX_VALUE') return 127; if (n === 'MIN_VALUE') return -128; break;
      case 'Character': if (n === 'MAX_VALUE') return jchar(0xffff); if (n === 'MIN_VALUE') return jchar(0); break;
      case 'Double': case 'Float':
        switch (n) { case 'MAX_VALUE': return new JDouble(cn === 'Double' ? Number.MAX_VALUE : 3.4028234663852886e38); case 'MIN_VALUE': return new JDouble(cn === 'Double' ? 5e-324 : 1.401298464324817e-45); case 'POSITIVE_INFINITY': return new JDouble(Infinity); case 'NEGATIVE_INFINITY': return new JDouble(-Infinity); case 'NaN': return new JDouble(NaN); }
        break;
      case 'Math': case 'StrictMath': if (n === 'PI') return new JDouble(Math.PI); if (n === 'E') return new JDouble(Math.E); break;
      case 'Boolean': if (n === 'TRUE') return true; if (n === 'FALSE') return false; break;
      case 'Map': if (n === 'Entry') return new ClassRef('Map.Entry'); break;
      case 'TimeUnit': return TIME_UNIT;
      case 'String': if (n === 'CASE_INSENSITIVE_ORDER') return new JFunc(a => this.compare(a[0].toLowerCase(), a[1].toLowerCase()), 2, 'cmp'); break;
    }
    if (quiet) return undefined;
    this.semErr(`cannot find symbol\n  symbol:   variable ${n}\n  location: class ${cn}`, node ? node.ln : this.ln);
  },
  parseIntJava(s, radix) {
    radix = radix || 10;
    if (s === null) this.throwJava('NumberFormatException', 'Cannot parse null string: null');
    const re = radix === 10 ? /^[-+]?\d+$/ : radix === 16 ? /^[-+]?[0-9a-fA-F]+$/ : radix === 2 ? /^[-+]?[01]+$/ : /^[-+]?[0-9a-zA-Z]+$/;
    if (!re.test(s)) this.throwJava('NumberFormatException', s === '' ? 'For input string: ""' : `For input string: "${s}"${radix !== 10 ? ' under radix ' + radix : ''}`);
    const v = parseInt(s, radix);
    if (v > 2147483647 || v < -2147483648) this.throwJava('NumberFormatException', `For input string: "${s}"${radix !== 10 ? ' under radix ' + radix : ''}`);
    return v;
  },
  mathArgs(args, k, node) { for (const a of args) if (!this.isNumeric(a)) this.semErr(`incompatible types: ${this.typeNameOf(a)} cannot be converted to double`, node.ln); return args.map(a => this.num(a)); },
  builtinStatic(cn, n, args, node) {
    const [a, b, c] = args;
    const D = (x) => new JDouble(x);
    const anyD = args.some(x => x instanceof JDouble);
    switch (cn) {
      case 'Math': case 'StrictMath': {
        const v = this.mathArgs(args, 0, node);
        switch (n) {
          case 'abs': return a instanceof JDouble ? D(Math.abs(v[0])) : Math.abs(v[0]);
          case 'max': return anyD ? D(Math.max(v[0], v[1])) : Math.max(v[0], v[1]);
          case 'min': return anyD ? D(Math.min(v[0], v[1])) : Math.min(v[0], v[1]);
          case 'pow': return D(Math.pow(v[0], v[1]));
          case 'sqrt': return D(Math.sqrt(v[0])); case 'cbrt': return D(Math.cbrt(v[0]));
          case 'floor': return D(Math.floor(v[0])); case 'ceil': return D(Math.ceil(v[0]));
          case 'rint': { const x = v[0]; const r = Math.round(x); return D((Math.abs(x % 1) === 0.5 && r % 2 !== 0) ? r - 1 : r); }
          case 'round': return isNaN(v[0]) ? 0 : Math.floor(v[0] + 0.5);
          case 'random': return D(Math.random());
          case 'sin': return D(Math.sin(v[0])); case 'cos': return D(Math.cos(v[0])); case 'tan': return D(Math.tan(v[0]));
          case 'asin': return D(Math.asin(v[0])); case 'acos': return D(Math.acos(v[0])); case 'atan': return D(Math.atan(v[0])); case 'atan2': return D(Math.atan2(v[0], v[1]));
          case 'exp': return D(Math.exp(v[0])); case 'log': return D(Math.log(v[0])); case 'log10': return D(Math.log10(v[0]));
          case 'hypot': return D(Math.hypot(v[0], v[1])); case 'signum': return D(Math.sign(v[0]));
          case 'toRadians': return D(v[0] * Math.PI / 180); case 'toDegrees': return D(v[0] * 180 / Math.PI);
          case 'floorDiv': if (v[1] === 0) this.throwJava('ArithmeticException', '/ by zero'); return Math.floor(v[0] / v[1]);
          case 'floorMod': if (v[1] === 0) this.throwJava('ArithmeticException', '/ by zero'); return ((v[0] % v[1]) + v[1]) % v[1];
          case 'addExact': case 'subtractExact': case 'multiplyExact': {
            const r = n === 'addExact' ? v[0] + v[1] : n === 'subtractExact' ? v[0] - v[1] : v[0] * v[1];
            if (r > 2147483647 || r < -2147483648) this.throwJava('ArithmeticException', 'integer overflow'); return r;
          }
          case 'clamp': return anyD ? D(Math.min(Math.max(v[0], v[1]), v[2])) : Math.min(Math.max(v[0], v[1]), v[2]);
        }
        break;
      }
      case 'Integer': case 'Long': case 'Short': case 'Byte':
        switch (n) {
          case 'parseInt': case 'parseLong': case 'parseShort': case 'parseByte': if (typeof a !== 'string' && a !== null) this.semErr(`incompatible types: ${this.typeNameOf(a)} cannot be converted to String`, node.ln); return n === 'parseInt' ? this.parseIntJava(a, b) : (() => { if (a === null || !/^[-+]?\d+$/.test(a)) this.throwJava('NumberFormatException', `For input string: "${a}"`); return parseInt(a, 10); })();
          case 'valueOf': return typeof a === 'string' ? this.parseIntJava(a, b) : a instanceof JChar ? a.c : a;
          case 'toString': return args.length === 2 ? a.toString(b) : this.toStr(a);
          case 'toBinaryString': return (a >>> 0).toString(2);
          case 'toHexString': return (a >>> 0).toString(16);
          case 'toOctalString': return (a >>> 0).toString(8);
          case 'compare': return a < b ? -1 : a > b ? 1 : 0;
          case 'max': return Math.max(a, b); case 'min': return Math.min(a, b); case 'sum': return a + b;
          case 'signum': return Math.sign(a);
          case 'bitCount': { let x = a >>> 0, k = 0; while (x) { k += x & 1; x >>>= 1; } return k; }
          case 'reverse': { let x = a >>> 0, r = 0; for (let i = 0; i < 32; i++) { r = (r << 1) | (x & 1); x >>>= 1; } return r | 0; }
          case 'hashCode': return a | 0;
        }
        break;
      case 'Double': case 'Float':
        switch (n) {
          case 'parseDouble': case 'parseFloat': case 'valueOf': {
            if (a instanceof JDouble) return a; if (typeof a === 'number') return D(a);
            if (a === null) this.throwJava('NullPointerException', null);
            const t = a.trim();
            if (!/^[-+]?(NaN|Infinity|((\d+\.?\d*|\.\d+)([eE][-+]?\d+)?)[fFdD]?)$/.test(t)) this.throwJava('NumberFormatException', t === '' ? 'empty String' : `For input string: "${a}"`);
            return D(parseFloat(t.replace(/[fFdD]$/, '')));
          }
          case 'toString': return this.toStr(D(this.num(a)));
          case 'compare': { const x = this.num(a), y = this.num(b); return x < y ? -1 : x > y ? 1 : 0; }
          case 'isNaN': return isNaN(this.num(a)); case 'isInfinite': return !isFinite(this.num(a)) && !isNaN(this.num(a)); case 'isFinite': return isFinite(this.num(a));
          case 'max': return D(Math.max(this.num(a), this.num(b))); case 'min': return D(Math.min(this.num(a), this.num(b))); case 'sum': return D(this.num(a) + this.num(b));
          case 'hashCode': return dblHash(this.num(a));
        }
        break;
      case 'Character': {
        const code = a instanceof JChar ? a.c : a; const ch = String.fromCharCode(code);
        switch (n) {
          case 'isDigit': return /\p{Nd}/u.test(ch);
          case 'isLetter': case 'isAlphabetic': return /\p{L}/u.test(ch);
          case 'isLetterOrDigit': return /[\p{L}\p{Nd}]/u.test(ch);
          case 'isUpperCase': return /\p{Lu}/u.test(ch);
          case 'isLowerCase': return /\p{Ll}/u.test(ch);
          case 'isWhitespace': return /[\s]/.test(ch) && code !== 0xa0;
          case 'isSpaceChar': return /\s/.test(ch);
          case 'toUpperCase': { const r = ch.toUpperCase(); return a instanceof JChar ? jchar(r.length === 1 ? r.charCodeAt(0) : code) : r.charCodeAt(0); }
          case 'toLowerCase': { const r = ch.toLowerCase(); return a instanceof JChar ? jchar(r.length === 1 ? r.charCodeAt(0) : code) : r.charCodeAt(0); }
          case 'getNumericValue': return /\d/.test(ch) ? code - 48 : /[a-z]/i.test(ch) ? ch.toLowerCase().charCodeAt(0) - 87 : -1;
          case 'valueOf': return a;
          case 'toString': return ch;
          case 'compare': return code - (b instanceof JChar ? b.c : b);
          case 'isVowel': break;
          case 'toChars': return new JArray(T_CHAR, [jchar(code)]);
          case 'hashCode': return code;
        }
        break;
      }
      case 'Boolean':
        switch (n) {
          case 'parseBoolean': return typeof a === 'string' && a.toLowerCase() === 'true';
          case 'valueOf': return typeof a === 'boolean' ? a : (typeof a === 'string' && a.toLowerCase() === 'true');
          case 'toString': return String(a);
          case 'compare': return a === b ? 0 : a ? 1 : -1;
          case 'logicalAnd': return a && b; case 'logicalOr': return a || b; case 'logicalXor': return a !== b;
        }
        break;
      case 'String':
        switch (n) {
          case 'valueOf': case 'copyValueOf':
            if (a instanceof JArray && a.et.n === 'char') return a.a.map(x => String.fromCharCode(x.c)).join('');
            return this.toStr(a);
          case 'join': { const items = args.length === 2 && (b instanceof JList || b instanceof JSet || b instanceof JArray) ? jsArr(this, b) : args.slice(1); return items.map(x => this.toStr(x)).join(a); }
          case 'format': return jformat(this, a, args.length === 2 && b instanceof JArray && !PRIMS.has(b.et.n) ? b.a : args.slice(1));
        }
        break;
      case 'System':
        switch (n) {
          case 'currentTimeMillis': return Math.floor(Date.now() + this.vtime);
          case 'nanoTime': return Math.floor((typeof performance !== 'undefined' ? performance.now() : Date.now()) * 1e6 + this.vtime * 1e6);
          case 'exit': throw new ExitSignal(a);
          case 'lineSeparator': return '\n';
          case 'identityHashCode': return parseInt(this.identityHash(a), 16);
          case 'arraycopy': {
            if (a === null || c === null) this.throwJava('NullPointerException', null);
            const [, sp, , dp, len] = args;
            if (sp < 0 || dp < 0 || len < 0 || sp + len > a.a.length || dp + len > c.a.length) this.throwJava('ArrayIndexOutOfBoundsException', `arraycopy: last source index ${sp + len} out of bounds for length ${a.a.length}`);
            const tmp = a.a.slice(sp, sp + len); for (let i = 0; i < len; i++) c.a[dp + i] = tmp[i]; return undefined;
          }
          case 'getProperty': case 'getenv': return null;
          case 'gc': return undefined;
        }
        break;
      case 'IO':
        switch (n) {
          case 'println': this.print((args.length ? this.toStr(a) : '') + '\n'); return undefined;
          case 'print': this.print(this.toStr(a)); return undefined;
          case 'readln': { if (args.length) this.print(this.toStr(a)); const sc = new JScanner(null); return sc.readLine(this); }
        }
        break;
      case 'Arrays': return this.arraysStatic(n, args, node);
      case 'Collections': return this.collectionsStatic(n, args, node);
      case 'List':
        if (n === 'of') { const items = args.length === 1 && a instanceof JArray && !PRIMS.has(a.et.n) ? a.a.slice() : args; if (items.some(x => x === null)) this.throwJava('NullPointerException', null); return new JList(items.slice(), 'ImmutableList', 1); }
        if (n === 'copyOf') return new JList(jsArr(this, a).slice(), 'ImmutableList', 1);
        break;
      case 'Set':
        if (n === 'of' || n === 'copyOf') {
          const items = n === 'copyOf' ? jsArr(this, a) : args;
          const s = new JSet('ImmutableSet');
          for (const x of items) { if (x === null) this.throwJava('NullPointerException', null); if (!s.add(this, x) && n === 'of') this.throwJava('IllegalArgumentException', 'duplicate element: ' + this.toStr(x)); }
          s.imm = true; return s;
        }
        break;
      case 'Map':
        if (n === 'of') {
          const m = new JMap('ImmutableMap');
          for (let i = 0; i < args.length; i += 2) { if (m.find(this, args[i])) this.throwJava('IllegalArgumentException', 'duplicate key: ' + this.toStr(args[i])); m.put(this, args[i], args[i + 1]); }
          m.imm = true; return m;
        }
        if (n === 'entry') return new JEntry(a, b, null);
        if (n === 'ofEntries') { const m = new JMap('ImmutableMap'); for (const e of args) m.put(this, e.k, e.v); m.imm = true; return m; }
        if (n === 'copyOf') { const m = new JMap('ImmutableMap'); for (const e of a.entries(this)) m.put(this, e.k, e.v); m.imm = true; return m; }
        break;
      case 'Map.Entry': case 'Entry':
        if (n === 'comparingByKey') return new JFunc(x => b === undefined && a ? this.num(this.callFn(a, [x[0].k, x[1].k])) : this.compare(x[0].k, x[1].k), 2, 'cmp');
        if (n === 'comparingByValue') return new JFunc(x => a ? this.num(this.callFn(a, [x[0].v, x[1].v])) : this.compare(x[0].v, x[1].v), 2, 'cmp');
        break;
      case 'Objects':
        switch (n) {
          case 'equals': return a === null ? b === null : this.jequals(a, b);
          case 'hash': { let h = 1; for (const x of (args.length === 1 && a instanceof JArray ? a.a : args)) h = (Math.imul(31, h) + this.jhash(x)) | 0; return h; }
          case 'hashCode': return a === null ? 0 : this.jhash(a);
          case 'toString': return a === null && args.length === 2 ? b : this.toStr(a);
          case 'requireNonNull': if (a === null) this.throwJava('NullPointerException', args.length > 1 ? (typeof b === 'string' ? b : this.toStr(this.callFn(b, []))) : null); return a;
          case 'requireNonNullElse': return a === null ? b : a;
          case 'isNull': return a === null; case 'nonNull': return a !== null;
          case 'compare': return a === b ? 0 : this.num(this.callFn(c, [a, b]));
          case 'checkIndex': if (a < 0 || a >= b) this.throwJava('IndexOutOfBoundsException', `Index ${a} out of bounds for length ${b}`); return a;
        }
        break;
      case 'Stream': case 'IntStream': case 'DoubleStream': case 'LongStream': {
        const kind = cn === 'Stream' ? 'obj' : cn === 'IntStream' ? 'int' : cn === 'LongStream' ? 'long' : 'double';
        switch (n) {
          case 'of': { const items = args.length === 1 && a instanceof JArray ? a.a.slice() : args; return new JStream(this, kind === 'double' ? items.map(x => x instanceof JDouble ? x : D(this.num(x))) : items, kind); }
          case 'empty': return new JStream(this, [], kind);
          case 'range': case 'rangeClosed': { const hi = n === 'range' ? b : b + 1; return new JStream(this, (function* () { for (let i = a; i < hi; i++) yield i; })(), kind); }
          case 'iterate': {
            const self = this;
            if (args.length === 3) return new JStream(this, (function* () { for (let x = a; self.truthy(self.callFn(b, [x])); x = self.callFn(c, [x])) yield x; })(), kind);
            return new JStream(this, (function* () { let x = a; while (true) { yield x; x = self.callFn(b, [x]); } })(), kind);
          }
          case 'generate': { const self = this; return new JStream(this, (function* () { while (true) yield self.callFn(a, []); })(), kind); }
          case 'concat': { const i1 = a.take(), i2 = b.take(); return new JStream(this, (function* () { yield* i1; yield* i2; })(), kind); }
        }
        break;
      }
      case 'Collectors': return collectorsStatic(this, n, args, node);
      case 'Comparator': return this.comparatorStatic(n, args, node);
      case 'Optional': case 'OptionalInt': case 'OptionalDouble': {
        const kind = cn === 'Optional' ? 'obj' : cn === 'OptionalInt' ? 'int' : 'double';
        if (n === 'of') { if (a === null) this.throwJava('NullPointerException', null); return new JOptional(true, a, kind); }
        if (n === 'ofNullable') return new JOptional(a !== null, a, kind);
        if (n === 'empty') return new JOptional(false, null, kind);
        break;
      }
      case 'Function': case 'UnaryOperator': if (n === 'identity') return new JFunc(x => x[0], 1); break;
      case 'Predicate':
        if (n === 'not') return new JFunc(x => !this.truthy(this.callFn(a, x)), 1);
        if (n === 'isEqual') return new JFunc(x => this.jequals(a, x[0]), 1);
        break;
      case 'BinaryOperator': if (n === 'minBy' || n === 'maxBy') return new JFunc(x => { const r = this.num(this.callFn(a, [x[0], x[1]])); return n === 'minBy' ? (r <= 0 ? x[0] : x[1]) : (r >= 0 ? x[0] : x[1]); }, 2); break;
      case 'Thread':
        switch (n) {
          case 'sleep': this.vtime += this.num(a); return undefined;
          case 'currentThread': return { jtype: () => 'Thread', isA: t => t === 'Thread', toJava: () => `Thread[#1,${this.curThread || 'main'},5,main]`, jm: (m) => m === 'getName' ? (this.curThread || 'main') : m === 'threadId' || m === 'getId' ? 1 : m === 'isVirtual' ? false : undefined };
          case 'ofVirtual': case 'ofPlatform': return { jtype: () => 'Thread.Builder', isA: () => false, jm: (m, aa) => { if (m === 'start') { const t = this.newBuiltin('Thread', [aa[0]], node); this.callObjMethod(t, 'start', [], node); return t; } if (m === 'unstarted') return this.newBuiltin('Thread', [aa[0]], node); return undefined; } };
          case 'startVirtualThread': { const t = this.newBuiltin('Thread', [a], node); this.callObjMethod(t, 'start', [], node); return t; }
        }
        break;
      case 'Executors': return new JExecutor();
      case 'ThreadLocalRandom': if (n === 'current') return new JRandom(); break;
      case 'TimeUnit': return TIME_UNIT;
    }
    this.semErr(`cannot find symbol\n  symbol:   method ${n}(${args.map(x => this.typeNameOf(x)).join(',')})\n  location: class ${cn}`, node.ln);
  },
  comparatorStatic(n, args, node) {
    const [a, b] = args;
    const key = (f, x) => this.callFn(f, [x]);
    switch (n) {
      case 'comparing': return new JFunc(x => b ? this.num(this.callFn(b, [key(a, x[0]), key(a, x[1])])) : this.compare(key(a, x[0]), key(a, x[1])), 2, 'cmp');
      case 'comparingInt': case 'comparingDouble': case 'comparingLong': return new JFunc(x => { const p = this.num(key(a, x[0])), q = this.num(key(a, x[1])); return p < q ? -1 : p > q ? 1 : 0; }, 2, 'cmp');
      case 'naturalOrder': return new JFunc(x => this.compare(x[0], x[1]), 2, 'cmp');
      case 'reverseOrder': return new JFunc(x => this.compare(x[1], x[0]), 2, 'cmp');
      case 'nullsFirst': case 'nullsLast': return new JFunc(x => { if (x[0] === null) return x[1] === null ? 0 : (n === 'nullsFirst' ? -1 : 1); if (x[1] === null) return n === 'nullsFirst' ? 1 : -1; return this.num(this.callFn(a, x)); }, 2, 'cmp');
    }
    this.semErr(`cannot find symbol\n  symbol:   method ${n}\n  location: interface Comparator`, node.ln);
  },
  isComparatorFn(f) { return (f instanceof JFunc && (f.tag === 'cmp' || f.arity === 2)) || (f instanceof JLambda && f.params.length === 2) || f instanceof JObject; },
  fnMethod(f, n, args, node) {
    const [a] = args;
    switch (n) {
      case 'reversed': return new JFunc(x => this.num(this.callFn(f, [x[1], x[0]])), 2, 'cmp');
      case 'thenComparing': {
        const second = this.isComparatorFn(a) && args.length === 1 ? a : null;
        return new JFunc(x => {
          const r = this.num(this.callFn(f, x)); if (r !== 0) return r;
          if (second) return this.num(this.callFn(second, x));
          const p = this.callFn(a, [x[0]]), q = this.callFn(a, [x[1]]);
          return args.length === 2 ? this.num(this.callFn(args[1], [p, q])) : this.compare(p, q);
        }, 2, 'cmp');
      }
      case 'thenComparingInt': case 'thenComparingDouble': case 'thenComparingLong':
        return new JFunc(x => { const r = this.num(this.callFn(f, x)); if (r !== 0) return r; const p = this.num(this.callFn(a, [x[0]])), q = this.num(this.callFn(a, [x[1]])); return p < q ? -1 : p > q ? 1 : 0; }, 2, 'cmp');
      case 'negate': return new JFunc(x => !this.truthy(this.callFn(f, x)), 1);
      case 'and': return new JFunc(x => this.truthy(this.callFn(f, x)) && this.truthy(this.callFn(a, x)), 1);
      case 'or': return new JFunc(x => this.truthy(this.callFn(f, x)) || this.truthy(this.callFn(a, x)), 1);
      case 'andThen': return new JFunc(x => { const r = this.callFn(f, x); return (f.arity === 1 || (f instanceof JLambda && f.body.k !== 'block') || r !== undefined) && r !== undefined ? this.callFn(a, [r]) : (this.callFn(a, x), undefined); }, 1);
      case 'compose': return new JFunc(x => this.callFn(f, [this.callFn(a, x)]), 1);
      case 'equals': return f === a;
      case 'hashCode': return parseInt(this.identityHash(f), 16);
      case 'toString': return this.toStr(f);
      case 'getClass': { const r = new ClassRef('Main$$Lambda'); r.isClassObj = true; return r; }
    }
    return this.callFn(f, args);
  },
  arraysStatic(n, args, node) {
    const [a, b, c, d] = args;
    const arr = () => { if (a === null) this.throwJava('NullPointerException', null); if (!(a instanceof JArray)) this.semErr(`no suitable method found for ${n}(${this.typeNameOf(a)})`, node.ln); return a; };
    switch (n) {
      case 'toString': if (a === null) return 'null'; return '[' + arr().a.map(x => this.toStr(x)).join(', ') + ']';
      case 'deepToString': { const f = (v) => v instanceof JArray ? '[' + v.a.map(f).join(', ') + ']' : this.toStr(v); return a === null ? 'null' : f(arr()); }
      case 'sort': {
        const A = arr();
        let lo = 0, hi = A.a.length, cmp = null;
        if (args.length === 2) cmp = b; else if (args.length >= 3) { lo = b; hi = c; cmp = d || null; }
        const part = A.a.slice(lo, hi);
        part.sort((p, q) => cmp ? this.num(this.callFn(cmp, [p, q])) : this.compare(p, q));
        for (let i = 0; i < part.length; i++) A.a[lo + i] = part[i];
        return undefined;
      }
      case 'fill': { const A = arr(); if (args.length === 2) A.a.fill(this.coerce(b, A.et)); else A.a.fill(this.coerce(d, A.et), b, c); return undefined; }
      case 'copyOf': { const A = arr(); const r = A.a.slice(0, b); while (r.length < b) r.push(this.defaultValue(A.et)); return new JArray(A.et, r); }
      case 'copyOfRange': { const A = arr(); if (b < 0 || b > A.a.length) this.throwJava('ArrayIndexOutOfBoundsException', `Array index out of range: ${b}`); const r = A.a.slice(b, c); while (r.length < c - b) r.push(this.defaultValue(A.et)); return new JArray(A.et, r); }
      case 'asList': { const items = args.length === 1 && a instanceof JArray && !PRIMS.has(a.et.n) ? a.a : args; return new JList(items, 'ArraysList', 2); }
      case 'stream': { const A = arr(); const kind = A.et.dims ? 'obj' : A.et.n === 'int' ? 'int' : A.et.n === 'double' ? 'double' : A.et.n === 'long' ? 'long' : 'obj'; return new JStream(this, args.length === 3 ? A.a.slice(b, c) : A.a.slice(), kind); }
      case 'equals': if (a === null || b === null) return a === b; return a.a.length === b.a.length && a.a.every((x, i) => this.jequals(x, b.a[i]) || (this.isNumeric(x) && this.valEq(x, b.a[i])));
      case 'deepEquals': { const eq = (p, q) => p instanceof JArray && q instanceof JArray ? p.a.length === q.a.length && p.a.every((x, i) => eq(x, q.a[i])) : this.jequals(p, q); return eq(a, b); }
      case 'hashCode': { let h = 1; for (const x of arr().a) h = (Math.imul(31, h) + this.jhash(x)) | 0; return h; }
      case 'binarySearch': { const A = arr().a; let lo = 0, hi = A.length - 1; while (lo <= hi) { const mid = (lo + hi) >>> 1; const r = this.compare(A[mid], b); if (r < 0) lo = mid + 1; else if (r > 0) hi = mid - 1; else return mid; } return -(lo + 1); }
      case 'setAll': { const A = arr(); for (let i = 0; i < A.a.length; i++) A.a[i] = this.coerce(this.callFn(b, [i]), A.et); return undefined; }
    }
    this.semErr(`cannot find symbol\n  symbol:   method ${n}\n  location: class Arrays`, node.ln);
  },
  collectionsStatic(n, args, node) {
    const [a, b, c] = args;
    switch (n) {
      case 'sort': if (!(a instanceof JList)) this.semErr(`no suitable method found for sort(${this.typeNameOf(a)})`, node.ln); return a.jm('sort', [b === undefined ? null : b], this, node);
      case 'reverse': a.mut(this, false); a.a.reverse(); return undefined;
      case 'shuffle': { a.mut(this, false); const r = b instanceof JRandom ? b : new JRandom(); for (let i = a.a.length; i > 1; i--) { const j = r.nextInt(i, this); [a.a[i - 1], a.a[j]] = [a.a[j], a.a[i - 1]]; } return undefined; }
      case 'max': case 'min': {
        const items = jsArr(this, a); if (!items.length) this.throwJava('NoSuchElementException', null);
        let best = items[0];
        for (const x of items.slice(1)) { const r = b ? this.num(this.callFn(b, [x, best])) : this.compare(x, best); if (n === 'max' ? r > 0 : r < 0) best = x; }
        return best;
      }
      case 'frequency': return jsArr(this, a).filter(x => this.jequals(x, b) || (x === null && b === null)).length;
      case 'unmodifiableList': case 'unmodifiableCollection': { const l = new JList(a.a, a.kind, 1); return l; }
      case 'unmodifiableSet': { const s = new JSet('LinkedHashSet'); for (const x of jsArr(this, a)) s.add(this, x); s.imm = true; return s; }
      case 'unmodifiableMap': { const m = new JMap(a.kind === 'TreeMap' ? 'TreeMap' : 'LinkedHashMap'); for (const e of a.entries(this)) m.put(this, e.k, e.v); m.imm = true; return m; }
      case 'synchronizedList': case 'synchronizedMap': case 'synchronizedSet': return a;
      case 'emptyList': return new JList([], 'ImmutableList', 1);
      case 'emptySet': { const s = new JSet('ImmutableSet'); s.imm = true; return s; }
      case 'emptyMap': { const m = new JMap('ImmutableMap'); m.imm = true; return m; }
      case 'singletonList': case 'singleton': return new JList([a], 'ImmutableList', 1);
      case 'nCopies': return new JList(new Array(a).fill(b), 'ImmutableList', 1);
      case 'swap': { const t = a.a[b]; a.jm('get', [b], this, node); a.jm('get', [c], this, node); a.a[b] = a.a[c]; a.a[c] = t; return undefined; }
      case 'addAll': { for (const x of args.slice(1)) a.jm('add', [x], this, node); return true; }
      case 'reverseOrder': return a ? new JFunc(x => this.num(this.callFn(a, [x[1], x[0]])), 2, 'cmp') : new JFunc(x => this.compare(x[1], x[0]), 2, 'cmp');
      case 'disjoint': { const B = jsArr(this, b); return !jsArr(this, a).some(x => B.some(y => this.jequals(x, y))); }
    }
    this.semErr(`cannot find symbol\n  symbol:   method ${n}\n  location: class Collections`, node.ln);
  },
  newBuiltin(tn, args, node) {
    const [a, b] = args;
    const fromColl = (x) => jsArr(this, x).slice();
    switch (tn) {
      case 'Object': { const c = this.classes.get('Object'); const o = new JObject(c); this.assignId(o); return o; }
      case 'ArrayList': case 'LinkedList': case 'Vector': case 'CopyOnWriteArrayList':
        if (a !== undefined && typeof a !== 'number') return new JList(fromColl(a), tn === 'LinkedList' ? 'LinkedList' : 'ArrayList');
        if (typeof a === 'number' && a < 0) this.throwJava('IllegalArgumentException', 'Illegal Capacity: ' + a);
        return new JList([], tn === 'LinkedList' ? 'LinkedList' : 'ArrayList');
      case 'ArrayDeque': case 'ConcurrentLinkedQueue': case 'LinkedBlockingQueue': case 'ConcurrentLinkedDeque': return new JList(a !== undefined && typeof a !== 'number' ? fromColl(a) : [], 'ArrayDeque');
      case 'Stack': return new JList([], 'Stack');
      case 'HashMap': case 'LinkedHashMap': case 'TreeMap': case 'ConcurrentHashMap': case 'Hashtable': {
        const kind = tn === 'ConcurrentHashMap' || tn === 'Hashtable' ? 'HashMap' : tn;
        const isCmp = a instanceof JLambda || a instanceof JFunc || (a instanceof JObject);
        const m = new JMap(kind, tn === 'TreeMap' && isCmp ? a : null);
        if (typeof a === 'number') m.cap = tableSizeFor(a);
        if (a instanceof JMap) { if (kind === 'HashMap' && a.size) m.cap = tableSizeFor(Math.floor(a.size / 0.75 + 1)); for (const e of a.entries(this)) m.put(this, e.k, e.v); }
        return m;
      }
      case 'HashSet': case 'LinkedHashSet': case 'TreeSet': {
        const isCmp = a instanceof JLambda || a instanceof JFunc || a instanceof JObject;
        const s = new JSet(tn, tn === 'TreeSet' && isCmp ? a : null);
        if (a !== undefined && !isCmp && typeof a !== 'number') { if (tn === 'HashSet') s.m.cap = tableSizeFor(Math.max(Math.floor(jsArr(this, a).length / 0.75) + 1, 16)); for (const x of jsArr(this, a)) s.add(this, x); }
        if (typeof a === 'number') s.m.cap = tableSizeFor(a);
        return s;
      }
      case 'PriorityQueue': {
        const isCmp = a instanceof JLambda || a instanceof JFunc || a instanceof JObject || b instanceof JLambda || b instanceof JFunc;
        const q = new JPQ(isCmp ? (typeof a === 'number' ? b : a) : null);
        if (a !== undefined && !isCmp && typeof a !== 'number') for (const x of jsArr(this, a)) q.offer(this, x);
        return q;
      }
      case 'StringBuilder': case 'StringBuffer': return new JSB(a === undefined || typeof a === 'number' ? '' : this.toStr(a));
      case 'String':
        if (a === undefined) return '';
        if (a instanceof JArray) return (args.length === 3 ? a.a.slice(b, b + args[2]) : a.a).map(x => String.fromCharCode(x.c)).join('');
        return this.toStr(a);
      case 'Scanner': return new JScanner(typeof a === 'string' ? a : null);
      case 'InputStreamReader': return STDIN;
      case 'BufferedReader': return new JScanner(null, true);
      case 'Random': return new JRandom(a);
      case 'Thread': {
        const c = this.classes.get('Thread'); const o = new JObject(c); this.assignId(o); c.nativeCtor(o, args); return o;
      }
      case 'AtomicInteger': case 'AtomicLong': return new JAtomic(a || 0, tn);
      case 'Integer': return typeof a === 'string' ? this.parseIntJava(a) : a;
      case 'Double': return a instanceof JDouble ? a : new JDouble(this.num(a));
      case 'Boolean': return !!a;
      case 'Character': return a;
      case 'IntSummaryStatistics': return new JStats('int');
      case 'DoubleSummaryStatistics': return new JStats('double');
    }
    if (KNOWN_TYPES.has(tn)) this.semErr(`${tn} is abstract; cannot be instantiated`, node.ln);
    this.semErr(`cannot find symbol\n  symbol:   class ${tn}`, node.ln);
  },
  boxedMethod(v, n, args, node) {
    const [a] = args;
    if (v instanceof JDouble) {
      switch (n) {
        case 'intValue': return this.castTo(v, T_INT); case 'longValue': return Math.trunc(v.v); case 'doubleValue': case 'floatValue': return v;
        case 'isNaN': return isNaN(v.v); case 'isInfinite': return !isFinite(v.v) && !isNaN(v.v);
        case 'compareTo': case 'compare': return this.compare(v, a);
        case 'equals': return this.jequals(v, a);
        case 'hashCode': return dblHash(v.v);
        case 'toString': return this.toStr(v);
      }
    } else if (typeof v === 'number') {
      switch (n) {
        case 'intValue': case 'longValue': case 'shortValue': case 'byteValue': return v; case 'doubleValue': case 'floatValue': return new JDouble(v);
        case 'compareTo': case 'compare': return this.compare(v, a);
        case 'equals': return this.jequals(v, a);
        case 'hashCode': return v | 0;
        case 'toString': return String(v);
      }
      this.semErr(`int cannot be dereferenced` + (['length', 'size'].includes(n) ? '' : ''), node.ln);
    } else if (v instanceof JChar) {
      switch (n) {
        case 'charValue': return v; case 'compareTo': return v.c - a.c; case 'equals': return this.jequals(v, a);
        case 'hashCode': return v.c; case 'toString': return String.fromCharCode(v.c);
      }
      this.semErr(`char cannot be dereferenced`, node.ln);
    } else if (typeof v === 'boolean') {
      switch (n) { case 'booleanValue': return v; case 'equals': return v === a; case 'compareTo': return v === a ? 0 : v ? 1 : -1; case 'toString': return String(v); case 'hashCode': return v ? 1231 : 1237; }
      this.semErr(`boolean cannot be dereferenced`, node.ln);
    }
    this.semErr(`cannot find symbol\n  symbol: method ${n}`, node.ln);
  },
  strMethod(s, n, args, node) {
    const [a, b] = args;
    const len = s.length;
    const sioobe = (msg) => this.throwJava('StringIndexOutOfBoundsException', msg);
    const asStr = (x) => x instanceof JChar ? String.fromCharCode(x.c) : typeof x === 'number' ? String.fromCharCode(x) : x;
    const needStr = (x) => { if (x === null) this.throwJava('NullPointerException', null); if (typeof x !== 'string' && !(x instanceof JChar)) this.semErr(`incompatible types: ${this.typeNameOf(x)} cannot be converted to String`, node.ln); return asStr(x); };
    switch (n) {
      case 'length': if (args.length) this.noMethodErr(null, n, args, node.ln); return len;
      case 'charAt': if (typeof a !== 'number') this.semErr(`incompatible types: ${this.typeNameOf(a)} cannot be converted to int`, node.ln); if (a < 0 || a >= len) sioobe(`Index ${a} out of bounds for length ${len}`); return jchar(s.charCodeAt(a));
      case 'codePointAt': if (a < 0 || a >= len) sioobe(`Index ${a} out of bounds for length ${len}`); return s.codePointAt(a);
      case 'substring': case 'subSequence': {
        const e = b === undefined ? len : b;
        if (a < 0 || e > len || a > e) sioobe(`Range [${a}, ${e}) out of bounds for length ${len}`);
        return s.slice(a, e);
      }
      case 'indexOf': return s.indexOf(asStr(a), b || 0);
      case 'lastIndexOf': return b === undefined ? s.lastIndexOf(asStr(a)) : s.lastIndexOf(asStr(a), b);
      case 'contains': return s.includes(needStr(a));
      case 'startsWith': return s.startsWith(needStr(a), b || 0);
      case 'endsWith': return s.endsWith(needStr(a));
      case 'equals': return typeof a === 'string' && a === s;
      case 'equalsIgnoreCase': return typeof a === 'string' && a.toLowerCase() === s.toLowerCase();
      case 'compareTo': if (a === null) this.throwJava('NullPointerException', null); return this.compare(s, needStr(a));
      case 'compareToIgnoreCase': return this.compare(s.toLowerCase(), needStr(a).toLowerCase());
      case 'toUpperCase': return s.toUpperCase();
      case 'toLowerCase': return s.toLowerCase();
      case 'trim': return s.replace(/^[\x00-\x20]+|[\x00-\x20]+$/g, '');
      case 'strip': return s.trim();
      case 'stripLeading': return s.replace(/^\s+/, '');
      case 'stripTrailing': return s.replace(/\s+$/, '');
      case 'isEmpty': return len === 0;
      case 'isBlank': return s.trim().length === 0;
      case 'repeat': if (a < 0) this.throwJava('IllegalArgumentException', 'count is negative: ' + a); return s.repeat(a);
      case 'replace': return s.split(needStr(a)).join(needStr(b));
      case 'replaceAll': return s.replace(new RegExp(a, 'g'), b.replace(/\\\$/g, '$$$$'));
      case 'replaceFirst': return s.replace(new RegExp(a), b);
      case 'matches': return new RegExp('^(?:' + a + ')$').test(s);
      case 'split': {
        let parts;
        if (a.length === 1 && !'.$|()[{^?*+\\'.includes(a)) parts = s.split(a);
        else parts = s.split(new RegExp(a));
        if (b !== undefined && b > 0) {
          const re = a.length === 1 && !'.$|()[{^?*+\\'.includes(a) ? new RegExp(a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g') : new RegExp(a, 'g');
          const out = []; let last = 0, m; re.lastIndex = 0;
          while (out.length < b - 1 && (m = re.exec(s)) !== null) { if (m[0] === '' ) { re.lastIndex++; if (m.index === 0) continue; } out.push(s.slice(last, m.index)); last = m.index + m[0].length; }
          out.push(s.slice(last)); parts = out;
        } else {
          if (parts.length > 1 && parts[0] === '' && s.length > 0) { const m = s.match(new RegExp('^(?:' + a + ')')); if (m && m[0] === '') parts.shift(); }
          if (b === undefined || b === 0) while (parts.length > 1 && parts[parts.length - 1] === '') parts.pop();
          if (s === '') parts = [''];
          else if (parts.length === 1 && parts[0] === '' ) parts = [];
        }
        return new JArray(T_STRING, parts);
      }
      case 'toCharArray': return new JArray(T_CHAR, Array.from({ length: len }, (_, i) => jchar(s.charCodeAt(i))));
      case 'chars': return new JStream(this, Array.from({ length: len }, (_, i) => s.charCodeAt(i)), 'int');
      case 'lines': return new JStream(this, s === '' ? [] : s.replace(/\n$/, '').split(/\r?\n/), 'obj');
      case 'concat': return s + needStr(a);
      case 'hashCode': return strHash(s);
      case 'intern': case 'toString': return s;
      case 'formatted': return jformat(this, s, args);
      case 'describeConstable': return new JOptional(true, s);
      case 'charCount': return 1;
      case 'indent': { const lines = s.replace(/\n$/, '').split('\n'); return lines.map(l => a >= 0 ? ' '.repeat(a) + l : l.replace(new RegExp('^ {0,' + (-a) + '}'), '')).join('\n') + '\n'; }
      case 'translateEscapes': return processEscapes(s, 0, 0);
      case 'getClass': { const r = new ClassRef('String'); r.isClassObj = true; return r; }
      case 'getBytes': return new JArray({ n: 'byte', args: [], dims: 0 }, Array.from(new TextEncoder().encode(s)).map(x => (x << 24) >> 24));
    }
    if (n === 'size' || n === 'getLength') this.semErr(`cannot find symbol\n  symbol:   method ${n}()\n  location: class String\n  (for a String use length())`, node.ln);
    this.semErr(`cannot find symbol\n  symbol:   method ${n}(${args.map(x => this.typeNameOf(x)).join(',')})\n  location: class String`, node.ln);
  }
});

// Thread as a builtin class (so user classes can extend it)
const _origLoadBuiltins = Interp.prototype.loadBuiltinClasses;
Interp.prototype.loadBuiltinClasses = function () {
  _origLoadBuiltins.call(this);
  const obj = this.classes.get('Object');
  const t = this.newClass('Thread', 'class'); t.builtin = true; t.inited = true; t.superclass = obj;
  let threadNo = 0;
  t.nativeCtor = (o, args) => {
    const [a, b] = args;
    o.f.__target = (a !== undefined && typeof a !== 'string') ? a : null;
    o.f.__name = typeof a === 'string' ? a : typeof b === 'string' ? b : 'Thread-' + (threadNo++);
    o.f.__started = false;
  };
  const nat = (n, fn, np) => { t.methods.set(n, [{ n, params: new Array(np || 0).fill({ type: T_OBJ }), ret: T_OBJ, native: fn, cls: t, isStatic: false }]); };
  nat('start', (self) => {
    if (self.f.__started) this.throwJava('IllegalThreadStateException', null);
    self.f.__started = true;
    const prev = this.curThread; this.curThread = self.f.__name;
    try { this.callObjMethod(self, 'run', [], { ln: this.ln }); }
    catch (e) { if (e instanceof JavaThrow) { this.print(`Exception in thread "${self.f.__name}" ` + this.stackTraceText(e.obj), true); } else throw e; }
    finally { this.curThread = prev; }
    return undefined;
  });
  nat('run', (self) => { if (self.f.__target) this.callFn(self.f.__target, []); return undefined; });
  nat('join', () => undefined); t.methods.get('join').push({ n: 'join', params: [{ type: T_OBJ }], ret: T_OBJ, native: () => undefined, cls: t });
  nat('getName', (self) => self.f.__name);
  nat('setName', (self, a) => { self.f.__name = a[0]; return undefined; }, 1);
  nat('isAlive', () => false);
  nat('setDaemon', () => undefined, 1);
  nat('interrupt', () => undefined);
  nat('isInterrupted', () => false);
  nat('setPriority', () => undefined, 1);
  nat('threadId', (self) => this.assignId(self));
  nat('getId', (self) => this.assignId(self));
  nat('isVirtual', () => false);
  this.classes.set('Thread', t);
  BUILTIN_EX.IllegalThreadStateException = 'IllegalArgumentException';
  BUILTIN_EX.RejectedExecutionException = 'RuntimeException';
  BUILTIN_EX.AbstractMethodError = 'Error';
  for (const n of ['IllegalThreadStateException', 'RejectedExecutionException', 'AbstractMethodError']) {
    if (!this.classes.has(n)) {
      const sup = this.classes.get(BUILTIN_EX[n]);
      const c = this.newClass(n, 'class'); c.builtin = true; c.inited = true; c.isThrowable = true; c.superclass = sup; c.nativeCtor = sup.nativeCtor;
      this.classes.set(n, c);
    }
  }
};
