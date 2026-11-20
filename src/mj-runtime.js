// ===== MiniJava runtime =====
class JDouble { constructor(v) { this.v = v; } }
class JChar { constructor(c) { this.c = c; } }
const CHAR_CACHE = [];
function jchar(c) { c &= 0xffff; if (c < 256) return CHAR_CACHE[c] || (CHAR_CACHE[c] = new JChar(c)); return new JChar(c); }
class JArray { constructor(et, a) { this.et = et; this.a = a; this.id = 0; } }
class JObject { constructor(cls) { this.cls = cls; this.f = Object.create(null); this.id = 0; } }
class ClassRef { constructor(name, cls) { this.name = name; this.cls = cls || null; } }
class JLambda { constructor(params, body, env) { this.params = params; this.body = body; this.env = env; this.arity = params.length; } }
class JFunc { constructor(fn, arity, tag) { this.fn = fn; this.arity = arity; this.tag = tag || ''; } }
class JavaThrow { constructor(obj) { this.obj = obj; } }
class LimitError extends Error { constructor(msg, kind) { super(msg); this.kind = kind; } }
class ExitSignal { constructor(code) { this.code = code; } }
const UNINIT = { uninit: true };

class Env {
  constructor(parent, frame) { this.vars = new Map(); this.parent = parent; this.frame = frame || (parent ? parent.frame : null); this.boundary = false; }
  lookup(n) { let e = this; while (e) { const s = e.vars.get(n); if (s) return s; e = e.parent; } return null; }
}

const T_INT = { n: 'int', args: [], dims: 0 }, T_DOUBLE = { n: 'double', args: [], dims: 0 }, T_STRING = { n: 'String', args: [], dims: 0 },
  T_BOOL = { n: 'boolean', args: [], dims: 0 }, T_CHAR = { n: 'char', args: [], dims: 0 }, T_OBJ = { n: 'Object', args: [], dims: 0 }, T_VOID = { n: 'void', args: [], dims: 0 };
function typeStr(t) { if (!t) return '?'; let s = t.n; if (t.args && t.args.length) s += '<' + t.args.map(typeStr).join(',') + '>'; return s + '[]'.repeat(t.dims || 0); }
function elemType(t) { return { n: t.n, args: t.args, dims: t.dims - 1 }; }

// ---- identity hash codes (the classic first values a HotSpot JVM prints) ----
const CLASSIC_HASH = ['2a139a55', '15db9742', '6d06d69c', '7852e922', '4e25154f', '70dea4e', '5c647e05', '33909752', '55f96302', '3d4eac69', '42a57993', '75b84c92'];

// Java string hashCode
function strHash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return h; }
const _dv = new DataView(new ArrayBuffer(8));
function dblHash(d) { if (d === 0 && !Object.is(d, -0)) return 0; if (isNaN(d)) d = NaN; _dv.setFloat64(0, d); const hi = _dv.getInt32(0), lo = _dv.getInt32(4); return (hi ^ lo) | 0; }

// ---- double formatting exactly like Java's Double.toString ----
function fmtDouble(d) {
  if (isNaN(d)) return 'NaN';
  if (d === Infinity) return 'Infinity'; if (d === -Infinity) return '-Infinity';
  if (d === 0) return Object.is(d, -0) ? '-0.0' : '0.0';
  const a = Math.abs(d);
  if (a >= 1e-3 && a < 1e7) { let s = String(d); if (!s.includes('.')) s += '.0'; return s; }
  let [m, e] = d.toExponential().split('e');
  if (!m.includes('.')) m += '.0';
  return m + 'E' + parseInt(e, 10);
}
// %.Nf formatting with HALF_UP on the shortest decimal representation (as java.util.Formatter does)
function fmtFixed(x, p) {
  if (isNaN(x)) return 'NaN';
  if (!isFinite(x)) return x > 0 ? 'Infinity' : '-Infinity';
  const neg = x < 0 || Object.is(x, -0);
  let s = Math.abs(x).toString();
  let [mant, exp] = s.split('e'); exp = exp ? parseInt(exp, 10) : 0;
  let [ip, fp = ''] = mant.split('.');
  let digits = ip + fp, point = ip.length + exp;
  if (point < 0) { digits = '0'.repeat(-point) + digits; point = 0; }
  if (point > digits.length) digits += '0'.repeat(point - digits.length);
  let intPart = digits.slice(0, point) || '0', frac = digits.slice(point);
  if (frac.length <= p) frac += '0'.repeat(p - frac.length);
  else {
    const rd = frac.charCodeAt(p) - 48; frac = frac.slice(0, p);
    if (rd >= 5) {
      const all = (intPart + frac).split('').map(Number); let i = all.length - 1;
      while (i >= 0) { if (all[i] === 9) { all[i] = 0; i--; } else { all[i]++; break; } }
      if (i < 0) all.unshift(1);
      const il = all.length - p; intPart = all.slice(0, il).join(''); frac = all.slice(il).join('');
    }
  }
  intPart = intPart.replace(/^0+(?=\d)/, '');
  const r = p > 0 ? intPart + '.' + frac : intPart;
  return neg ? '-' + r : r;
}
function groupThousands(s) { const [i, f] = s.split('.'); const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, ','); return f !== undefined ? g + '.' + f : g; }

