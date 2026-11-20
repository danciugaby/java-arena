// ===== MiniJava evaluator: statements, expressions, dispatch =====
const BRK = { k: 'brk', label: null }, CONT = { k: 'cont', label: null };
const OBJ_BUILTIN_NAMES = new Set(['toString', 'equals', 'hashCode', 'getClass', 'name', 'ordinal', 'compareTo', 'getMessage', 'getCause', 'printStackTrace', 'getLocalizedMessage', 'getStackTrace']);

Object.assign(Interp.prototype, {
  // ---------------- statements ----------------
  // lean dispatcher for the hot paths (small stack frames => deeper recursion)
  exec(s, env, label) {
    this.ln = s.ln || this.ln;
    if (++this.steps > this.maxSteps) throw new LimitError('Time limit exceeded', 'steps');
    switch (s.k) {
      case 'block': return this.execBlock(s, env);
      case 'expr': this.eval(s.e, env); return undefined;
      case 'return': return { k: 'ret', v: s.e ? this.eval(s.e, env) : undefined, ln: s.ln };
      case 'if': return this.truthy(this.eval(s.c, env), s.ln) ? this.exec(s.a, env) : (s.b ? this.exec(s.b, env) : undefined);
      case 'local': return this.execLocal(s, env);
      case 'for': return this.execFor(s, env, label);
      case 'foreach': return this.execForeach(s, env, label);
      case 'while': return this.execWhile(s, env, label);
      case 'do': return this.execDo(s, env, label);
    }
    return this.execSlow(s, env, label);
  },
  execBlock(s, env) {
    const e2 = new Env(env), b = s.body;
    for (let i = 0; i < b.length; i++) { const r = this.exec(b[i], e2); if (r) return r; }
    return undefined;
  },
  execLocal(s, env, label) {
        for (const d of s.decls) {
          this.ln = d.ln;
          let t = s.type;
          if (d.dims) t = { n: t.n, args: t.args, dims: t.dims + d.dims };
          let v = UNINIT;
          if (d.init) {
            if (d.init.k === 'arrinit') {
              if (t.n === 'var' || !t.dims) this.semErr('illegal initializer for ' + typeStr(t), d.ln);
              v = this.buildArray(d.init, t, env);
            } else {
              v = this.eval(d.init, env);
              if (t.n === 'var') { if (v === null) this.semErr("cannot infer type for local variable " + d.n + "\n  (variable initializer is 'null')", d.ln); }
              else v = this.coerce(v, t, d.ln);
            }
          }
          this.declare(env, d.n, t.n === 'var' ? this.inferType(v) : t, v, d.ln, s.isFinal);
        }
        return undefined;
      },
  execWhile(s, env, label) {
        while (true) {
          this.ln = s.ln;
          if (!this.truthy(this.eval(s.c, env), s.ln)) break;
          const r = this.exec(s.body, env);
          if (r) {
            if (r.k === 'brk') { if (!r.label || r.label === label) break; return r; }
            if (r.k === 'cont') { if (!r.label || r.label === label) continue; return r; }
            return r;
          }
        }
        return undefined;
      },
  execDo(s, env, label) {
        while (true) {
          const r = this.exec(s.body, env);
          if (r) {
            if (r.k === 'brk') { if (!r.label || r.label === label) break; return r; }
            if (r.k === 'cont') { if (!(!r.label || r.label === label)) return r; }
            else return r;
          }
          this.ln = s.ln;
          if (!this.truthy(this.eval(s.c, env), s.ln)) break;
        }
        return undefined;
      },
  execFor(s, env, label) {
        const fe = new Env(env);
        for (const i of s.init) this.exec(i, fe);
        while (true) {
          this.ln = s.ln;
          if (s.c && !this.truthy(this.eval(s.c, fe), s.ln)) break;
          const r = this.exec(s.body, fe);
          if (r) {
            if (r.k === 'brk') { if (!r.label || r.label === label) break; return r; }
            if (r.k === 'cont') { if (!(!r.label || r.label === label)) return r; }
            else return r;
          }
          for (const u of s.upd) this.eval(u, fe);
          this.tick();
        }
        return undefined;
      },
  execForeach(s, env, label) {
        const coll = this.eval(s.iter, env);
        if (coll === null) this.throwJava('NullPointerException', `Cannot iterate over "${'collection'}" because it is null`);
        const it = this.iterOf(coll, s.ln);
        for (const item of it) {
          const fe = new Env(env);
          const t = s.type.n === 'var' ? null : s.type;
          fe.vars.set(s.n, { t, v: t ? this.coerce(item, t, s.ln) : item });
          const r = this.exec(s.body, fe);
          if (r) {
            if (r.k === 'brk') { if (!r.label || r.label === label) break; return r; }
            if (r.k === 'cont') { if (!(!r.label || r.label === label)) return r; }
            else return r;
          }
          this.ln = s.ln;
        }
        return undefined;
      },
  execSlow(s, env, label) {
    switch (s.k) {
      case 'block': {
        const e2 = new Env(env);
        const b = s.body;
        for (let i = 0; i < b.length; i++) { const r = this.exec(b[i], e2); if (r) return r; }
        return undefined;
      }
      case 'expr': this.eval(s.e, env); return undefined;






      case 'return': return { k: 'ret', v: s.e ? this.eval(s.e, env) : undefined, ln: s.ln };
      case 'break': return s.label ? { k: 'brk', label: s.label } : BRK;
      case 'continue': return s.label ? { k: 'cont', label: s.label } : CONT;
      case 'yield': return { k: 'yield', v: this.eval(s.e, env) };
      case 'throw': {
        const v = this.eval(s.e, env);
        this.ln = s.ln;
        if (v === null) this.throwJava('NullPointerException', 'Cannot throw exception because value is null');
        if (!(v instanceof JObject) || !this.isInstance(v, 'Throwable')) this.semErr(`incompatible types: ${this.typeNameOf(v)} cannot be converted to Throwable`, s.ln);
        throw new JavaThrow(v);
      }
      case 'try': return this.execTry(s, env);
      case 'switch': return this.execSwitch(s, env, false);
      case 'label': {
        const r = this.exec(s.body, env, s.label);
        if (r && r.k === 'brk' && r.label === s.label) return undefined;
        return r;
      }
      case 'sync': return this.exec(s.body, env);
      case 'empty': return undefined;
      case 'ctorcall': this.semErr(`call to ${s.which} must be first statement in constructor`, s.ln);
      default: this.semErr('unsupported statement: ' + s.k, s.ln);
    }
  },
  inferType(v) {
    if (typeof v === 'number') return T_INT;
    if (v instanceof JDouble) return T_DOUBLE;
    if (v instanceof JChar) return T_CHAR;
    if (typeof v === 'boolean') return T_BOOL;
    if (typeof v === 'string') return T_STRING;
    return null;
  },
  declare(env, n, t, v, ln, isFinal) {
    let e = env;
    while (e) {
      const s = e.vars.get(n);
      if (s && !s.binding) this.semErr(`variable ${n} is already defined in method ${(env.frame && env.frame.m) || 'main'}`, ln);
      if (e.boundary) break;
      e = e.parent;
    }
    env.vars.set(n, { t, v, final: !!isFinal });
  },
  bindVar(env, n, v, t) { env.vars.set(n, { t: t || null, v, binding: true }); },
  execTry(s, env) {
    let r, thrown = null;
    const renv = new Env(env);
    const resources = [];
    try {
      for (const res of s.resources) {
        if (res.k === 'local') { this.exec(res, renv); for (const d of res.decls) resources.push(renv.vars.get(d.n).v); }
        else resources.push(this.eval(res.e, renv));
      }
      r = this.exec(s.block, renv);
    } catch (ex) { thrown = ex; }
    for (let i = resources.length - 1; i >= 0; i--) {
      const res = resources[i];
      if (res === null) continue;
      try { this.invokeOn(res, 'close', [], { ln: s.ln }); } catch (ex2) { if (!thrown) thrown = ex2; }
    }
    if (thrown instanceof RangeError) { this.depth = Math.min(this.depth, 50); thrown = new JavaThrow(this.makeEx('StackOverflowError', null)); }
    if (thrown && thrown instanceof JavaThrow) {
      const c = s.catches.find(c => c.types.some(t => this.isInstance(thrown.obj, t.n)));
      if (c) {
        for (const t of c.types) if (!this.classes.has(t.n)) this.semErr(`cannot find symbol\n  symbol:   class ${t.n}`, c.ln);
        const ce = new Env(env);
        ce.vars.set(c.n, { t: c.types[0], v: thrown.obj });
        thrown = null;
        try { r = this.exec(c.block, ce); } catch (ex3) { thrown = ex3; }
      }
    }
    if (s.fin) {
      const fr = this.exec(s.fin, env);
      if (fr) return fr;
    }
    if (thrown) throw thrown;
    return r;
  },
  valEq(a, b) {
    if (this.isNumeric(a) && this.isNumeric(b)) return this.num(a) === this.num(b);
    return a === b;
  },
  matchPattern(v, pat, env) {
    if (pat.k === 'tpat') {
      if (pat.type.n === 'var') { this.bindVar(env, pat.n, v); return true; }
      const prim = ['int', 'double', 'long', 'boolean', 'char'].includes(pat.type.n);
      if (prim) { if (v === null) return false; this.bindVar(env, pat.n, this.coerce(v, pat.type), pat.type); return true; }
      if (!this.isInstance(v, pat.type.n)) return false;
      this.bindVar(env, pat.n, v, pat.type); return true;
    }
    if (pat.k === 'rpat') {
      if (!(v instanceof JObject) || !this.clsIsA(v.cls, pat.type.n)) return false;
      const c = v.cls;
      if (c.kind !== 'record') this.semErr(`${pat.type.n} is not a record class`, this.ln);
      if (c.comps.length !== pat.subs.length) this.semErr(`incorrect number of nested patterns\n  required: ${c.comps.length}\n  found: ${pat.subs.length}`, this.ln);
      for (let i = 0; i < pat.subs.length; i++) if (!this.matchPattern(v.f[c.comps[i].n], pat.subs[i], env)) return false;
      if (pat.n) this.bindVar(env, pat.n, v);
      return true;
    }
    return false;
  },
  caseMatches(c, sel, env) {
    for (const l of c.labels) {
      if (l.k === 'null') { if (sel === null) return true; continue; }
      if (sel === null) continue;
      if (l.k === 'const') {
        const e = l.e;
        if (sel instanceof JObject && sel.cls.kind === 'enum') {
          const nm = e.k === 'name' ? e.n : e.k === 'field' ? e.n : null;
          if (nm !== null) { if (sel.f.__name === nm) { if (!sel.cls.statics[nm] && !this.classes.get(sel.cls.name)) continue; return true; } continue; }
        }
        const v = this.eval(e, env);
        if (typeof sel === 'string' ? sel === v : this.valEq(sel, v)) return true;
        continue;
      }
      if (this.matchPattern(sel, l, env)) return true;
    }
    return false;
  },
  execSwitch(s, env, isExpr) {
    const sel = this.eval(s.sel, env);
    if (sel === null && !s.cases.some(c => c.labels.some(l => l.k === 'null'))) this.throwJava('NullPointerException', null);
    const senv = new Env(env);
    let start = -1, benv = null;
    for (let i = 0; i < s.cases.length; i++) {
      const c = s.cases[i];
      if (!c.labels.length) continue;
      const ce = new Env(senv);
      if (this.caseMatches(c, sel, ce)) {
        if (c.guard && !this.truthy(this.eval(c.guard, ce), c.ln)) continue;
        start = i; benv = ce; break;
      }
    }
    if (start < 0) { start = s.cases.findIndex(c => c.isDefault); benv = new Env(senv); }
    if (start < 0) {
      if (isExpr || s.cases.some(c => c.labels.some(l => l.k === 'tpat' || l.k === 'rpat'))) this.throwJava('MatchException', null);
      return undefined;
    }
    if (s.arrow) {
      const body = s.cases[start].body;
      if (body.k === 'arrowexpr') { const v = this.eval(body.e, benv); return isExpr ? { k: 'yield', v } : undefined; }
      const r = this.exec(body, benv);
      if (r) {
        if (r.k === 'brk' && !r.label && !isExpr) return undefined;
        return r;
      }
      if (isExpr && body.k === 'block') this.semErr('switch rule completes without providing a value\n  (switch rules in switch expressions should either provide a value or throw)', s.cases[start].ln);
      return undefined;
    }
    for (let i = start; i < s.cases.length; i++) {
      for (const st of s.cases[i].body) {
        const r = this.exec(st, benv);
        if (r) { if (r.k === 'brk' && !r.label && !isExpr) return undefined; return r; }
      }
    }
    return undefined;
  },

  // ---------------- expressions ----------------
  eval(n, env) {
    switch (n.k) {
      case 'lit': return n.v;
      case 'name': return this.resolveName(n.n, env, n.ln);
      case 'call': if (++this.steps > this.maxSteps) throw new LimitError('Time limit exceeded', 'steps'); return n.obj ? this.evalCall(n, env) : this.callUnqualified(n, env);
      case 'bin': if (n.op !== '&&' && n.op !== '||') return this.binop(n.op, this.eval(n.l, env), this.eval(n.r, env), n.ln); break;
      case 'cond': return this.truthy(this.eval(n.c, env), n.ln) ? this.eval(n.a, env) : this.eval(n.b, env);
      case 'paren': return this.eval(n.e, env);
      case 'field': return this.getField(this.eval(n.obj, env), n.n, n, env);
      case 'assign': return this.evalAssign(n, env);
      case 'inc': return this.evalInc(n, env);
      case 'new': if (++this.steps > this.maxSteps) throw new LimitError('Time limit exceeded', 'steps'); return this.evalNew(n, env);
    }
    return this.evalSlow(n, env);
  },
  evalInc(n, env) {
        const ref = this.ref(n.target, env);
        const old = ref.get();
        if (!this.isNumeric(old)) { if (old === null) this.throwJava('NullPointerException', null); this.semErr(`bad operand type ${this.typeNameOf(old)} for unary operator '${n.op}'`, n.ln); }
        const d = n.op === '++' ? 1 : -1;
        let nv;
        if (old instanceof JChar) nv = jchar(old.c + d);
        else if (old instanceof JDouble) nv = new JDouble(old.v + d);
        else nv = old + d;
        if (ref.type && !(old instanceof JChar)) nv = this.castTo(nv, ref.type, n.ln);
        ref.set(nv);
        return n.prefix ? nv : old;
      },
  evalSlow(n, env) {
    switch (n.k) {
      case 'lit': return n.v;
      case 'name': return this.resolveName(n.n, env, n.ln);
      case 'paren': return this.eval(n.e, env);
      case 'bin': {
        const op = n.op;
        if (op === '&&') { if (!this.truthy(this.eval(n.l, env), n.ln)) return false; return this.truthy(this.eval(n.r, env), n.ln); }
        if (op === '||') { if (this.truthy(this.eval(n.l, env), n.ln)) return true; return this.truthy(this.eval(n.r, env), n.ln); }
        const a = this.eval(n.l, env), b = this.eval(n.r, env);
        return this.binop(op, a, b, n.ln);
      }
      case 'call': this.tick(); return this.evalCall(n, env);
      case 'field': return this.getField(this.eval(n.obj, env), n.n, n, env);
      case 'assign': return this.evalAssign(n, env);
      case 'un': {
        const v = this.eval(n.e, env);
        switch (n.op) {
          case '!': if (typeof v !== 'boolean') this.semErr(`bad operand type ${this.typeNameOf(v)} for unary operator '!'`, n.ln); return !v;
          case '-': if (v instanceof JDouble) return new JDouble(-v.v); if (!this.isNumeric(v)) this.semErr(`bad operand type ${this.typeNameOf(v)} for unary operator '-'`, n.ln); return 0 - this.num(v);
          case '+': if (v instanceof JChar) return v.c; return v;
          case '~': return ~this.num(v);
        }
        break;
      }
      case 'cond': return this.truthy(this.eval(n.c, env), n.ln) ? this.eval(n.a, env) : this.eval(n.b, env);
      case 'this': if (!env.frame || !env.frame.self) this.semErr('non-static variable this cannot be referenced from a static context', n.ln); return env.frame.self;
      case 'new': this.tick(); return this.evalNew(n, env);
      case 'newarr': return this.evalNewArr(n, env);
      case 'idx': {
        const arr = this.eval(n.arr, env), i = this.eval(n.i, env);
        return arr === null ? this.throwJava('NullPointerException', `Cannot load from array because "${this.srcText(n.arr)}" is null`) : this.arrGet(arr, i, n.ln);
      }
      case 'cast': return this.castTo(this.eval(n.e, env), n.type, n.ln);
      case 'instof': {
        const v = this.eval(n.e, env);
        if (n.pat) return this.matchPattern(v, n.pat, env);
        const tn = n.type.dims ? typeStr(n.type) : n.type.n;
        if (!n.type.dims && !this.classes.has(tn) && !KNOWN_TYPES.has(tn)) this.semErr(`cannot find symbol\n  symbol:   class ${tn}`, n.ln);
        const r = n.type.dims ? (v instanceof JArray) : this.isInstance(v, tn);
        if (r && n.bind) this.bindVar(env, n.bind, v, n.type);
        return r;
      }
      case 'lambda': return new JLambda(n.params, n.body, env);
      case 'mref': return this.evalMref(n, env);
      case 'switchx': {
        const r = this.execSwitch(n, env, true);
        if (r && r.k === 'yield') return r.v;
        if (r && r.k === 'ret') this.semErr('attempt to return out of a switch expression', n.ln);
        this.semErr('switch expression does not have any result expressions', n.ln);
      }
      case 'classlit': { const t = this.eval(n.e, env); const cr = new ClassRef(t instanceof ClassRef ? t.name : String(t)); cr.isClassObj = true; return cr; }
      case 'typeexpr': return new ClassRef(typeStr(n.type));
      case 'arrinit': this.semErr('illegal start of expression (array initializer is only allowed in a declaration)', n.ln);
      case 'super': this.semErr("'.' expected", n.ln);
    }
    this.semErr('unsupported expression: ' + n.k, n.ln);
  },
  srcText(e) {
    if (!e) return '';
    switch (e.k) {
      case 'name': return e.n; case 'field': return this.srcText(e.obj) + '.' + e.n;
      case 'call': return (e.obj ? this.srcText(e.obj) + '.' : '') + e.n + '(...)';
      case 'idx': return this.srcText(e.arr) + '[...]'; case 'this': return 'this'; case 'paren': return this.srcText(e.e);
      default: return '<expression>';
    }
  },
  binop(op, a, b, ln) {
    switch (op) {
      case '+':
        if (typeof a === 'string' || typeof b === 'string') {
          if (a === undefined || b === undefined) this.semErr("'void' type not allowed here", ln);
          return this.toStr(a) + this.toStr(b);
        }
      // fallthrough
      case '-': case '*': case '/': case '%': {
        if (!this.isNumeric(a) || !this.isNumeric(b)) {
          if ((a === null && this.isNumeric(b)) || (b === null && this.isNumeric(a))) this.throwJava('NullPointerException', null);
          this.semErr(`bad operand types for binary operator '${op}'\n  first type:  ${this.typeNameOf(a)}\n  second type: ${this.typeNameOf(b)}`, ln);
        }
        const x = this.num(a), y = this.num(b);
        if (a instanceof JDouble || b instanceof JDouble) {
          switch (op) { case '+': return new JDouble(x + y); case '-': return new JDouble(x - y); case '*': return new JDouble(x * y); case '/': return new JDouble(x / y); case '%': return new JDouble(x % y); }
        }
        switch (op) {
          case '+': return x + y;
          case '-': return x - y;
          case '*': return (x * y) || 0;
          case '/': if (y === 0) this.throwJava('ArithmeticException', '/ by zero'); return Math.trunc(x / y) || 0;
          case '%': if (y === 0) this.throwJava('ArithmeticException', '/ by zero'); return (x % y) || 0;
        }
        break;
      }
      case '<': case '>': case '<=': case '>=': {
        if (!this.isNumeric(a) || !this.isNumeric(b)) {
          if (a === null || b === null) this.throwJava('NullPointerException', null);
          this.semErr(`bad operand types for binary operator '${op}'\n  first type:  ${this.typeNameOf(a)}\n  second type: ${this.typeNameOf(b)}`, ln);
        }
        const x = this.num(a), y = this.num(b);
        return op === '<' ? x < y : op === '>' ? x > y : op === '<=' ? x <= y : x >= y;
      }
      case '==': return this.valEq(a, b);
      case '!=': return !this.valEq(a, b);
      case '&': if (typeof a === 'boolean' && typeof b === 'boolean') return a && b; return this.num(a) & this.num(b);
      case '|': if (typeof a === 'boolean' && typeof b === 'boolean') return a || b; return this.num(a) | this.num(b);
      case '^': if (typeof a === 'boolean' && typeof b === 'boolean') return a !== b; return this.num(a) ^ this.num(b);
      case '<<': return this.num(a) << (this.num(b) & 31);
      case '>>': return this.num(a) >> (this.num(b) & 31);
      case '>>>': return (this.num(a) >>> (this.num(b) & 31)) | 0;
    }
    this.semErr('bad operator ' + op, ln);
  },
  arrGet(arr, i, ln) {
    if (!(arr instanceof JArray)) this.semErr(`array required, but ${this.typeNameOf(arr)} found`, ln);
    if (i instanceof JChar) i = i.c;
    if (typeof i !== 'number') this.semErr(i instanceof JDouble ? 'incompatible types: possible lossy conversion from double to int' : `incompatible types: ${this.typeNameOf(i)} cannot be converted to int`, ln);
    if (i < 0 || i >= arr.a.length) this.throwJava('ArrayIndexOutOfBoundsException', `Index ${i} out of bounds for length ${arr.a.length}`);
    return arr.a[i];
  },
  buildArray(init, T, env) {
    const et = elemType(T);
    return new JArray(et, init.elems.map(e => {
      if (e.k === 'arrinit') { if (et.dims < 1) this.semErr('illegal initializer for ' + typeStr(et), e.ln); return this.buildArray(e, et, env); }
      return this.coerce(this.eval(e, env), et, e.ln);
    }));
  },
  evalNewArr(n, env) {
    const T = { n: n.elem.n, args: n.elem.args, dims: n.total };
    if (n.init) return this.buildArray(n.init, T, env);
    const sizes = n.dims.map(d => {
      let v = this.eval(d, env);
      if (v instanceof JChar) v = v.c;
      if (typeof v !== 'number') this.semErr(`incompatible types: ${this.typeNameOf(v)} cannot be converted to int`, n.ln);
      if (v < 0) this.throwJava('NegativeArraySizeException', String(v));
      return v;
    });
    const make = (k, t) => {
      const et = elemType(t);
      if (k === sizes.length - 1) { const dv = this.defaultValue(et); return new JArray(et, new Array(sizes[k]).fill(dv)); }
      const a = new Array(sizes[k]); for (let i = 0; i < sizes[k]; i++) a[i] = make(k + 1, et);
      return new JArray(et, a);
    };
    return make(0, T);
  },
  // ---------------- names & fields ----------------
  fieldLookup(c, n) {
    const seen = new Set();
    const walk = (k) => {
      if (!k || seen.has(k)) return null; seen.add(k);
      const fi = k.fieldInfo && k.fieldInfo[n]; if (fi) return fi;
      const s = walk(k.superclass); if (s) return s;
      for (const i of k.ifaces || []) { const r = walk(i); if (r) return r; }
      return null;
    };
    return walk(c);
  },
  checkPrivateField(fi, env, ln) {
    if (fi.isPrivate) {
      const from = env && env.frame ? env.frame.cls : null;
      if (!this.canAccessPrivate(from, fi.cls)) this.semErr(`${fi.n} has private access in ${fi.cls.name}`, ln);
    }
  },
  resolveName(n, env, ln) {
    const s = env.lookup(n);
    if (s) { if (s.v === UNINIT) this.semErr(`variable ${n} might not have been initialized`, ln); return s.v; }
    let fr = env.frame;
    while (fr) {
      if (fr.self instanceof JObject) {
        const fi = this.fieldLookup(fr.self.cls, n);
        if (fi && !fi.isStatic) { this.checkPrivateField(fi, { frame: fr }, ln); return fr.self.f[n]; }
      }
      let k = fr.cls;
      while (k) {
        const fi = this.fieldLookup(k, n);
        if (fi) {
          if (fi.isStatic) { this.ensureInit(fi.cls); return fi.cls.statics[n]; }
          if (!fr.self) this.semErr(`non-static variable ${n} cannot be referenced from a static context`, ln);
        }
        if (k.kind === 'enum' && k.statics[n] !== undefined) return k.statics[n];
        k = k.outer;
      }
      fr = fr.outer;
    }
    if (Object.prototype.hasOwnProperty.call(this.globals, n)) return this.globals[n];
    for (const imp of this.staticImports) {
      const parts = imp.split('.'); const last = parts.pop(); const cn = parts.pop();
      if (last === '*' || last === n) { const v = this.builtinStaticField(cn, n, null, true); if (v !== undefined) return v; }
    }
    const c = this.classes.get(n);
    if (c) return c._ref || (c._ref = new ClassRef(n, c));
    if (BUILTIN_STATIC_CLASSES.has(n)) return new ClassRef(n);
    this.semErr(`cannot find symbol\n  symbol:   variable ${n}`, ln);
  },
  getField(o, name, node, env) {
    if (o instanceof ClassRef) {
      const c = o.cls || this.classes.get(o.name);
      if (c && !c.builtin) {
        this.ensureInit(c);
        const fi = this.fieldLookup(c, name);
        if (fi && fi.isStatic) { this.checkPrivateField(fi, env, node.ln); return fi.cls.statics[name]; }
        if (fi) this.semErr(`non-static variable ${name} cannot be referenced from a static context`, node.ln);
        if (c.statics[name] !== undefined) return c.statics[name];
        const nested = this.classes.get(name);
        if (nested && nested.outer === c) return nested._ref || (nested._ref = new ClassRef(name, nested));
        if (name === 'length') this.semErr(`cannot find symbol\n  symbol:   variable length`, node.ln);
        this.semErr(`cannot find symbol\n  symbol:   variable ${name}\n  location: class ${c.name}`, node.ln);
      }
      const v = this.builtinStaticField(o.name, name, node, false);
      return v;
    }
    if (o === null || o === undefined) this.throwJava('NullPointerException', `Cannot read field "${name}" because "${this.srcText(node.obj)}" is null`);
    if (o instanceof JArray) { if (name === 'length') return o.a.length; }
    if (o instanceof JObject) {
      const fi = this.fieldLookup(o.cls, name);
      if (fi) { this.checkPrivateField(fi, env, node.ln); return fi.isStatic ? (this.ensureInit(fi.cls), fi.cls.statics[name]) : o.f[name]; }
      this.semErr(`cannot find symbol\n  symbol:   variable ${name}\n  location: class ${o.cls.name}`, node.ln);
    }
    if (typeof o === 'string' && name === 'length') this.semErr(`cannot find symbol\n  symbol:   variable length\n  location: class String\n  (String has a method length(), not a field: write s.length())`, node.ln);
    if (o && o.jfield) { const v = o.jfield(name, this); if (v !== undefined) return v; }
    this.semErr(`cannot find symbol\n  symbol:   variable ${name}\n  location: ${this.typeNameOf(o)}`, node.ln);
  },
  ref(t, env) {
    if (t.k === 'name') {
      const n = t.n;
      const s = env.lookup(n);
      if (s) return {
        get: () => { if (s.v === UNINIT) this.semErr(`variable ${n} might not have been initialized`, t.ln); return s.v; },
        set: (v) => { if (s.final && s.v !== UNINIT) this.semErr(`cannot assign a value to final variable ${n}`, t.ln); s.v = v; }, type: s.t
      };
      let fr = env.frame;
      while (fr) {
        if (fr.self instanceof JObject) {
          const fi = this.fieldLookup(fr.self.cls, n);
          if (fi && !fi.isStatic) return this.fieldRef(fr.self, fi, { frame: fr }, t.ln);
        }
        let k = fr.cls;
        while (k) {
          const fi = this.fieldLookup(k, n);
          if (fi) {
            if (fi.isStatic) { this.ensureInit(fi.cls); return this.staticRef(fi, { frame: fr }, t.ln); }
            if (!fr.self) this.semErr(`non-static variable ${n} cannot be referenced from a static context`, t.ln);
          }
          k = k.outer;
        }
        fr = fr.outer;
      }
      this.semErr(`cannot find symbol\n  symbol:   variable ${n}`, t.ln);
    }
    if (t.k === 'field') {
      const o = this.eval(t.obj, env);
      if (o instanceof ClassRef) {
        const c = o.cls || this.classes.get(o.name);
        if (c && !c.builtin) { this.ensureInit(c); const fi = this.fieldLookup(c, t.n); if (fi && fi.isStatic) return this.staticRef(fi, env, t.ln); }
        this.semErr(`cannot assign a value to ${o.name}.${t.n}`, t.ln);
      }
      if (o === null) this.throwJava('NullPointerException', `Cannot assign field "${t.n}" because "${this.srcText(t.obj)}" is null`);
      if (o instanceof JObject) {
        const fi = this.fieldLookup(o.cls, t.n);
        if (!fi) this.semErr(`cannot find symbol\n  symbol:   variable ${t.n}\n  location: class ${o.cls.name}`, t.ln);
        if (fi.isStatic) return this.staticRef(fi, env, t.ln);
        return this.fieldRef(o, fi, env, t.ln);
      }
      if (o instanceof JArray && t.n === 'length') this.semErr('cannot assign a value to final variable length', t.ln);
      this.semErr(`cannot find symbol\n  symbol:   variable ${t.n}`, t.ln);
    }
    if (t.k === 'idx') {
      const arr = this.eval(t.arr, env); let i = this.eval(t.i, env);
      if (arr === null) this.throwJava('NullPointerException', `Cannot store to array because "${this.srcText(t.arr)}" is null`);
      if (!(arr instanceof JArray)) this.semErr(`array required, but ${this.typeNameOf(arr)} found`, t.ln);
      if (i instanceof JChar) i = i.c;
      if (typeof i !== 'number') this.semErr(`incompatible types: ${this.typeNameOf(i)} cannot be converted to int`, t.ln);
      if (i < 0 || i >= arr.a.length) this.throwJava('ArrayIndexOutOfBoundsException', `Index ${i} out of bounds for length ${arr.a.length}`);
      return { get: () => arr.a[i], set: (v) => { arr.a[i] = v; }, type: arr.et };
    }
    this.semErr('unexpected type', t.ln);
  },
  fieldRef(o, fi, env, ln) {
    this.checkPrivateField(fi, env, ln);
    return {
      get: () => o.f[fi.n],
      set: (v) => {
        if (fi.isFinal) {
          const fr = env.frame;
          if (!(fr && fr.m === '<init>' && fr.self === o)) this.semErr(`cannot assign a value to final variable ${fi.n}`, ln);
        }
        o.f[fi.n] = v;
      }, type: fi.type
    };
  },
  staticRef(fi, env, ln) {
    this.checkPrivateField(fi, env, ln);
    return {
      get: () => fi.cls.statics[fi.n],
      set: (v) => { if (fi.isFinal && !(env.frame && env.frame.m === '<clinit>')) this.semErr(`cannot assign a value to final variable ${fi.n}`, ln); fi.cls.statics[fi.n] = v; }, type: fi.type
    };
  },
  evalAssign(n, env) {
    const ref = this.ref(n.target, env);
    let v = this.eval(n.v, env);
    if (n.op === '=') {
      if (v === undefined) this.semErr("incompatible types: 'void' cannot be converted to a value", n.ln);
      v = this.coerce(v, ref.type, n.ln);
    } else {
      const cur = ref.get();
      v = this.binop(n.op.slice(0, -1), cur, v, n.ln);
      if (ref.type) v = (ref.type.n === 'String' && !ref.type.dims) ? v : this.castTo(v, ref.type, n.ln);
    }
    ref.set(v);
    return v;
  },
  // ---------------- methods ----------------
  argScore(v, T) {
    if (!T) return 0;
    if (T.dims > 0) return v instanceof JArray ? (v.et.n === T.n || T.n === 'Object' || !PRIMS.has(T.n) ? 3 : -1) : v === null ? 1 : -1;
    switch (T.n) {
      case 'int': case 'short': case 'byte': return typeof v === 'number' ? 3 : v instanceof JChar ? 2 : -1;
      case 'long': return typeof v === 'number' ? 2 : v instanceof JChar ? 1 : -1;
      case 'double': case 'float': return v instanceof JDouble ? 3 : (typeof v === 'number' || v instanceof JChar) ? 1 : -1;
      case 'char': return v instanceof JChar ? 3 : -1;
      case 'boolean': return typeof v === 'boolean' ? 3 : -1;
      case 'String': case 'CharSequence': return typeof v === 'string' ? 3 : v === null ? 1 : -1;
      case 'Integer': case 'Long': case 'Short': case 'Byte': return typeof v === 'number' ? 3 : v === null ? 1 : -1;
      case 'Double': case 'Float': return v instanceof JDouble ? 3 : v === null ? 1 : typeof v === 'number' ? 1 : -1;
      case 'Character': return v instanceof JChar ? 3 : v === null ? 1 : -1;
      case 'Boolean': return typeof v === 'boolean' ? 3 : v === null ? 1 : -1;
      case 'Object': return 0;
      default: {
        if (v === null) return 1;
        const c = this.classes.get(T.n);
        if (c && !c.builtin) {
          if (v instanceof JObject) return this.clsIsA(v.cls, T.n) ? 2 : -1;
          if (v instanceof JLambda || v instanceof JFunc) return c.kind === 'interface' ? 1 : -1;
          return -1;
        }
        if (c && c.builtin) return v instanceof JObject && this.clsIsA(v.cls, T.n) ? 2 : -1;
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v instanceof JDouble || v instanceof JChar) {
          return T.n === 'Comparable' || T.n === 'Number' ? 1 : (T.n.length === 1 || /^[A-Z]$|^[A-Z][0-9]$/.test(T.n)) ? 0 : (KNOWN_TYPES.has(T.n) ? -1 : 0);
        }
        if (v && v.isA && KNOWN_TYPES.has(T.n)) return v.isA(T.n) ? 2 : -1;
        return 0;
      }
    }
  },
  matchScore(params, args) {
    const np = params.length;
    const va = np && params[np - 1].varargs;
    if (!va) {
      if (args.length !== np) return null;
      let s = 0; for (let i = 0; i < np; i++) { const x = this.argScore(args[i], params[i].type); if (x < 0) return null; s += x; }
      return s;
    }
    if (args.length === np && (args[np - 1] instanceof JArray || args[np - 1] === null)) {
      let s = 0; for (let i = 0; i < np; i++) { const x = this.argScore(args[i], params[i].type); if (x < 0) return null; s += x; } return s;
    }
    if (args.length < np - 1) return null;
    let s = 0;
    for (let i = 0; i < np - 1; i++) { const x = this.argScore(args[i], params[i].type); if (x < 0) return null; s += x; }
    const et = elemType(params[np - 1].type);
    for (let i = np - 1; i < args.length; i++) { const x = this.argScore(args[i], et); if (x < 0) return null; s += x; }
    return s - 1;
  },
  findMethod(c, n, args, staticOnly, quiet) {
    if (!c) return null;
    const ck = n + '/' + args.length + (staticOnly ? 's' : '');
    const cache = c._mc || (c._mc = new Map());
    const hit = cache.get(ck);
    if (hit !== undefined) {
      if (hit === null) return null;
      if (this.matchScore(hit.params, args) !== null) return hit;
    }
    const res = this.findMethodSlow(c, n, args, staticOnly);
    // cache only unambiguous lookups (a single candidate of this arity)
    if (res && !this._ambiguous) cache.set(ck, res);
    else if (!res && this._noCands) cache.set(ck, null);
    return res;
  },
  findMethodSlow(c, n, args, staticOnly) {
    const cands = []; const seen = new Set();
    const walk = (k, depth) => {
      if (!k || seen.has(k)) return; seen.add(k);
      const list = k.methods && k.methods.get(n);
      if (list) for (const m of list) cands.push({ m, depth });
      walk(k.superclass, depth + 1);
      for (const i of k.ifaces || []) walk(i, depth + 100);
    };
    walk(c, 0);
    let best = null, bestScore = -Infinity, sameArity = 0;
    for (const { m } of cands) { const np = m.params.length; if (np === args.length || (np && m.params[np - 1].varargs)) sameArity++; }
    this._ambiguous = sameArity > 1 || cands.some(({ m }) => m.native || (m.params.length && m.params[m.params.length - 1].varargs));
    this._noCands = cands.length === 0;
    for (const { m, depth } of cands) {
      if (staticOnly && !m.isStatic) continue;
      const s = this.matchScore(m.params, args);
      if (s === null) continue;
      const score = s * 1000 - depth - (m.isAbstract ? 500 : 0);
      if (score > bestScore) { best = m; bestScore = score; }
    }
    return best;
  },
  hasMethodNamed(c, n) {
    const seen = new Set(); const all = [];
    const walk = (k) => { if (!k || seen.has(k)) return; seen.add(k); const l = k.methods && k.methods.get(n); if (l) all.push(...l); walk(k.superclass); for (const i of k.ifaces || []) walk(i); };
    walk(c); return all;
  },
  noMethodErr(c, n, args, ln) {
    const all = c ? this.hasMethodNamed(c, n) : [];
    const found = args.map(a => this.typeNameOf(a)).join(',');
    if (all.length) {
      const m = all[0];
      const req = m.params.map(p => typeStr(p.type)).join(',') || 'no arguments';
      const reason = m.params.length !== args.length ? 'actual and formal argument lists differ in length' : 'argument mismatch';
      this.semErr(`method ${n} in ${m.cls.kind === 'interface' ? 'interface' : 'class'} ${m.cls.name} cannot be applied to given types;\n  required: ${req}\n  found:    ${found || 'no arguments'}\n  reason: ${reason}`, ln);
    }
    this.semErr(`cannot find symbol\n  symbol:   method ${n}(${found})${c && !c.implicit ? '\n  location: class ' + c.name : ''}`, ln);
  },
  invoke(m, self, args, ln) {
    if (++this.steps > this.maxSteps) throw new LimitError('Time limit exceeded', 'steps');
    if (m.native) return m.native(self, args);
    if (!m.body) this.throwJava('AbstractMethodError', m.n);
    if (++this.depth > this.maxDepth) { const d = this.depth; this.depth--; const ex = this.makeEx('StackOverflowError', null); throw new JavaThrow(ex); }
    const frame = { self, cls: m.cls, m: m.n };
    if (self && self.__outerFrame) frame.outer = self.__outerFrame;
    const env = new Env(self && self.__env ? self.__env : null, frame);
    env.boundary = true;
    const ps = m.params, np = ps.length;
    if (np && ps[np - 1].varargs && !(args.length === np && (args[np - 1] instanceof JArray || args[np - 1] === null))) {
      const et = elemType(ps[np - 1].type);
      args = [...args.slice(0, np - 1), new JArray(et, args.slice(np - 1).map(x => this.coerce(x, et, m.ln)))];
    }
    for (let i = 0; i < np; i++) env.vars.set(ps[i].n, { t: ps[i].type, v: this.coerce(args[i], ps[i].type, this.ln) });
    const callLn = this.ln;
    this.stack.push({ c: this.binaryName(m.cls), m: m.n, callLn });
    let r;
    try {
      const b = m.body.body;
      for (let i = 0; i < b.length; i++) { r = this.exec(b[i], env); if (r) break; }
    }
    finally { this.depth--; this.stack.pop(); }
    this.ln = callLn;
    const isVoid = m.ret.n === 'void' && !m.ret.dims;
    if (r && r.k === 'ret') {
      if (isVoid) { if (r.v !== undefined) this.semErr('incompatible types: unexpected return value', r.ln); return undefined; }
      if (r.v === undefined) this.semErr('incompatible types: missing return value', r.ln);
      return this.coerce(r.v, m.ret, r.ln);
    }
    if (!isVoid) this.semErr('missing return statement', m.body.endLn || m.ln);
    return undefined;
  },
  callUnqualified(n, env) {
    const args = n.args.map(a => this.eval(a, env));
    let fr = env.frame;
    while (fr) {
      if (fr.self instanceof JObject) {
        const m = this.findMethod(fr.self.cls, n.n, args, false, true);
        if (m) return this.invoke(m, m.isStatic ? null : fr.self, args);
        if (OBJ_BUILTIN_NAMES.has(n.n) && (fr.self.cls.kind === 'enum' || this.clsIsA(fr.self.cls, 'Throwable') || ['toString', 'hashCode', 'equals', 'getClass'].includes(n.n)))
          return this.objectBuiltinMethod(fr.self, n.n, args, n, false);
      }
      let k = fr.cls;
      while (k) {
        if (k.kind === 'enum' && (n.n === 'values' || n.n === 'valueOf')) return this.callStatic(new ClassRef(k.name, k), n.n, args, n, env);
        const m = this.findMethod(k, n.n, args, false, true);
        if (m) {
          if (m.isStatic) { this.ensureInit(m.cls); return this.invoke(m, null, args); }
          if (fr.self && this.clsIsA(fr.self.cls, k.name)) return this.invoke(m, fr.self, args);
          this.semErr(`non-static method ${n.n}(${m.params.map(p => typeStr(p.type)).join(',')}) cannot be referenced from a static context`, n.ln);
        }
        k = k.outer;
      }
      fr = fr.outer;
    }
    return this.callUnqualifiedRest(n, env, args);
  },
  callUnqualifiedRest(n, env, args) {
    if (this.implicitCls && env.frame && env.frame.cls !== this.implicitCls) {
      const m = this.findMethod(this.implicitCls, n.n, args, false, true);
      if (m && m.isStatic) return this.invoke(m, null, args);
    }
    for (const imp of this.staticImports) {
      const parts = imp.split('.'); const last = parts.pop(); const cn = parts.pop();
      if (last === '*' || last === n.n) {
        const uc = this.classes.get(cn);
        if (uc && !uc.builtin) { const m = this.findMethod(uc, n.n, args, true, true); if (m) return this.invoke(m, null, args); }
        else if (BUILTIN_STATIC_CLASSES.has(cn)) return this.builtinStatic(cn, n.n, args, n);
      }
    }
    if (Object.prototype.hasOwnProperty.call(this.globals, n.n) && typeof this.globals[n.n] === 'function') return this.globals[n.n](args);
    this.noMethodErr(env.frame && env.frame.cls, n.n, args, n.ln);
  },
  evalCall(n, env) {
    if (!n.obj) return this.callUnqualified(n, env);
    if (n.obj.k === 'super') {
      const fr = env.frame;
      if (!fr || !fr.self) this.semErr('non-static variable super cannot be referenced from a static context', n.ln);
      const args = n.args.map(a => this.eval(a, env));
      const sc = fr.cls.superclass;
      let m = sc && !sc.builtin ? this.findMethod(sc, n.n, args, false, true) : null;
      if (!m) for (const i of fr.cls.ifaces) { if (!i.builtinIface) { m = this.findMethod(i, n.n, args, false, true); if (m) break; } }
      if (m) { if (m.isAbstract) this.semErr(`abstract method ${n.n}() in class ${m.cls.name} cannot be accessed directly`, n.ln); return this.invoke(m, fr.self, args); }
      return this.objectBuiltinMethod(fr.self, n.n, args, n, true);
    }
    const target = this.eval(n.obj, env);
    const args = n.args.map(a => this.eval(a, env));
    if (n.n === 'remove' && args.length === 1 && typeof args[0] === 'number' && target instanceof JList && this.isBoxedExpr(n.args[0], env)) {
      this._boxedArg = true;
      try { return this.invokeOn(target, n.n, args, n, env); } finally { this._boxedArg = false; }
    }
    return this.invokeOn(target, n.n, args, n, env);
  },
  isBoxedExpr(e, env) {
    switch (e.k) {
      case 'paren': return this.isBoxedExpr(e.e, env);
      case 'cast': return !PRIMS.has(e.type.n);
      case 'name': { const s = env.lookup(e.n); return !!(s && s.t && !PRIMS.has(s.t.n) && !s.t.dims); }
      case 'call': return ['valueOf', 'get', 'getFirst', 'getLast', 'peek', 'poll', 'next', 'getKey', 'getValue', 'max', 'min', 'pop', 'element'].includes(e.n);
      default: return false;
    }
  },
  invokeOn(target, name, args, node, env) {
    if (target === null || target === undefined) {
      if (target === undefined) this.semErr("void cannot be dereferenced", node.ln);
      this.throwJava('NullPointerException', `Cannot invoke "${this.typeHint(node)}${name}()" because "${node.obj ? this.srcText(node.obj) : 'value'}" is null`);
    }
    if (target instanceof JObject) return this.callObjMethod(target, name, args, node, env);
    if (typeof target === 'string') return this.strMethod(target, name, args, node);
    if (target instanceof ClassRef) {
      if (target.isClassObj) return this.classObjMethod(target, name, args, node);
      return this.callStatic(target, name, args, node, env);
    }
    if (typeof target === 'number' || target instanceof JDouble || target instanceof JChar || typeof target === 'boolean') return this.boxedMethod(target, name, args, node);
    if (target instanceof JArray) {
      if (name === 'clone' && !args.length) return new JArray(target.et, target.a.slice());
      if (name === 'length') this.semErr(`cannot find symbol\n  symbol:   method length()\n  location: ${typeStr(target.et)}[]\n  (arrays have a field length, not a method: write arr.length)`, node.ln);
      if (name === 'equals') return target === args[0];
      if (name === 'hashCode') return parseInt(this.identityHash(target), 16);
      if (name === 'toString') return this.toStr(target);
      if (name === 'getClass') { const c = new ClassRef(typeStr(target.et) + '[]'); c.isClassObj = true; return c; }
      this.semErr(`cannot find symbol\n  symbol:   method ${name}\n  location: ${typeStr(target.et)}[]`, node.ln);
    }
    if (target instanceof JLambda || target instanceof JFunc) return this.fnMethod(target, name, args, node);
    if (target.jm) return target.jm(name, args, this, node);
    this.semErr(`cannot find symbol\n  symbol: method ${name}`, node.ln);
  },
  typeHint(node) { return ''; },
  callObjMethod(o, name, args, node, env) {
    const m = this.findMethod(o.cls, name, args, false, true);
    if (m) {
      if (m.isPrivate && env && !this.canAccessPrivate(env.frame && env.frame.cls, m.cls)) this.semErr(`${name}(${m.params.map(p => typeStr(p.type)).join(',')}) has private access in ${m.cls.name}`, node.ln);
      return this.invoke(m, m.isStatic ? null : o, args);
    }
    return this.objectBuiltinMethod(o, name, args, node, false);
  },
  objectBuiltinMethod(o, name, args, node, isSuper) {
    const c = o.cls;
    switch (name) {
      case 'toString': if (!args.length) return isSuper ? this.defaultToString(o) : this.toStr(o); break;
      case 'equals': if (args.length === 1) {
        if (isSuper) return c.kind === 'record' ? this.jequals(o, args[0]) : o === args[0];
        return this.jequals(o, args[0]);
      } break;
      case 'hashCode': if (!args.length) return isSuper && c.kind !== 'record' ? parseInt(this.identityHash(o), 16) : this.jhash(o); break;
      case 'getClass': if (!args.length) { const r = new ClassRef(c.name, c); r.isClassObj = true; return r; } break;
      case 'wait': case 'notify': case 'notifyAll': return undefined;
    }
    if (c.kind === 'enum') {
      switch (name) {
        case 'name': return o.f.__name;
        case 'ordinal': return o.f.__ordinal;
        case 'compareTo': return o.f.__ordinal - args[0].f.__ordinal;
        case 'getDeclaringClass': { const r = new ClassRef(c.name, c); r.isClassObj = true; return r; }
      }
    }
    if (this.clsIsA(c, 'Throwable')) {
      switch (name) {
        case 'getMessage': case 'getLocalizedMessage': return o.f.message === undefined ? null : o.f.message;
        case 'getCause': return o.f.cause || null;
        case 'initCause': o.f.cause = args[0]; return o;
        case 'printStackTrace': this.print(this.stackTraceText(o), true); return undefined;
        case 'getStackTrace': return new JArray({ n: 'StackTraceElement', args: [], dims: 0 }, (o.__trace || []).map(t => `${t.c}.${t.m}(Main.java:${t.ln})`));
        case 'addSuppressed': return undefined;
        case 'fillInStackTrace': return o;
      }
    }
    if (o.__native && o.__native.jm) return o.__native.jm(name, args, this, node);
    this.noMethodErr(c, name, args, node.ln);
  },
  stackTraceText(o) {
    let s = this.toStr(o) + '\n';
    const tr = (o.__trace || []).slice(0, 12);
    for (const t of tr) s += `\tat ${t.c}.${t.m}(Main.java:${t.ln})\n`;
    if ((o.__trace || []).length > 12) s += `\t... ${o.__trace.length - 12} more\n`;
    if (o.f.cause && o.f.cause !== o) s += 'Caused by: ' + this.stackTraceText(o.f.cause);
    return s;
  },
  classObjMethod(r, name, args, node) {
    switch (name) {
      case 'getSimpleName': return r.name.startsWith('$Anon') ? '' : r.name;
      case 'getName': return r.cls && r.cls.builtin ? qualifiedExName(r.name) : r.cls ? this.binaryName(r.cls) : (['String', 'Integer', 'Double', 'Object'].includes(r.name) ? 'java.lang.' + r.name : r.name);
      case 'toString': return (r.cls && r.cls.kind === 'interface' ? 'interface ' : 'class ') + r.name;
      case 'equals': return args[0] instanceof ClassRef && args[0].name === r.name;
      case 'hashCode': return strHash(r.name);
      case 'isInstance': return this.isInstance(args[0], r.name);
      case 'getSuperclass': { const sc = r.cls && r.cls.superclass; if (!sc) return null; const x = new ClassRef(sc.name, sc); x.isClassObj = true; return x; }
    }
    this.semErr(`cannot find symbol\n  symbol: method ${name}`, node.ln);
  },
  callStatic(ref, name, args, node, env) {
    const c = ref.cls || this.classes.get(ref.name);
    if (c && !c.builtin) {
      this.ensureInit(c);
      if (c.kind === 'enum') {
        if (name === 'values' && !args.length) return new JArray({ n: c.name, args: [], dims: 0 }, c.enumValues.slice());
        if (name === 'valueOf' && args.length === 1) {
          const v = c.enumValues.find(e => e.f.__name === args[0]);
          if (!v) this.throwJava('IllegalArgumentException', `No enum constant ${c.name}.${args[0]}`);
          return v;
        }
      }
      const m = this.findMethod(c, name, args, false, true);
      if (m) {
        if (!m.isStatic) this.semErr(`non-static method ${name}(${m.params.map(p => typeStr(p.type)).join(',')}) cannot be referenced from a static context`, node.ln);
        if (m.isPrivate && env && !this.canAccessPrivate(env.frame && env.frame.cls, m.cls)) this.semErr(`${name}(...) has private access in ${m.cls.name}`, node.ln);
        return this.invoke(m, null, args);
      }
      this.noMethodErr(c, name, args, node.ln);
    }
    return this.builtinStatic(ref.name, name, args, node);
  },
  // ---------------- objects ----------------
  evalNew(n, env) {
    const tn = n.type.n;
    const args = n.args.map(a => this.eval(a, env));
    if (n.body) {
      let ac = this.classes.get(n.body.name);
      const o = new JObject(ac); this.assignId(o);
      o.__env = env; o.__outerFrame = env.frame;
      for (const fi of this.allFields(ac)) o.f[fi.n] = this.defaultValue(fi.type);
      const base = this.classes.get(tn);
      if (base && base.builtin && base.isThrowable) base.nativeCtor(o, args);
      else this.construct(ac, o, args, n.ln, true);
      return o;
    }
    const c = this.classes.get(tn);
    if (c && (!c.builtin || c.isThrowable)) return this.instantiate(c, args, n.ln);
    return this.newBuiltin(tn, args, n);
  },
  allFields(c) { const out = []; let k = c; while (k) { out.unshift(...k.fields); k = k.superclass; } return out; },
  instantiate(c, args, ln) {
    if (c.builtin) {
      const o = new JObject(c); this.assignId(o); c.nativeCtor(o, args); return o;
    }
    this.ensureInit(c);
    if (c.kind === 'interface') this.semErr(`${c.name} is abstract; cannot be instantiated`, ln);
    if (c.isAbstract) this.semErr(`${c.name} is abstract; cannot be instantiated`, ln);
    if (c.kind === 'enum') this.semErr(`enum classes may not be instantiated`, ln);
    const o = new JObject(c); this.assignId(o);
    for (const fi of this.allFields(c)) o.f[fi.n] = this.defaultValue(fi.type);
    this.construct(c, o, args, ln);
    return o;
  },
  pickCtor(c, args, ln) {
    if (!c.ctors.length) {
      if (args.length) this.semErr(`constructor ${c.name} in class ${c.name} cannot be applied to given types;\n  required: no arguments\n  found:    ${args.map(a => this.typeNameOf(a)).join(',')}\n  reason: actual and formal argument lists differ in length`, ln);
      return null;
    }
    let best = null, bs = -Infinity;
    for (const k of c.ctors) { const s = this.matchScore(k.params, args); if (s !== null && s > bs) { best = k; bs = s; } }
    if (!best) {
      const k = c.ctors[0];
      this.semErr(`constructor ${c.name} in class ${c.name} cannot be applied to given types;\n  required: ${k.params.map(p => typeStr(p.type)).join(',') || 'no arguments'}\n  found:    ${args.map(a => this.typeNameOf(a)).join(',') || 'no arguments'}\n  reason: ${k.params.length !== args.length ? 'actual and formal argument lists differ in length' : 'argument mismatch'}`, ln);
    }
    return best;
  },
  runFieldInits(c, o) {
    const frame = { self: o, cls: c, m: '<init>' };
    for (const m of c.memberOrder || []) {
      if (m.k === 'field' && !m.isStatic && m.init) {
        const env = new Env(o.__env || null, frame);
        this.ln = m.ln;
        o.f[m.n] = m.init.k === 'arrinit' ? this.buildArray(m.init, m.type, env) : this.coerce(this.eval(m.init, env), m.type, m.ln);
      } else if (m.k === 'init' && !m.isStatic) this.exec(m.body, new Env(o.__env || null, frame));
    }
  },
  construct(c, o, args, ln, isAnon) {
    if (c.builtin) { if (c.nativeCtor) c.nativeCtor(o, args); return; }
    if (c.kind === 'record') return this.constructRecord(c, o, args, ln);
    if (++this.depth > this.maxDepth) { this.depth--; throw new JavaThrow(this.makeEx('StackOverflowError', null)); }
    this.stack.push({ c: this.binaryName(c), m: '<init>', callLn: this.ln });
    try {
      const ctor = isAnon ? null : this.pickCtor(c, args, ln);
      const frame = { self: o, cls: c, m: '<init>' };
      if (o.__outerFrame) frame.outer = o.__outerFrame;
      const env = new Env(o.__env || null, frame); env.boundary = true;
      let stmts = [];
      if (ctor) {
        const ps = ctor.params, np = ps.length;
        if (np && ps[np - 1].varargs && !(args.length === np && args[np - 1] instanceof JArray)) {
          const et = elemType(ps[np - 1].type);
          args = [...args.slice(0, np - 1), new JArray(et, args.slice(np - 1))];
        }
        ps.forEach((p, i) => env.vars.set(p.n, { t: p.type, v: this.coerce(args[i], p.type, ctor.ln) }));
        stmts = ctor.body.body;
      }
      const k = stmts.findIndex(s => s.k === 'ctorcall');
      const pre = k >= 0 ? stmts.slice(0, k) : [], post = k >= 0 ? stmts.slice(k + 1) : stmts;
      const benv = new Env(env);
      for (const s of pre) { const r = this.exec(s, benv); if (r) break; }
      const call = k >= 0 ? stmts[k] : null;
      if (call && call.which === 'this') {
        this.ln = call.ln;
        const a2 = call.args.map(a => this.eval(a, benv));
        this.depth--; this.stack.pop();
        try { this.construct(c, o, a2, call.ln); } finally { this.depth++; this.stack.push({ c: c.name, m: '<init>', callLn: this.ln }); }
      } else {
        const sargs = call ? call.args.map(a => this.eval(a, benv)) : (isAnon ? args : []);
        if (call) this.ln = call.ln;
        if (c.superclass && c.superclass.name !== 'Object') this.construct(c.superclass, o, sargs, ln);
        else if (sargs.length && !isAnon) this.semErr(`constructor Object in class Object cannot be applied to given types`, ln);
        this.runFieldInits(c, o);
      }
      for (const s of post) { const r = this.exec(s, benv); if (r) { if (r.k === 'ret') break; } }
    } finally { this.depth--; this.stack.pop(); }
  },
  constructRecord(c, o, args, ln) {
    const comps = c.comps;
    const frame = { self: o, cls: c, m: '<init>' };
    const env = new Env(null, frame); env.boundary = true;
    const canonical = c.ctors.find(k => k.params.length === comps.length && k.params.every((p, i) => typeStr(p.type) === typeStr(comps[i].type)));
    if (args.length !== comps.length || (c.ctors.length && !canonical && this.matchScore(comps.map(cp => ({ type: cp.type })), args) === null)) {
      const other = this.pickCtor({ ...c, ctors: c.ctors.filter(k => k !== canonical) }, args, ln);
      const stmts = other.body.body;
      other.params.forEach((p, i) => env.vars.set(p.n, { t: p.type, v: this.coerce(args[i], p.type, ln) }));
      const k = stmts.findIndex(s => s.k === 'ctorcall' && s.which === 'this');
      if (k < 0) this.semErr('constructor is not canonical, so its first statement must invoke another constructor of class ' + c.name, other.ln);
      const benv = new Env(env);
      for (const s of stmts.slice(0, k)) this.exec(s, benv);
      this.constructRecord(c, o, stmts[k].args.map(a => this.eval(a, benv)), ln);
      for (const s of stmts.slice(k + 1)) { const r = this.exec(s, benv); if (r) break; }
      return;
    }
    comps.forEach((cp, i) => env.vars.set(cp.n, { t: cp.type, v: this.coerce(args[i], cp.type, ln) }));
    this.stack.push({ c: c.name, m: '<init>', callLn: this.ln });
    try {
      if (canonical) {
        for (const fi of c.fields) o.f[fi.n] = this.defaultValue(fi.type);
        canonical.params.forEach((p, i) => env.vars.set(p.n, { t: p.type, v: this.coerce(args[i], p.type, ln) }));
        const r = this.exec(canonical.body, env);
        return;
      }
      if (c.compact) { const r = this.exec(c.compact.body, env); }
      for (const cp of comps) o.f[cp.n] = env.vars.get(cp.n).v;
    } finally { this.stack.pop(); }
  },
  evalMref(n, env) {
    const name = n.n;
    if (n.target.k === 'typeexpr') {
      const t = n.target.type;
      if (name === 'new') return new JFunc(args => new JArray(t.dims ? elemType(t) : t, new Array(args[0]).fill(this.defaultValue(t.dims ? elemType(t) : t))), 1);
    }
    let target;
    if (n.target.k === 'name' && !env.lookup(n.target.n) && this.classes.has(n.target.n)) target = new ClassRef(n.target.n, this.classes.get(n.target.n));
    else if (n.target.k === 'name' && !env.lookup(n.target.n) && (BUILTIN_STATIC_CLASSES.has(n.target.n) || KNOWN_TYPES.has(n.target.n) || ['StringBuilder', 'Random', 'Scanner'].includes(n.target.n))) target = new ClassRef(n.target.n);
    else target = this.eval(n.target, env);
    if (target instanceof ClassRef && !target.isClassObj) {
      const cn = target.name;
      if (name === 'new') {
        const c = this.classes.get(cn);
        if (c && (!c.builtin || c.isThrowable)) return new JFunc(args => this.instantiate(c, args, n.ln));
        return new JFunc(args => this.newBuiltin(cn, args, n));
      }
      const c = this.classes.get(cn);
      if (c && !c.builtin) {
        const statics = (this.hasMethodNamed(c, name)).filter(m => m.isStatic);
        const insts = (this.hasMethodNamed(c, name)).filter(m => !m.isStatic);
        if (!statics.length && !insts.length && !(c.kind === 'enum' && ['name', 'ordinal'].includes(name)) && !['toString', 'hashCode', 'equals', 'getMessage'].includes(name)) this.semErr(`invalid method reference\n  cannot find symbol\n    symbol:   method ${name}()\n    location: class ${cn}`, n.ln);
        return new JFunc(args => {
          if (statics.length && (!insts.length || statics.some(m => this.matchScore(m.params, args) !== null))) return this.callStatic(target, name, args, n);
          if (!args.length) this.semErr(`invalid method reference`, n.ln);
          return this.invokeOn(args[0], name, args.slice(1), n);
        });
      }
      const isStatic = (STATIC_BUILTIN_METHODS[cn] || new Set()).has(name);
      if (isStatic) return new JFunc(args => {
        if (cn === 'Integer' && name === 'toString' && args.length === 1) return this.toStr(args[0]);
        return this.builtinStatic(cn, name, args, n);
      });
      return new JFunc(args => this.invokeOn(args[0], name, args.slice(1), n));
    }
    if (target === null) this.throwJava('NullPointerException', null);
    return new JFunc(args => this.invokeOn(target, name, args, n));
  },
  // ---------------- iteration ----------------
  iterOf(v, ln) {
    if (v instanceof JArray) return v.a.slice();
    if (v && v.jiter) return v.jiter(this);
    if (v instanceof JObject) {
      const itm = this.findMethod(v.cls, 'iterator', [], false, true);
      if (itm) {
        const it = this.invoke(itm, v, []);
        const self = this;
        return (function* () { while (self.invokeOn(it, 'hasNext', [], { ln }) === true) yield self.invokeOn(it, 'next', [], { ln }); })();
      }
    }
    this.semErr(`for-each not applicable to expression type\n  required: array or java.lang.Iterable\n  found:    ${this.typeNameOf(v)}`, ln);
  },
  // ---------------- entry points ----------------
  findMain() {
    const order = [...this.unit.types.map(d => this.classes.get(d.name)), this.implicitCls].filter(Boolean);
    for (const c of order) {
      const list = c.methods.get('main') || [];
      const sm = list.find(m => m.isStatic && m.params.length === 1 && m.params[0].type.n === 'String' && m.params[0].type.dims === 1);
      if (sm) return { cls: c, m: sm, args: [new JArray(T_STRING, [])] };
    }
    for (const c of order) {
      const list = c.methods.get('main') || [];
      const m0 = list.find(m => m.params.length === 0) || list.find(m => m.params.length === 1);
      if (m0) return { cls: c, m: m0, args: m0.params.length ? [new JArray(T_STRING, [])] : [] };
    }
    return null;
  },
  runMain() {
    return this.guard(() => {
      const mm = this.findMain();
      if (!mm) throw new SemanticError('no main method found.\n  Add  public static void main(String[] args) { ... }  (or, since Java 25,  void main() { ... })', 1, 0);
      this.ensureInit(mm.cls);
      let self = null;
      if (!mm.m.isStatic) self = mm.cls.implicit ? this.makeImplicitInstance() : this.instantiate(mm.cls, [], 1);
      this.invoke(mm.m, self, mm.args);
    });
  },
  makeImplicitInstance() {
    if (this._implicitSelf) return this._implicitSelf;
    const c = this.implicitCls; this.ensureInit(c);
    const o = new JObject(c); this.assignId(o);
    for (const fi of c.fields) o.f[fi.n] = this.defaultValue(fi.type);
    this.runFieldInits(c, o);
    this._implicitSelf = o;
    return o;
  },
  // run a JS callback with uniform error handling
  guard(fn) {
    try { const v = fn(); return { ok: true, value: v }; }
    catch (e) { return this.wrapError(e); }
  },
  wrapError(e) {
    if (e instanceof JavaThrow) {
      let text = 'Exception in thread "main" ' + this.stackTraceText(e.obj);
      if (e.obj.cls.name === 'StackOverflowError') text += `\n(Arena note: the in-browser JVM allows about ${this.maxDepth} nested calls; a real JVM allows thousands. Check that your recursion has a base case.)`;
      return { ok: false, kind: 'exception', exName: e.obj.cls.name, message: e.obj.f.message, text, ln: (e.obj.__trace && e.obj.__trace[0] && e.obj.__trace[0].ln) || this.ln, ex: e.obj };
    }
    if (e instanceof ExitSignal) return { ok: true, exit: e.code };
    if (e instanceof CompileError) return { ok: false, kind: 'compile', text: e.message, ln: e.line, col: e.col };
    if (e instanceof LimitError) return { ok: false, kind: 'limit', limit: e.kind, text: e.message, ln: this.ln };
    if (e instanceof RangeError) { this.depth = 0; this.stack = []; return { ok: false, kind: 'exception', exName: 'StackOverflowError', text: 'Exception in thread "main" java.lang.StackOverflowError\n(Arena note: recursion too deep for the in-browser JVM. Check that your recursion has a base case.)', ln: this.ln }; }
    return { ok: false, kind: 'internal', text: 'Internal interpreter error: ' + (e && e.message), ln: this.ln, err: e };
  },
  // helpers used by test harnesses
  findMethodAnywhere(name, args) {
    const order = [...this.unit.types.map(d => this.classes.get(d.name)), this.implicitCls].filter(Boolean);
    for (const c of order) {
      const m = this.findMethod(c, name, args, false, true);
      if (m) return { c, m };
    }
    for (const c of order) { const all = this.hasMethodNamed(c, name); if (all.length) return { c, m: null, all }; }
    return null;
  },
  callByName(name, args) {
    const f = this.findMethodAnywhere(name, args);
    if (!f) throw new SemanticError(`cannot find symbol\n  symbol: method ${name}(${args.map(a => this.typeNameOf(a)).join(',')})\n  (the exercise asks you to write a method named ${name})`, 1, 0);
    if (!f.m) this.noMethodErr(f.c, name, args, f.all[0].ln);
    this.ensureInit(f.c);
    let self = null;
    if (!f.m.isStatic) self = f.c.implicit ? this.makeImplicitInstance() : this.instantiate(f.c, [], 1);
    return this.invoke(f.m, self, args);
  },
  newObject(cn, args) {
    const c = this.classes.get(cn);
    if (!c || c.builtin) throw new SemanticError(`cannot find symbol\n  symbol: class ${cn}\n  (the exercise asks you to write a class named ${cn})`, 1, 0);
    return this.instantiate(c, args, 1);
  },
  call(obj, name, args) { return this.invokeOn(obj, name, args, { ln: this.ln, obj: null }); }
});