const JAVA_LANG = new Set(['Throwable', 'Exception', 'Error', 'RuntimeException', 'ArithmeticException', 'NullPointerException', 'IllegalArgumentException',
  'IllegalStateException', 'NumberFormatException', 'IndexOutOfBoundsException', 'ArrayIndexOutOfBoundsException', 'StringIndexOutOfBoundsException',
  'ClassCastException', 'UnsupportedOperationException', 'StackOverflowError', 'NegativeArraySizeException', 'InterruptedException', 'CloneNotSupportedException',
  'AssertionError', 'OutOfMemoryError', 'ArrayStoreException', 'SecurityException']);
const JAVA_UTIL_EX = new Set(['NoSuchElementException', 'ConcurrentModificationException', 'InputMismatchException', 'EmptyStackException', 'MissingFormatArgumentException', 'IllegalFormatConversionException', 'UnknownFormatConversionException', 'DuplicateFormatFlagsException']);
const BUILTIN_EX = {
  Throwable: null, Exception: 'Throwable', Error: 'Throwable', RuntimeException: 'Exception',
  ArithmeticException: 'RuntimeException', NullPointerException: 'RuntimeException', IllegalArgumentException: 'RuntimeException',
  IllegalStateException: 'RuntimeException', NumberFormatException: 'IllegalArgumentException', IndexOutOfBoundsException: 'RuntimeException',
  ArrayIndexOutOfBoundsException: 'IndexOutOfBoundsException', StringIndexOutOfBoundsException: 'IndexOutOfBoundsException',
  ClassCastException: 'RuntimeException', UnsupportedOperationException: 'RuntimeException', NegativeArraySizeException: 'RuntimeException',
  NoSuchElementException: 'RuntimeException', InputMismatchException: 'NoSuchElementException', ConcurrentModificationException: 'RuntimeException',
  EmptyStackException: 'RuntimeException', IllegalFormatException: 'IllegalArgumentException', MissingFormatArgumentException: 'IllegalFormatException',
  IllegalFormatConversionException: 'IllegalFormatException', UnknownFormatConversionException: 'IllegalFormatException', DuplicateFormatFlagsException: 'IllegalFormatException',
  ArrayStoreException: 'RuntimeException', SecurityException: 'RuntimeException', MatchException: 'RuntimeException',
  StackOverflowError: 'Error', OutOfMemoryError: 'Error', AssertionError: 'Error',
  IOException: 'Exception', FileNotFoundException: 'IOException', UncheckedIOException: 'RuntimeException', InterruptedException: 'Exception',
  CloneNotSupportedException: 'Exception', TimeoutException: 'Exception', ExecutionException: 'Exception'
};
function qualifiedExName(n) {
  if (JAVA_LANG.has(n) || n === 'MatchException') return 'java.lang.' + n;
  if (JAVA_UTIL_EX.has(n)) return 'java.util.' + n;
  if (n === 'IOException' || n === 'FileNotFoundException' || n === 'UncheckedIOException') return 'java.io.' + n;
  if (n === 'TimeoutException' || n === 'ExecutionException') return 'java.util.concurrent.' + n;
  if (n === 'IllegalFormatException') return 'java.util.' + n;
  return n;
}

class SemanticError extends CompileError { }

class Interp {
  constructor(unit, opts = {}) {
    this.unit = unit; this.opts = opts;
    this.out = []; this.steps = 0; this.maxSteps = opts.maxSteps || 3000000; this.maxOut = opts.maxOut || 200000; this.outLen = 0;
    this.classes = new Map(); this.globals = opts.globals || {};
    this.depth = 0; this.maxDepth = opts.maxDepth || 550; this.ln = 0; this.nextId = 1; this.hashIdx = 0;
    this.stack = []; this.vtime = 0;
    this.stdinText = opts.stdin || ''; this.stdinPos = 0;
    this.staticImports = unit.staticImports || [];
    this.loadBuiltinClasses();
    this.loadUser(unit);
  }
  // ---------- errors ----------
  semErr(msg, ln) { throw new SemanticError(msg, ln || this.ln, 0); }
  tick() { if (++this.steps > this.maxSteps) throw new LimitError('Time limit exceeded', 'steps'); }
  throwJava(name, msg) { throw new JavaThrow(this.makeEx(name, msg)); }
  makeEx(name, msg, cause) {
    const cls = this.classes.get(name);
    const o = new JObject(cls); this.assignId(o);
    o.f.message = msg === undefined ? null : msg; o.f.cause = cause || null;
    this.fillTrace(o);
    return o;
  }
  fillTrace(o) {
    const tr = []; let ln = this.ln;
    for (let i = this.stack.length - 1; i >= 0; i--) { const fr = this.stack[i]; tr.push({ c: fr.c, m: fr.m, ln }); ln = fr.callLn; }
    if (!tr.length) tr.push({ c: 'Main', m: 'main', ln });
    o.__trace = tr;
  }
  assignId(o) { if (!o.id) o.id = this.nextId++; return o.id; }
  identityHash(o) {
    if (!o.__h) {
      const k = this.hashIdx++;
      o.__h = k < CLASSIC_HASH.length ? CLASSIC_HASH[k] : ((Math.imul(this.assignId(o) + 7, 0x9E3779B1) >>> 4) & 0x7fffffff).toString(16);
    }
    return o.__h;
  }
  // ---------- output ----------
  print(s, err) {
    s = String(s);
    this.outLen += s.length;
    if (this.outLen > this.maxOut) throw new LimitError('Output limit exceeded', 'output');
    const last = this.out[this.out.length - 1];
    if (last && last.err === !!err) last.s += s; else this.out.push({ s, err: !!err });
    if (this.opts.onPrint) this.opts.onPrint(s, !!err);
  }
  stdout() { return this.out.filter(o => !o.err).map(o => o.s).join(''); }
  stderr() { return this.out.filter(o => o.err).map(o => o.s).join(''); }

  // ---------- classes ----------
  newClass(name, kind) {
    return { name, kind, superclass: null, ifaces: [], fields: [], staticFields: [], fieldInfo: Object.create(null), methods: new Map(), ctors: [],
      statics: Object.create(null), inited: false, isAbstract: false, decl: null, builtin: false, outer: null, inits: [], staticInits: [] };
  }
  loadBuiltinClasses() {
    const obj = this.newClass('Object', 'class'); obj.builtin = true; obj.inited = true; this.classes.set('Object', obj);
    const mk = (name) => {
      if (this.classes.has(name)) return this.classes.get(name);
      const sup = BUILTIN_EX[name];
      const c = this.newClass(name, 'class'); c.builtin = true; c.inited = true; c.isThrowable = true;
      c.superclass = sup ? mk(sup) : obj;
      c.nativeCtor = (o, args) => {
        if (args.length === 0) { o.f.message = null; o.f.cause = null; }
        else if (args.length === 1) {
          const a = args[0];
          if (a instanceof JObject && this.isInstance(a, 'Throwable')) { o.f.cause = a; o.f.message = this.toStr(a); }
          else { o.f.message = a === null ? null : this.toStr(a); o.f.cause = null; }
        } else { o.f.message = args[0] === null ? null : this.toStr(args[0]); o.f.cause = args[1]; }
        this.fillTrace(o);
      };
      this.classes.set(name, c);
      return c;
    };
    for (const n of Object.keys(BUILTIN_EX)) mk(n);
  }
  loadUser(unit) {
    const decls = [...unit.types];
    if (unit.implicit.members.length) decls.push(unit.implicit);
    this.implicitCls = null;
    for (const d of decls) {
      if (this.classes.has(d.name) && !this.classes.get(d.name).builtin) this.semErr(`duplicate class: ${d.name}`, d.ln);
      const c = this.newClass(d.name, d.kind); c.decl = d; c.outerName = d.outer;
      c.isAbstract = d.kind === 'interface' || (d.mods && d.mods.has('abstract'));
      c.isFinal = d.mods && d.mods.has('final');
      this.classes.set(d.name, c);
      if (d.implicit) this.implicitCls = c;
    }
    for (const d of decls) {
      const c = this.classes.get(d.name);
      if (d.outer) c.outer = this.classes.get(d.outer) || null;
      if (d.superT) {
        const sc = this.classes.get(d.superT.n);
        if (!sc) this.semErr(`cannot find symbol\n  symbol: class ${d.superT.n}`, d.ln);
        if (sc.kind === 'interface') this.semErr(`no interface expected here`, d.ln);
        if (sc.isFinal || sc.kind === 'record' || sc.kind === 'enum') this.semErr(`cannot inherit from final ${sc.name}`, d.ln);
        c.superclass = sc;
      } else if (d.kind !== 'interface') c.superclass = this.classes.get('Object');
      for (const it of d.ifaces) {
        const ic = this.classes.get(it.n);
        if (ic && !ic.builtin) {
          if (ic.kind !== 'interface') this.semErr(`interface expected here`, d.ln);
          c.ifaces.push(ic);
        } else c.ifaces.push({ name: it.n, builtinIface: true, ifaces: [], methods: new Map() });
      }
      if (d.anonBase) {
        const b = this.classes.get(d.anonBase.n);
        if (b && !b.builtin && b.kind !== 'interface') c.superclass = b;
        else if (b && b.builtin) c.superclass = b;
        else if (b) c.ifaces.push(b);
        else c.ifaces.push({ name: d.anonBase.n, builtinIface: true, ifaces: [], methods: new Map() });
      }
      // members
      for (const m of d.members) {
        if (m.k === 'field') {
          const info = { n: m.n, type: m.type, init: m.init, isStatic: m.isStatic, isFinal: m.isFinal, isPrivate: m.mods.has('private'), cls: c, ln: m.ln };
          if (c.fieldInfo[m.n] && c.fieldInfo[m.n].cls === c) this.semErr(`variable ${m.n} is already defined in class ${c.name}`, m.ln);
          c.fieldInfo[m.n] = info;
          (m.isStatic ? c.staticFields : c.fields).push(info);
          if (m.isStatic) c.inits === c.inits; // order kept below
        } else if (m.k === 'method') {
          const mm = { n: m.n, params: m.params, ret: m.ret, body: m.body, isStatic: m.isStatic, isAbstract: m.isAbstract, isDefault: m.isDefault, isPrivate: m.mods.has('private'), cls: c, ln: m.ln };
          if (!c.methods.has(m.n)) c.methods.set(m.n, []);
          const list = c.methods.get(m.n);
          if (list.some(o => o.params.length === mm.params.length && o.params.every((p, i) => typeStr(p.type) === typeStr(mm.params[i].type))))
            this.semErr(`method ${m.n}(${m.params.map(p => typeStr(p.type)).join(',')}) is already defined in ${d.kind} ${c.name}`, m.ln);
          list.push(mm);
        } else if (m.k === 'ctor') c.ctors.push({ params: m.params, body: m.body, cls: c, ln: m.ln, isPrivate: m.mods.has('private') });
        else if (m.k === 'compact') c.compact = m;
        else if (m.k === 'init') (m.isStatic ? c.staticInits : c.inits).push(m);
      }
      c.memberOrder = d.members;
      if (d.kind === 'record') {
        c.isFinal = true;
        c.comps = d.comps;
        for (const comp of d.comps) {
          const info = { n: comp.n, type: comp.type, init: null, isStatic: false, isFinal: true, isPrivate: true, cls: c, ln: d.ln };
          c.fieldInfo[comp.n] = info; c.fields.push(info);
          if (!(c.methods.get(comp.n) || []).some(m => m.params.length === 0)) {
            if (!c.methods.has(comp.n)) c.methods.set(comp.n, []);
            const cn = comp.n;
            c.methods.get(comp.n).push({ n: cn, params: [], ret: comp.type, native: (self) => self.f[cn], cls: c, isStatic: false });
          }
        }
      }
      if (d.kind === 'enum') c.enumConsts = d.enumConsts;
    }
    // check abstract methods implemented
    for (const d of decls) {
      const c = this.classes.get(d.name);
      if (c.kind === 'class' && !c.isAbstract || c.kind === 'enum' || c.kind === 'record') {
        const missing = this.findUnimplemented(c);
        if (missing) this.semErr(`${d.anonBase ? 'anonymous class' : c.name} is not abstract and does not override abstract method ${missing.n}(${missing.params.map(p => typeStr(p.type)).join(',')}) in ${missing.cls.name}`, d.ln);
      }
      // @Override-like check: final methods
    }
  }
  findUnimplemented(c) {
    const abstracts = [];
    const seen = new Set();
    const collect = (k) => {
      if (!k || seen.has(k)) return; seen.add(k);
      if (k.methods) for (const [n, list] of k.methods) for (const m of list) if (m.isAbstract) abstracts.push(m);
      if (k.superclass) collect(k.superclass);
      for (const i of k.ifaces || []) collect(i);
    };
    collect(c);
    for (const a of abstracts) {
      const impl = this.findConcrete(c, a.n, a.params.length);
      if (!impl) return a;
    }
    return null;
  }
  findConcrete(c, n, arity) {
    const seen = new Set();
    const search = (k) => {
      if (!k || seen.has(k)) return null; seen.add(k);
      const list = k.methods && k.methods.get(n);
      if (list) for (const m of list) if (!m.isAbstract && m.params.length === arity && !m.isStatic) return m;
      const s = search(k.superclass); if (s) return s;
      for (const i of k.ifaces || []) { const r = search(i); if (r) return r; }
      return null;
    };
    return search(c);
  }
  ensureInit(c) {
    if (c.inited) return;
    c.inited = true;
    if (c.superclass && !c.superclass.builtin) this.ensureInit(c.superclass);
    const frame = { self: null, cls: c, m: '<clinit>' };
    // static fields defaults
    for (const f of c.staticFields) c.statics[f.n] = this.defaultValue(f.type);
    if (c.kind === 'enum') {
      c.enumValues = [];
      c.enumConsts.forEach((ec, i) => {
        const o = new JObject(c); this.assignId(o);
        o.f.__name = ec.n; o.f.__ordinal = i;
        for (const fi of c.fields) o.f[fi.n] = this.defaultValue(fi.type);
        const env = new Env(null, frame);
        const args = ec.args.map(a => this.eval(a, env));
        this.construct(c, o, args, ec.ln);
        c.statics[ec.n] = o; c.enumValues.push(o);
      });
    }
    for (const m of c.memberOrder || []) {
      if (m.k === 'field' && m.isStatic && m.init) {
        const env = new Env(null, frame);
        this.ln = m.ln;
        c.statics[m.n] = m.init.k === 'arrinit' ? this.buildArray(m.init, m.type, env) : this.coerce(this.eval(m.init, env), m.type, m.ln);
      } else if (m.k === 'init' && m.isStatic) this.exec(m.body, new Env(null, frame));
    }
  }
  defaultValue(t) {
    if (!t || t.dims > 0) return null;
    switch (t.n) {
      case 'int': case 'long': case 'short': case 'byte': return 0;
      case 'double': case 'float': return new JDouble(0);
      case 'boolean': return false;
      case 'char': return jchar(0);
      default: return null;
    }
  }
  // is v an instance of type name tn?
  isInstance(v, tn) {
    if (v === null || v === undefined) return false;
    if (tn === 'Object') return true;
    if (typeof v === 'string') return tn === 'String' || tn === 'CharSequence' || tn === 'Comparable';
    if (typeof v === 'number') return tn === 'Integer' || tn === 'Number' || tn === 'Comparable' || tn === 'Long' || tn === 'Short' || tn === 'Byte';
    if (v instanceof JDouble) return tn === 'Double' || tn === 'Number' || tn === 'Comparable' || tn === 'Float';
    if (v instanceof JChar) return tn === 'Character' || tn === 'Comparable';
    if (typeof v === 'boolean') return tn === 'Boolean';
    if (v instanceof JObject) return this.clsIsA(v.cls, tn);
    if (v instanceof JArray) return tn.endsWith('[]') || tn === 'Cloneable';
    if (v instanceof JLambda || v instanceof JFunc) return !this.classes.has(tn) || this.classes.get(tn).kind === 'interface';
    if (v.isA) return v.isA(tn);
    return false;
  }
  clsIsA(c, tn) {
    const seen = new Set();
    const walk = (k) => {
      if (!k || seen.has(k)) return false; seen.add(k);
      if (k.name === tn) return true;
      if (k.name === 'Throwable' && tn === 'Throwable') return true;
      if (walk(k.superclass)) return true;
      for (const i of k.ifaces || []) if (walk(i)) return true;
      return false;
    };
    if (c.kind === 'enum' && (tn === 'Enum' || tn === 'Comparable')) return true;
    if (c.kind === 'record' && tn === 'Record') return true;
    return walk(c);
  }
  topLevel(c) { while (c && c.outer) c = c.outer; return c; }
  canAccessPrivate(fromCls, ownerCls) { return fromCls && ownerCls && this.topLevel(fromCls) === this.topLevel(ownerCls); }

  // ---------- types / coercion ----------
  typeNameOf(v) {
    if (v === null) return '<null>';
    if (typeof v === 'number') return 'int';
    if (typeof v === 'string') return 'String';
    if (typeof v === 'boolean') return 'boolean';
    if (v instanceof JDouble) return 'double';
    if (v instanceof JChar) return 'char';
    if (v instanceof JArray) return typeStr(v.et) + '[]';
    if (v instanceof JObject) return v.cls.name.startsWith('$Anon') ? '<anonymous>' : v.cls.name;
    if (v instanceof JLambda || v instanceof JFunc) return 'lambda';
    if (v instanceof ClassRef) return 'Class';
    if (v.jtype) return v.jtype();
    return 'Object';
  }
  typeErr(v, T, ln) {
    const from = this.typeNameOf(v), to = typeStr(T);
    if ((from === 'double' && ['int', 'long', 'short', 'byte', 'float', 'char'].includes(to)) || (from === 'int' && ['short', 'byte', 'char'].includes(to)))
      this.semErr(`incompatible types: possible lossy conversion from ${from} to ${to}`, ln);
    this.semErr(`incompatible types: ${from} cannot be converted to ${to}`, ln);
  }
  coerce(v, T, ln) {
    if (!T || T.n === 'var' || v === UNINIT) return v;
    if (T.dims > 0) {
      if (v === null || v instanceof JArray) return v;
      this.typeErr(v, T, ln);
    }
    switch (T.n) {
      case 'int': case 'short': case 'byte':
        if (typeof v === 'number') return T.n === 'int' ? v | 0 : T.n === 'short' ? (v << 16) >> 16 : (v << 24) >> 24;
        if (v instanceof JChar) return v.c;
        if (v === null) this.throwJava('NullPointerException', null);
        return this.typeErr(v, T, ln);
      case 'long':
        if (typeof v === 'number') return v;
        if (v instanceof JChar) return v.c;
        if (v === null) this.throwJava('NullPointerException', null);
        return this.typeErr(v, T, ln);
      case 'double': case 'float':
        if (v instanceof JDouble) return v;
        if (typeof v === 'number') return new JDouble(v);
        if (v instanceof JChar) return new JDouble(v.c);
        if (v === null) this.throwJava('NullPointerException', null);
        return this.typeErr(v, T, ln);
      case 'char':
        if (v instanceof JChar) return v;
        if (typeof v === 'number' && v >= 0 && v <= 0xffff) return jchar(v);
        if (v === null) this.throwJava('NullPointerException', null);
        return this.typeErr(v, T, ln);
      case 'boolean':
        if (typeof v === 'boolean') return v;
        if (v === null) this.throwJava('NullPointerException', null);
        return this.typeErr(v, T, ln);
      case 'Integer': case 'Long': case 'Short': case 'Byte':
        if (v === null || typeof v === 'number') return v;
        if (v instanceof JChar && T.n !== 'Integer') return v.c;
        return this.typeErr(v, T, ln);
      case 'Double': case 'Float':
        if (v === null || v instanceof JDouble) return v;
        if (typeof v === 'number') return new JDouble(v);
        return this.typeErr(v, T, ln);
      case 'Character': if (v === null || v instanceof JChar) return v; return this.typeErr(v, T, ln);
      case 'Boolean': if (v === null || typeof v === 'boolean') return v; return this.typeErr(v, T, ln);
      case 'String':
        if (v === null || typeof v === 'string') return v;
        return this.typeErr(v, T, ln);
      default: {
        const c = this.classes.get(T.n);
        if (c && !c.builtin && v !== null) {
          if (v instanceof JObject) { if (!this.clsIsA(v.cls, T.n)) this.typeErr(v, T, ln); }
          else if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean' || v instanceof JDouble || v instanceof JChar || v instanceof JArray) this.typeErr(v, T, ln);
        }
        return v;
      }
    }
  }
  castTo(v, T, ln) {
    if (T.dims > 0) { if (v === null || v instanceof JArray) return v; this.throwJava('ClassCastException', `class ${this.typeNameOf(v)} cannot be cast to class ${typeStr(T)}`); }
    const num = () => {
      if (typeof v === 'number') return v;
      if (v instanceof JDouble) return v.v;
      if (v instanceof JChar) return v.c;
      if (v === null) this.throwJava('NullPointerException', null);
      this.semErr(`incompatible types: ${this.typeNameOf(v)} cannot be converted to ${T.n}`, ln);
    };
    switch (T.n) {
      case 'int': { if (typeof v === 'number') return v | 0; const x = num(); if (isNaN(x)) return 0; if (x >= 2147483647) return 2147483647; if (x <= -2147483648) return -2147483648; return Math.trunc(x) | 0; }
      case 'long': { const x = num(); if (isNaN(x)) return 0; return Math.trunc(x); }
      case 'short': return (Math.trunc(num()) << 16) >> 16;
      case 'byte': return (Math.trunc(num()) << 24) >> 24;
      case 'char': return jchar(Math.trunc(num()) & 0xffff);
      case 'double': return new JDouble(num());
      case 'float': return new JDouble(num());
      case 'boolean': if (typeof v === 'boolean') return v; this.semErr(`incompatible types: ${this.typeNameOf(v)} cannot be converted to boolean`, ln);
      case 'Object': return v;
      default:
        if (v === null) return null;
        if (['String', 'Integer', 'Double', 'Character', 'Boolean', 'Long'].includes(T.n) || this.classes.has(T.n)) {
          if (!this.isInstance(v, T.n)) this.throwJava('ClassCastException', `class ${this.typeNameOf(v)} cannot be cast to class ${T.n}`);
        }
        return v;
    }
  }
  num(v, opLn) {
    if (typeof v === 'number') return v;
    if (v instanceof JDouble) return v.v;
    if (v instanceof JChar) return v.c;
    if (v === null) this.throwJava('NullPointerException', null);
    return NaN;
  }
  isNumeric(v) { return typeof v === 'number' || v instanceof JDouble || v instanceof JChar; }

  // ---------- toString ----------
  toStr(v) {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (v instanceof JDouble) return fmtDouble(v.v);
    if (v instanceof JChar) return String.fromCharCode(v.c);
    if (v instanceof JArray) {
      const code = { int: 'I', double: 'D', char: 'C', boolean: 'Z', long: 'J', float: 'F', short: 'S', byte: 'B' };
      const et = v.et;
      const p = et.dims > 0 ? '[' : '';
      const base = et.dims > 0 ? (code[et.n] || 'L' + et.n + ';') : (code[et.n] || 'L' + (et.n === 'String' || et.n === 'Object' || et.n === 'Integer' ? 'java.lang.' : '') + et.n + ';');
      return '[' + p + '['.repeat(Math.max(0, et.dims - 1)) + base + '@' + this.identityHash(v);
    }
    if (v instanceof JObject) {
      const m = this.findMethod(v.cls, 'toString', [], false, true);
      if (m && !m.cls.builtin) return this.toStr(this.invoke(m, v, []));
      return this.defaultToString(v);
    }
    if (v instanceof JLambda || v instanceof JFunc) return 'Main$$Lambda@' + this.identityHash(v);
    if (v instanceof ClassRef) return 'class ' + v.name;
    if (v.toJava) return v.toJava(this);
    return String(v);
  }
  binaryName(c) {
    if (!c) return '';
    if (c.name.startsWith('$Anon')) return 'Main$' + c.name.slice(5);
    return c.outer && !c.outer.implicit ? this.binaryName(c.outer) + '$' + c.name : c.name;
  }
  defaultToString(v) {
    const c = v.cls;
    if (c.kind === 'enum') return v.f.__name;
    if (c.kind === 'record') return c.name + '[' + c.comps.map(cp => cp.n + '=' + this.toStr(v.f[cp.n])).join(', ') + ']';
    if (this.clsIsA(c, 'Throwable')) {
      let nm = c.builtin ? qualifiedExName(c.name) : this.binaryName(c);
      const msg = this.exMessage(v);
      return msg === null ? nm : nm + ': ' + msg;
    }
    return this.binaryName(c) + '@' + this.identityHash(v);
  }
  exMessage(v) {
    const m = this.findMethod(v.cls, 'getMessage', [], false, true);
    if (m && !m.cls.builtin) return this.invoke(m, v, []);
    return v.f.message === undefined ? null : v.f.message;
  }

  // ---------- equality / hashing / comparison ----------
  jequals(a, b) {
    if (a === b) return true;
    if (a === null || b === null || a === undefined || b === undefined) return false;
    if (typeof a === 'number') return typeof b === 'number' && a === b;
    if (a instanceof JDouble) return b instanceof JDouble && (a.v === b.v || (isNaN(a.v) && isNaN(b.v)));
    if (a instanceof JChar) return b instanceof JChar && a.c === b.c;
    if (typeof a === 'string' || typeof a === 'boolean') return false;
    if (a instanceof JObject) {
      const m = this.findMethod(a.cls, 'equals', [b], false, true);
      if (m && !m.cls.builtin && !m.native) return this.invoke(m, a, [b]) === true;
      if (a.cls.kind === 'record') return b instanceof JObject && b.cls === a.cls && a.cls.comps.every(cp => this.jequals(a.f[cp.n], b.f[cp.n]));
      return false;
    }
    if (a.jequals) return a.jequals(b, this);
    return false;
  }
  jhash(v) {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return v | 0;
    if (typeof v === 'string') return strHash(v);
    if (typeof v === 'boolean') return v ? 1231 : 1237;
    if (v instanceof JDouble) return dblHash(v.v);
    if (v instanceof JChar) return v.c;
    if (v instanceof JObject) {
      const m = this.findMethod(v.cls, 'hashCode', [], false, true);
      if (m && !m.cls.builtin && !m.native) return this.num(this.invoke(m, v, [])) | 0;
      if (v.cls.kind === 'record') { let h = 0; for (const cp of v.cls.comps) h = (Math.imul(31, h) + this.jhash(v.f[cp.n])) | 0; return h; }
      if (v.cls.kind === 'enum') return strHash(v.cls.name + '.' + v.f.__name);
      return parseInt(this.identityHash(v), 16) | 0;
    }
    if (v.jhash) return v.jhash(this);
    return parseInt(this.identityHash(v), 16) | 0;
  }
  hasCustomEquals(v) {
    const m = this.findMethod(v.cls, 'equals', [null], false, true);
    return m && !m.cls.builtin && !m.native;
  }
  keyOf(v) {
    if (v === null || v === undefined) return 'N';
    switch (typeof v) { case 'string': return 's' + v; case 'number': return 'i' + v; case 'boolean': return 'b' + v; }
    if (v instanceof JDouble) return 'd' + v.v;
    if (v instanceof JChar) return 'c' + v.c;
    if (v instanceof JObject) {
      if (v.cls.kind === 'enum') return 'e' + v.cls.name + '.' + v.f.__name;
      if (this.hasCustomEquals(v)) return 'h' + this.jhash(v);
      if (v.cls.kind === 'record') return 'r' + v.cls.name + '(' + v.cls.comps.map(cp => this.keyOf(v.f[cp.n])).join(',') + ')';
      return 'o' + this.assignId(v);
    }
    if (v.keyOf) return v.keyOf(this);
    return 'o' + this.assignId(v);
  }
  compare(a, b) {
    if (a === null || b === null) this.throwJava('NullPointerException', null);
    if (typeof a === 'string' && typeof b === 'string') {
      const n = Math.min(a.length, b.length);
      for (let i = 0; i < n; i++) { const d = a.charCodeAt(i) - b.charCodeAt(i); if (d) return d; }
      return a.length - b.length;
    }
    if (this.isNumeric(a) && this.isNumeric(b)) { const x = this.num(a), y = this.num(b); return x < y ? -1 : x > y ? 1 : 0; }
    if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : a ? 1 : -1;
    if (a instanceof JObject) {
      if (a.cls.kind === 'enum' && b instanceof JObject && b.cls === a.cls) return a.f.__ordinal - b.f.__ordinal;
      const m = this.findMethod(a.cls, 'compareTo', [b], false, true);
      if (m) return this.num(this.invoke(m, a, [b]));
    }
    if (a && a.jcompare) return a.jcompare(b, this);
    this.throwJava('ClassCastException', `class ${this.typeNameOf(a)} cannot be cast to class java.lang.Comparable`);
  }
  // functional call: lambdas, method refs, objects implementing a functional interface
  callFn(f, args) {
    if (f instanceof JLambda) return this.callLambda(f, args);
    if (f instanceof JFunc) return f.fn(args);
    if (f instanceof JObject) {
      const sam = this.findSam(f.cls, args.length);
      if (sam) return this.invoke(sam, f, args);
    }
    if (f === null) this.throwJava('NullPointerException', null);
    this.semErr(`${this.typeNameOf(f)} is not a functional interface`);
  }
  findSam(c, arity) {
    const names = ['compare', 'apply', 'test', 'accept', 'get', 'run', 'call', 'applyAsInt', 'applyAsDouble', 'applyAsLong', 'compareTo'];
    for (const n of names) { const m = this.findConcrete(c, n, arity); if (m) return m; }
    // any single user method with that arity
    for (const [n, list] of c.methods) for (const m of list) if (!m.isStatic && m.params.length === arity && !m.native) return m;
    return null;
  }
  callLambda(f, args) {
    this.tick();
    if (args.length !== f.params.length) this.semErr(`incompatible parameter types in lambda expression`, f.body.ln);
    const env = new Env(f.env);
    f.params.forEach((p, i) => env.vars.set(p.n, { t: p.type || null, v: p.type ? this.coerce(args[i], p.type) : args[i] }));
    if (f.body.k === 'block') {
      if (++this.depth > this.maxDepth) { this.depth = 0; this.throwJava('StackOverflowError', null); }
      try {
        const r = this.exec(f.body, env);
        return r && r.k === 'ret' ? r.v : undefined;
      } finally { this.depth--; }
    }
    return this.eval(f.body, env);
  }
  truthy(v, ln) {
    if (typeof v === 'boolean') return v;
    this.semErr(`incompatible types: ${this.typeNameOf(v)} cannot be converted to boolean`, ln);
  }
}
