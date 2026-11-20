// ===== MiniJava: lexer + parser for a teaching subset of Java 25 =====
class CompileError extends Error {
  constructor(msg, line, col, extra) { super(msg); this.line = line; this.col = col; this.extra = extra || ''; this.isCompile = true; }
}

const KW = new Set(('abstract assert boolean break byte case catch char class continue default do double else enum extends final finally float for if implements import instanceof int interface long native new null package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false').split(' '));
const OPS = ['...', '->', '::', '++', '--', '&&', '||', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '<<',
  '+', '-', '*', '/', '%', '=', '<', '>', '!', '~', '?', ':', ';', ',', '.', '(', ')', '{', '}', '[', ']', '&', '|', '^', '@'];
const PRIMS = new Set(['int', 'long', 'short', 'byte', 'double', 'float', 'boolean', 'char', 'void']);

function processEscapes(s, line, col) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c !== '\\') { out += c; continue; }
    const d = s[++i];
    switch (d) {
      case 'n': out += '\n'; break; case 't': out += '\t'; break; case 'r': out += '\r'; break;
      case 'b': out += '\b'; break; case 'f': out += '\f'; break; case 's': out += ' '; break;
      case '0': case '1': case '2': case '3': case '4': case '5': case '6': case '7': {
        let j = i, v = ''; while (j < s.length && v.length < 3 && /[0-7]/.test(s[j])) v += s[j++];
        out += String.fromCharCode(parseInt(v, 8)); i = j - 1; break; }
      case 'u': { let j = i; while (s[j] === 'u') j++; const hex = s.substr(j, 4);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) throw new CompileError('illegal unicode escape', line, col);
        out += String.fromCharCode(parseInt(hex, 16)); i = j + 3; break; }
      case '"': case "'": case '\\': out += d; break;
      case '\n': break; // line continuation in text blocks
      default: throw new CompileError('illegal escape character in string literal', line, col);
    }
  }
  return out;
}

function lex(src) {
  const toks = []; let i = 0, line = 1, col = 1; const n = src.length;
  const adv = (k) => { for (let j = 0; j < k; j++) { if (src[i] === '\n') { line++; col = 1; } else col++; i++; } };
  const idStart = /[\p{L}_$]/u, idPart = /[\p{L}\p{N}_$]/u;
  while (i < n) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\r' || c === '\n' || c === '\f' || c === ' ') { adv(1); continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') adv(1); continue; }
    if (c === '/' && src[i + 1] === '*') {
      const sl = line, sc = col; adv(2);
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) adv(1);
      if (i >= n) throw new CompileError('unclosed comment', sl, sc);
      adv(2); continue;
    }
    const sl = line, sc = col, sp = i;
    if (idStart.test(c)) {
      let j = i; while (j < n && idPart.test(src[j])) j++;
      const w = src.slice(i, j); adv(j - i);
      toks.push({ t: KW.has(w) ? 'kw' : 'id', v: w, line: sl, col: sc, pos: sp, end: j });
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      let j = i, isFloat = false, val, kind = 'int';
      if (c === '0' && /[xX]/.test(src[i + 1] || '')) {
        j = i + 2; while (/[0-9a-fA-F_]/.test(src[j] || '')) j++;
        val = parseInt(src.slice(i + 2, j).replace(/_/g, ''), 16);
      } else if (c === '0' && /[bB]/.test(src[i + 1] || '')) {
        j = i + 2; while (/[01_]/.test(src[j] || '')) j++;
        val = parseInt(src.slice(i + 2, j).replace(/_/g, ''), 2);
      } else {
        if (c === '.') { isFloat = true; j = i + 1; while (/[0-9_]/.test(src[j] || '')) j++; }
        else {
          while (/[0-9_]/.test(src[j] || '')) j++;
          if (src[j] === '.' && /[0-9]/.test(src[j + 1] || '')) { isFloat = true; j++; while (/[0-9_]/.test(src[j] || '')) j++; }
          else if (src[j] === '.' && !/[\p{L}_$.]/u.test(src[j + 1] || '')) { isFloat = true; j++; }
        }
        if (/[eE]/.test(src[j] || '')) { isFloat = true; j++; if (/[+-]/.test(src[j])) j++; while (/[0-9]/.test(src[j] || '')) j++; }
        const txt = src.slice(i, j).replace(/_/g, '');
        val = isFloat ? parseFloat(txt) : parseInt(txt, /^0[0-7]+$/.test(txt) ? 8 : 10);
      }
      const suf = src[j] || '';
      if (/[lL]/.test(suf)) { kind = 'long'; j++; }
      else if (/[fF]/.test(suf)) { kind = 'float'; j++; }
      else if (/[dD]/.test(suf)) { kind = 'double'; j++; }
      else if (isFloat) kind = 'double';
      if (kind === 'int' && val > 2147483648) throw new CompileError('integer number too large', sl, sc);
      adv(j - i);
      toks.push({ t: 'num', v: val, kind, line: sl, col: sc, pos: sp, end: j, raw: src.slice(sp, j) });
      continue;
    }
    if (c === '"') {
      if (src.startsWith('"""', i)) {
        let j = i + 3; while (src[j] === ' ' || src[j] === '\t') j++;
        if (src[j] === '\r') j++;
        if (src[j] !== '\n') throw new CompileError('illegal text block open delimiter sequence, missing line terminator', sl, sc);
        j++;
        let end = j;
        while (true) { end = src.indexOf('"""', end); if (end < 0) break; if (src[end - 1] === '\\') { end++; continue; } break; }
        if (end < 0) throw new CompileError('unclosed text block', sl, sc);
        const raw = src.slice(j, end);
        const lines = raw.split(/\r?\n/);
        const lastBlank = lines[lines.length - 1].trim() === '';
        let min = Infinity;
        lines.forEach((l, idx) => { if (l.trim() !== '' || idx === lines.length - 1) min = Math.min(min, l.match(/^[ \t]*/)[0].length); });
        if (!isFinite(min)) min = 0;
        let outLines = lines.map(l => l.slice(min).replace(/[ \t]+$/, ''));
        let text = lastBlank ? outLines.slice(0, -1).join('\n') + '\n' : outLines.join('\n');
        text = processEscapes(text, sl, sc);
        adv(end + 3 - i);
        toks.push({ t: 'str', v: text, line: sl, col: sc, pos: sp, end: i });
        continue;
      }
      let j = i + 1, raw = '';
      while (j < n && src[j] !== '"') {
        if (src[j] === '\n') throw new CompileError('unclosed string literal', sl, sc);
        if (src[j] === '\\') { raw += src[j] + (src[j + 1] || ''); j += 2; continue; }
        raw += src[j++];
      }
      if (j >= n) throw new CompileError('unclosed string literal', sl, sc);
      const v = processEscapes(raw, sl, sc);
      adv(j + 1 - i);
      toks.push({ t: 'str', v, line: sl, col: sc, pos: sp, end: j + 1 });
      continue;
    }
    if (c === "'") {
      let j = i + 1, raw = '';
      while (j < n && src[j] !== "'") {
        if (src[j] === '\n') throw new CompileError('unclosed character literal', sl, sc);
        if (src[j] === '\\') { raw += src[j] + (src[j + 1] || ''); j += 2; continue; }
        raw += src[j++];
      }
      if (j >= n) throw new CompileError('unclosed character literal', sl, sc);
      const v = processEscapes(raw, sl, sc);
      if (v.length === 0) throw new CompileError('empty character literal', sl, sc);
      if (v.length > 1) throw new CompileError('unclosed character literal', sl, sc);
      adv(j + 1 - i);
      toks.push({ t: 'char', v: v.charCodeAt(0), line: sl, col: sc, pos: sp, end: j + 1 });
      continue;
    }
    let op = null;
    if (c === '>') op = src[i + 1] === '=' ? '>=' : '>'; // '>>' is assembled by the parser (generics!)
    else for (const o of OPS) if (src.startsWith(o, i)) { op = o; break; }
    if (!op) throw new CompileError(`illegal character: '${c}'`, sl, sc);
    adv(op.length);
    toks.push({ t: 'op', v: op, line: sl, col: sc, pos: sp, end: sp + op.length });
  }
  toks.push({ t: 'eof', v: '<EOF>', line, col, pos: i, end: i });
  return toks;
}

function stripPkg(name) {
  const parts = name.split('.');
  while (parts.length > 1 && /^[a-z]/.test(parts[0])) parts.shift();
  return parts.join('.');
}

class Parser {
  constructor(src) {
    this.src = src; this.toks = lex(src); this.i = 0; this.localTypes = []; this.anonCount = 0;
  }
  peek(k = 0) { return this.toks[Math.min(this.i + k, this.toks.length - 1)]; }
  next() { return this.toks[this.i++]; }
  prev() { return this.toks[Math.max(0, this.i - 1)]; }
  is(v, k = 0) { const t = this.peek(k); return (t.t === 'op' || t.t === 'kw') && t.v === v; }
  isId(v, k = 0) { const t = this.peek(k); return t.t === 'id' && (v === undefined || t.v === v); }
  err(msg, t) { t = t || this.peek(); throw new CompileError(msg, t.line, t.col); }
  expect(v) {
    if (this.is(v)) return this.next();
    // javac reports "';' expected" right after the previous token
    const p = this.prev();
    if ((v === ';' || v === ')' || v === ']') && p && this.i > 0) throw new CompileError(`'${v}' expected`, p.line, p.col + String(p.raw || p.v).length);
    if (this.peek().t === 'eof') this.err('reached end of file while parsing');
    this.err(`'${v}' expected`);
  }
  ident() {
    const t = this.peek();
    if (t.t === 'id') { this.i++; return t.v; }
    if (t.t === 'eof') this.err('reached end of file while parsing');
    this.err('<identifier> expected');
  }
  adj(a, b) { return b.pos === a.end; }
  save() { return this.i; }
  restore(s) { this.i = s; }
  attempt(fn) { const s = this.i; try { return fn(); } catch (e) { if (e instanceof CompileError) { this.i = s; return null; } throw e; } }

  // ---------- compilation unit ----------
  parseUnit() {
    const unit = { types: [], implicit: { kind: 'class', name: 'Main', implicit: true, members: [], ln: 1, ifaces: [], superT: null, mods: new Set(), typeParams: [] }, staticImports: [] };
    if (this.is('package')) { while (!this.is(';') && this.peek().t !== 'eof') this.next(); this.expect(';'); }
    while (this.is('import')) {
      this.next();
      let isStatic = false;
      if (this.is('static')) { this.next(); isStatic = true; }
      let name = '';
      while (!this.is(';') && this.peek().t !== 'eof') name += this.next().v;
      this.expect(';');
      if (isStatic) unit.staticImports.push(name);
    }
    while (this.peek().t !== 'eof') {
      if (this.is(';')) { this.next(); continue; }
      const mods = this.parseModifiers();
      if (this.isTypeDeclStart()) unit.types.push(this.parseTypeDecl(mods, null));
      else this.parseMember(unit.implicit, mods);
    }
    unit.types.push(...this.localTypes);
    return unit;
  }
  isTypeDeclStart() {
    return this.is('class') || this.is('interface') || this.is('enum') || (this.isId('record') && this.peek(1).t === 'id') || (this.is('@') && this.peek(1).v === 'interface');
  }
  parseModifiers() {
    const mods = new Set();
    while (true) {
      const t = this.peek();
      if (t.t === 'op' && t.v === '@' && !(this.peek(1).v === 'interface')) {
        this.next(); this.ident(); while (this.is('.')) { this.next(); this.ident(); }
        if (this.is('(')) { let d = 0; do { const x = this.next(); if (x.v === '(') d++; else if (x.v === ')') d--; if (x.t === 'eof') this.err("')' expected"); } while (d > 0); }
        continue;
      }
      if (t.t === 'kw' && ['public', 'private', 'protected', 'static', 'final', 'abstract', 'native', 'synchronized', 'transient', 'volatile', 'strictfp'].includes(t.v)) {
        // 'synchronized (' is a statement, not a modifier
        if (t.v === 'synchronized' && this.peek(1).v === '(') break;
        mods.add(t.v); this.next(); continue;
      }
      if (t.t === 'kw' && t.v === 'default' && !this.is(':', 1) && !this.is('->', 1)) { mods.add('default'); this.next(); continue; }
      if (t.t === 'id' && t.v === 'sealed' && (this.peek(1).t === 'kw' || this.peek(1).t === 'id')) { mods.add('sealed'); this.next(); continue; }
      if (t.t === 'id' && t.v === 'non' && this.is('-', 1) && this.isId('sealed', 2)) { this.next(); this.next(); this.next(); mods.add('non-sealed'); continue; }
      break;
    }
    return mods;
  }
  parseTypeParamsOpt() {
    if (!this.is('<')) return [];
    const ps = []; this.next();
    while (true) {
      ps.push(this.ident());
      if (this.is('extends')) { this.next(); this.parseType(); while (this.is('&')) { this.next(); this.parseType(); } }
      if (this.is(',')) { this.next(); continue; }
      break;
    }
    this.expectGt();
    return ps;
  }
  parseTypeDecl(mods, outer) {
    const t = this.next(); const ln = t.line;
    let kind = t.v;
    if (t.v === '@') { this.next(); kind = 'annotation'; }
    const decl = { kind, name: this.ident(), mods, superT: null, ifaces: [], members: [], ln, outer: outer ? outer.name : null, typeParams: [] };
    if (kind === 'annotation') { this.skipBlock(); decl.kind = 'interface'; return decl; }
    decl.typeParams = this.parseTypeParamsOpt();
    if (kind === 'record') {
      this.expect('(');
      decl.comps = [];
      while (!this.is(')')) {
        this.parseModifiers();
        const type = this.parseType();
        const n = this.ident();
        decl.comps.push({ n, type });
        if (this.is(',')) this.next(); else break;
      }
      this.expect(')');
    }
    if (this.is('extends')) {
      this.next();
      if (kind === 'interface') { decl.ifaces.push(this.parseType()); while (this.is(',')) { this.next(); decl.ifaces.push(this.parseType()); } }
      else decl.superT = this.parseType();
    }
    if (this.is('implements')) { this.next(); decl.ifaces.push(this.parseType()); while (this.is(',')) { this.next(); decl.ifaces.push(this.parseType()); } }
    if (this.isId('permits')) { this.next(); this.parseType(); while (this.is(',')) { this.next(); this.parseType(); } }
    this.parseClassBody(decl);
    return decl;
  }
  skipBlock() {
    this.expect('{'); let d = 1;
    while (d > 0) { const x = this.next(); if (x.t === 'eof') this.err('reached end of file while parsing'); if (x.v === '{') d++; else if (x.v === '}') d--; }
  }
  parseClassBody(decl) {
    if (!this.is('{')) this.expect('{');
    this.next();
    if (decl.kind === 'enum') {
      decl.enumConsts = [];
      while (this.peek().t === 'id' || this.is('@')) {
        this.parseModifiers();
        const t = this.peek(); const n = this.ident(); let args = [];
        if (this.is('(')) args = this.parseArgs();
        if (this.is('{')) this.skipBlock();
        decl.enumConsts.push({ n, args, ln: t.line });
        if (this.is(',')) { this.next(); continue; }
        break;
      }
      if (this.is(';')) this.next();
    }
    while (!this.is('}')) {
      if (this.peek().t === 'eof') this.err('reached end of file while parsing');
      if (this.is(';')) { this.next(); continue; }
      if (this.is('{')) { decl.members.push({ k: 'init', body: this.parseBlock(), isStatic: false }); continue; }
      if (this.is('static') && this.is('{', 1)) { this.next(); decl.members.push({ k: 'init', body: this.parseBlock(), isStatic: true }); continue; }
      const mods = this.parseModifiers();
      if (this.isTypeDeclStart()) { const nd = this.parseTypeDecl(mods, decl); this.localTypes.push(nd); continue; }
      this.parseMember(decl, mods);
    }
    this.next();
    return decl;
  }
  parseMember(decl, mods) {
    const startTok = this.peek();
    if (this.is('<')) this.parseTypeParamsOpt();
    const iface = decl.kind === 'interface';
    // constructor
    if (this.isId(decl.name) && this.is('(', 1) && !decl.implicit) {
      this.next();
      const params = this.parseParams();
      this.skipThrows();
      const body = this.parseBlock();
      decl.members.push({ k: 'ctor', params, body, mods, ln: startTok.line });
      return;
    }
    if (decl.kind === 'record' && this.isId(decl.name) && this.is('{', 1)) {
      this.next();
      decl.members.push({ k: 'compact', body: this.parseBlock(), mods, ln: startTok.line });
      return;
    }
    const type = this.parseType(true);
    const nameTok = this.peek();
    if (nameTok.t !== 'id') {
      if (nameTok.v === '(' ) this.err('invalid method declaration; return type required', nameTok);
      this.err('<identifier> expected', nameTok);
    }
    const name = this.ident();
    if (this.is('(')) {
      const params = this.parseParams();
      let dims = 0; while (this.is('[')) { this.next(); this.expect(']'); dims++; }
      this.skipThrows();
      let body = null;
      if (this.is(';')) { this.next(); }
      else body = this.parseBlock();
      const isStatic = mods.has('static');
      const isAbstract = mods.has('abstract') || (iface && !body);
      if (!body && !isAbstract && !mods.has('native')) this.err('missing method body, or declare abstract', nameTok);
      if (body && mods.has('abstract')) this.err('abstract methods cannot have a body', nameTok);
      decl.members.push({ k: 'method', n: name, params, ret: dims ? { ...type, dims: type.dims + dims } : type, body, mods, isStatic, isAbstract, isDefault: mods.has('default'), ln: nameTok.line });
      return;
    }
    // fields
    let first = true;
    let n = name, ln = nameTok.line;
    while (true) {
      if (!first) { const t = this.peek(); n = this.ident(); ln = t.line; }
      first = false;
      let dims = 0; while (this.is('[')) { this.next(); this.expect(']'); dims++; }
      const ftype = dims ? { ...type, dims: type.dims + dims } : type;
      let init = null;
      if (this.is('=')) { this.next(); init = this.is('{') ? this.parseArrayInit() : this.parseExpr(); }
      decl.members.push({ k: 'field', n, type: ftype, init, mods, isStatic: mods.has('static') || iface, isFinal: mods.has('final') || iface, ln });
      if (this.is(',')) { this.next(); continue; }
      break;
    }
    this.expect(';');
  }
  skipThrows() { if (this.is('throws')) { this.next(); this.parseType(); while (this.is(',')) { this.next(); this.parseType(); } } }
  parseParams() {
    this.expect('(');
    const ps = [];
    while (!this.is(')')) {
      this.parseModifiers();
      const type = this.parseType();
      let varargs = false;
      if (this.is('...')) { this.next(); varargs = true; }
      const n = this.ident();
      let dims = 0; while (this.is('[')) { this.next(); this.expect(']'); dims++; }
      let t = dims ? { ...type, dims: type.dims + dims } : type;
      if (varargs) t = { ...t, dims: t.dims + 1 };
      ps.push({ n, type: t, varargs });
      if (this.is(',')) { this.next(); continue; }
      if (!this.is(')')) this.expect(')');
    }
    this.next();
    return ps;
  }
  expectGt() {
    // accept a '>' even when it is glued to another '>' ('>>' in List<List<Integer>>)
    const t = this.peek();
    if (t.t === 'op' && t.v === '>') { this.next(); return; }
    if (t.t === 'op' && t.v === '>=') { // turn '>=' into '=' (e.g. List<Integer>= rare) — split it
      t.v = '='; t.pos += 1; return;
    }
    this.err("'>' expected");
  }
  parseTypeArgs() {
    this.next(); // '<'
    const args = [];
    if (this.is('>')) { this.next(); return args; } // diamond
    while (true) {
      if (this.is('?')) {
        this.next();
        if (this.is('extends') || this.is('super')) { this.next(); args.push(this.parseType()); }
        else args.push({ n: 'Object', dims: 0, args: [] });
      } else args.push(this.parseType());
      if (this.is(',')) { this.next(); continue; }
      break;
    }
    this.expectGt();
    return args;
  }
  parseType(allowVoid) {
    const t = this.peek();
    let n, args = [];
    if (t.t === 'kw' && PRIMS.has(t.v)) {
      if (t.v === 'void' && !allowVoid) this.err("'void' type not allowed here");
      this.next(); n = t.v;
    } else if (t.t === 'id') {
      n = this.ident();
      if (this.is('<')) args = this.parseTypeArgs();
      while (this.is('.') && this.peek(1).t === 'id') {
        this.next(); n += '.' + this.ident();
        if (this.is('<')) args = this.parseTypeArgs();
      }
      n = stripPkg(n);
    } else {
      if (t.t === 'eof') this.err('reached end of file while parsing');
      this.err('<identifier> expected');
    }
    let dims = 0;
    while (this.is('[') && this.is(']', 1)) { this.next(); this.next(); dims++; }
    return { n, args, dims };
  }

  // ---------- statements ----------
  parseBlock() {
    const t = this.peek();
    if (!this.is('{')) this.expect('{');
    this.next();
    const body = [];
    while (!this.is('}')) {
      if (this.peek().t === 'eof') this.err('reached end of file while parsing');
      body.push(this.parseBlockStatement());
    }
    const end = this.next();
    return { k: 'block', body, ln: t.line, endLn: end.line };
  }
  isLocalVarDecl() {
    const t = this.peek();
    if (t.t === 'kw' && PRIMS.has(t.v) && t.v !== 'void') return !(this.is('.', 1));
    if (t.t === 'kw' && t.v === 'final') return true;
    if (t.t === 'op' && t.v === '@') return true;
    if (t.t !== 'id') return false;
    if (t.v === 'var' && this.peek(1).t === 'id') return true;
    const s = this.save();
    let ok = false;
    try {
      this.parseType();
      const a = this.peek(), b = this.peek(1);
      ok = a.t === 'id' && (b.t === 'op' && ['=', ';', ',', ':', '['].includes(b.v));
    } catch (e) { if (!(e instanceof CompileError)) throw e; ok = false; }
    this.restore(s);
    return ok;
  }
  parseLocalVarDecl(noSemi) {
    const ln = this.peek().line;
    const mods = this.parseModifiers();
    let type;
    if (this.isId('var') && this.peek(1).t === 'id') { this.next(); type = { n: 'var', args: [], dims: 0 }; }
    else type = this.parseType();
    const decls = [];
    while (true) {
      const t = this.peek(); const n = this.ident();
      let dims = 0; while (this.is('[')) { this.next(); this.expect(']'); dims++; }
      let init = null;
      if (this.is('=')) {
        this.next();
        init = this.is('{') ? this.parseArrayInit() : this.parseExpr();
      }
      if (type.n === 'var' && !init) this.err("cannot infer type for local variable " + n + "\n  (cannot use 'var' on variable without initializer)", t);
      decls.push({ n, dims, init, ln: t.line });
      if (this.is(',')) { this.next(); continue; }
      break;
    }
    if (!noSemi) this.expect(';');
    return { k: 'local', type, decls, isFinal: mods.has('final'), ln };
  }
  parseArrayInit() {
    const t = this.expect('{');
    const elems = [];
    while (!this.is('}')) {
      elems.push(this.is('{') ? this.parseArrayInit() : this.parseExpr());
      if (this.is(',')) { this.next(); continue; }
      if (!this.is('}')) this.expect('}');
    }
    this.next();
    return { k: 'arrinit', elems, ln: t.line };
  }
  parseBlockStatement() {
    if (this.isTypeDeclStart() || ((this.is('final') || this.is('abstract') || this.is('static')) && (this.is('class', 1) || this.isId('record', 1)))) {
      const mods = this.parseModifiers();
      const d = this.parseTypeDecl(mods, null);
      this.localTypes.push(d);
      return { k: 'empty', ln: d.ln };
    }
    if (this.isLocalVarDecl()) return this.parseLocalVarDecl();
    return this.parseStatement();
  }
  parseStatement() {
    const t = this.peek(); const ln = t.line;
    if (t.t === 'op') {
      if (t.v === '{') return this.parseBlock();
      if (t.v === ';') { this.next(); return { k: 'empty', ln }; }
    }
    if (t.t === 'kw') {
      switch (t.v) {
        case 'if': {
          this.next(); this.expect('('); const c = this.parseExpr(); this.expect(')');
          const a = this.parseStatement(); let b = null;
          if (this.is('else')) { this.next(); b = this.parseStatement(); }
          return { k: 'if', c, a, b, ln };
        }
        case 'while': { this.next(); this.expect('('); const c = this.parseExpr(); this.expect(')'); return { k: 'while', c, body: this.parseStatement(), ln }; }
        case 'do': {
          this.next(); const body = this.parseStatement(); this.expect('while'); this.expect('(');
          const c = this.parseExpr(); this.expect(')'); this.expect(';'); return { k: 'do', c, body, ln };
        }
        case 'for': return this.parseFor();
        case 'return': { this.next(); let e = null; if (!this.is(';')) e = this.parseExpr(); this.expect(';'); return { k: 'return', e, ln }; }
        case 'break': { this.next(); let label = null; if (this.peek().t === 'id') label = this.ident(); this.expect(';'); return { k: 'break', label, ln }; }
        case 'continue': { this.next(); let label = null; if (this.peek().t === 'id') label = this.ident(); this.expect(';'); return { k: 'continue', label, ln }; }
        case 'throw': { this.next(); const e = this.parseExpr(); this.expect(';'); return { k: 'throw', e, ln }; }
        case 'try': return this.parseTry();
        case 'switch': {
          const sw = this.parseSwitch(false);
          return sw;
        }
        case 'synchronized': { this.next(); this.expect('('); this.parseExpr(); this.expect(')'); return { k: 'sync', body: this.parseBlock(), ln }; }
        case 'assert': { this.next(); this.parseExpr(); if (this.is(':')) { this.next(); this.parseExpr(); } this.expect(';'); return { k: 'empty', ln }; }
        case 'this': case 'super':
          if (this.is('(', 1)) {
            this.next(); const args = this.parseArgs(); this.expect(';');
            return { k: 'ctorcall', which: t.v, args, ln };
          }
          break;
        case 'else': this.err("'else' without 'if'");
        case 'case': case 'default': this.err('orphaned ' + t.v);
        case 'catch': this.err("'catch' without 'try'");
        case 'finally': this.err("'finally' without 'try'");
      }
    }
    if (t.t === 'id') {
      if (t.v === 'yield' && !(this.peek(1).t === 'op' && ['=', '.', '(', '[', '++', '--', '+=', '-='].includes(this.peek(1).v))) {
        this.next(); const e = this.parseExpr(); this.expect(';'); return { k: 'yield', e, ln };
      }
      if (this.is(':', 1)) { this.next(); this.next(); return { k: 'label', label: t.v, body: this.parseStatement(), ln }; }
    }
    const e = this.parseExpr();
    if (!['assign', 'inc', 'call', 'new', 'switchx'].includes(e.k)) {
      if (this.is(';') || this.peek().t === 'eof' || this.is('}')) this.err('not a statement', t);
    }
    this.expect(';');
    return { k: 'expr', e, ln };
  }
  parseFor() {
    const ln = this.next().line;
    this.expect('(');
    if (this.isLocalVarDecl()) {
      const s = this.save();
      const mods = this.parseModifiers();
      let type;
      if (this.isId('var') && this.peek(1).t === 'id') { this.next(); type = { n: 'var', args: [], dims: 0 }; }
      else type = this.parseType();
      const n = this.ident();
      if (this.is(':')) {
        this.next(); const iter = this.parseExpr(); this.expect(')');
        return { k: 'foreach', type, n, iter, body: this.parseStatement(), ln };
      }
      this.restore(s);
      const init = [this.parseLocalVarDecl(true)];
      return this.finishFor(init, ln);
    }
    const init = [];
    if (!this.is(';')) {
      while (true) { init.push({ k: 'expr', e: this.parseExpr(), ln }); if (this.is(',')) { this.next(); continue; } break; }
    }
    return this.finishFor(init, ln);
  }
  finishFor(init, ln) {
    this.expect(';');
    let c = null; if (!this.is(';')) c = this.parseExpr();
    this.expect(';');
    const upd = [];
    if (!this.is(')')) { while (true) { upd.push(this.parseExpr()); if (this.is(',')) { this.next(); continue; } break; } }
    this.expect(')');
    return { k: 'for', init, c, upd, body: this.parseStatement(), ln };
  }
  parseTry() {
    const ln = this.next().line;
    const resources = [];
    if (this.is('(')) {
      this.next();
      while (!this.is(')')) {
        if (this.isLocalVarDecl()) {
          const d = this.parseLocalVarDecl(true);
          resources.push(d);
        } else resources.push({ k: 'expr', e: this.parseExpr(), ln });
        if (this.is(';')) { this.next(); continue; }
        break;
      }
      this.expect(')');
    }
    const block = this.parseBlock();
    const catches = [];
    while (this.is('catch')) {
      const cl = this.next().line;
      this.expect('(');
      this.parseModifiers();
      const types = [this.parseType()];
      while (this.is('|')) { this.next(); types.push(this.parseType()); }
      const n = this.ident();
      this.expect(')');
      catches.push({ types, n, block: this.parseBlock(), ln: cl });
    }
    let fin = null;
    if (this.is('finally')) { this.next(); fin = this.parseBlock(); }
    if (!catches.length && !fin && !resources.length) throw new CompileError("'try' without 'catch', 'finally' or resource declarations", ln, 1);
    return { k: 'try', resources, block, catches, fin, ln };
  }
  parseCaseLabel() {
    const t = this.peek();
    if (this.is('null')) { this.next(); return { k: 'null' }; }
    if (this.is('default')) { this.next(); return { k: 'default' }; }
    if (t.t === 'id') {
      const s = this.save();
      try {
        const type = this.parseType();
        if (this.peek().t === 'id' && this.peek().v !== 'when') { const n = this.ident(); return { k: 'tpat', type, n }; }
        if (this.is('(') && /^[A-Z]/.test(type.n.split('.').pop())) return this.parseRecordPattern(type);
      } catch (e) { if (!(e instanceof CompileError)) throw e; }
      this.restore(s);
    }
    return { k: 'const', e: this.parseTernary() };
  }
  parseRecordPattern(type) {
    this.expect('(');
    const subs = [];
    while (!this.is(')')) {
      const st = this.parseType();
      if (this.is('(')) subs.push(this.parseRecordPattern(st));
      else subs.push({ k: 'tpat', type: st, n: this.ident() });
      if (this.is(',')) { this.next(); continue; }
      break;
    }
    this.expect(')');
    let n = null; if (this.peek().t === 'id' && this.peek().v !== 'when') n = this.ident();
    return { k: 'rpat', type, subs, n };
  }
  parseSwitch(isExpr) {
    const ln = this.next().line;
    this.expect('('); const sel = this.parseExpr(); this.expect(')');
    this.expect('{');
    const cases = []; let arrow = null;
    while (!this.is('}')) {
      const ct = this.peek();
      if (ct.t === 'eof') this.err('reached end of file while parsing');
      const labels = []; let isDefault = false, guard = null;
      if (this.is('default')) { this.next(); isDefault = true; }
      else if (this.is('case')) {
        this.next();
        while (true) {
          const l = this.parseCaseLabel();
          if (l.k === 'default') isDefault = true; else labels.push(l);
          if (this.is(',')) { this.next(); continue; }
          break;
        }
        if (this.isId('when')) { this.next(); guard = this.parseExpr(); }
      } else this.err("case, default, or '}' expected");
      let body;
      if (this.is('->')) {
        if (arrow === false) this.err('different case kinds used in the switch');
        arrow = true; this.next();
        if (this.is('{')) body = this.parseBlock();
        else if (this.is('throw')) body = this.parseStatement();
        else { const e = this.parseExpr(); this.expect(';'); body = { k: 'arrowexpr', e, ln: ct.line }; }
      } else {
        if (!this.is(':')) this.expect(':');
        if (arrow === true) this.err('different case kinds used in the switch');
        arrow = false; this.next();
        const stmts = [];
        while (!this.is('case') && !this.is('default') && !this.is('}')) {
          if (this.peek().t === 'eof') this.err('reached end of file while parsing');
          stmts.push(this.parseBlockStatement());
        }
        body = stmts;
      }
      cases.push({ labels, isDefault, guard, body, ln: ct.line });
    }
    this.next();
    return { k: isExpr ? 'switchx' : 'switch', sel, cases, arrow: !!arrow, ln };
  }

  // ---------- expressions ----------
  parseArgs() {
    this.expect('(');
    const args = [];
    while (!this.is(')')) {
      args.push(this.parseExpr());
      if (this.is(',')) { this.next(); continue; }
      if (!this.is(')')) this.expect(')');
    }
    this.next();
    return args;
  }
  parseExpr() { return this.parseAssign(); }
  matchParen(i) {
    let d = 0;
    for (let j = i; j < this.toks.length; j++) {
      const t = this.toks[j];
      if (t.t === 'op' && t.v === '(') d++;
      else if (t.t === 'op' && t.v === ')') { d--; if (d === 0) return j; }
      else if (t.t === 'eof') return -1;
    }
    return -1;
  }
  isLambdaStart() {
    const t = this.peek();
    if (t.t === 'id' && this.is('->', 1)) return true;
    if (t.t === 'op' && t.v === '(') {
      const j = this.matchParen(this.i);
      return j > 0 && this.toks[j + 1] && this.toks[j + 1].v === '->';
    }
    return false;
  }
  parseLambda() {
    const ln = this.peek().line;
    const params = [];
    if (this.peek().t === 'id') params.push({ n: this.ident(), type: null });
    else {
      this.expect('(');
      while (!this.is(')')) {
        this.parseModifiers();
        if (this.peek().t === 'id' && (this.is(',', 1) || this.is(')', 1))) params.push({ n: this.ident(), type: null });
        else {
          let type = null;
          if (this.isId('var')) { this.next(); } else type = this.parseType();
          params.push({ n: this.ident(), type });
        }
        if (this.is(',')) { this.next(); continue; }
        break;
      }
      this.expect(')');
    }
    this.expect('->');
    const body = this.is('{') ? this.parseBlock() : this.parseExpr();
    return { k: 'lambda', params, body, ln };
  }
  assignOp() {
    const t = this.peek();
    if (t.t !== 'op') return null;
    if (['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<='].includes(t.v)) return { op: t.v, n: 1 };
    if (t.v === '>') {
      const a = this.peek(1), b = this.peek(2);
      if (a.t === 'op' && this.adj(t, a) && a.v === '>=') return { op: '>>=', n: 2 };
      if (a.t === 'op' && this.adj(t, a) && a.v === '>' && b.t === 'op' && this.adj(a, b) && b.v === '>=') return { op: '>>>=', n: 3 };
    }
    return null;
  }
  parseAssign() {
    if (this.isLambdaStart()) return this.parseLambda();
    const lhs = this.parseTernary();
    const ao = this.assignOp();
    if (ao) {
      const t = this.peek();
      if (!['name', 'field', 'idx'].includes(lhs.k)) this.err('unexpected type\n  required: variable\n  found:    value', t);
      for (let k = 0; k < ao.n; k++) this.next();
      const v = this.parseAssign();
      return { k: 'assign', op: ao.op, target: lhs, v, ln: t.line };
    }
    return lhs;
  }
  parseTernary() {
    const c = this.parseBinary(1);
    if (this.is('?')) {
      const ln = this.next().line;
      const a = this.isLambdaStart() ? this.parseLambda() : this.parseTernary();
      this.expect(':');
      const b = this.isLambdaStart() ? this.parseLambda() : this.parseTernary();
      return { k: 'cond', c, a, b, ln };
    }
    return c;
  }
  peekBinOp() {
    const t = this.peek();
    if (t.t === 'kw' && t.v === 'instanceof') return { op: 'instanceof', n: 1 };
    if (t.t !== 'op') return null;
    if (t.v === '>') {
      const a = this.peek(1);
      if (a.t === 'op' && this.adj(t, a)) {
        if (a.v === '>=') return null;
        if (a.v === '>') {
          const b = this.peek(2);
          if (b.t === 'op' && this.adj(a, b)) { if (b.v === '>') return { op: '>>>', n: 3 }; if (b.v === '>=') return null; }
          return { op: '>>', n: 2 };
        }
      }
      return { op: '>', n: 1 };
    }
    if (BINPREC[t.v]) return { op: t.v, n: 1 };
    return null;
  }
  parseBinary(minPrec) {
    let left = this.parseUnary();
    while (true) {
      const bo = this.peekBinOp();
      if (!bo) break;
      const prec = BINPREC[bo.op];
      if (prec < minPrec) break;
      const t = this.peek();
      for (let k = 0; k < bo.n; k++) this.next();
      if (bo.op === 'instanceof') {
        if (this.is('final')) this.next();
        const type = this.parseType();
        if (this.is('(')) { left = { k: 'instof', e: left, type, pat: this.parseRecordPattern(type), ln: t.line }; continue; }
        let bind = null;
        if (this.peek().t === 'id') bind = this.ident();
        left = { k: 'instof', e: left, type, bind, ln: t.line };
        continue;
      }
      const right = this.parseBinary(prec + 1);
      left = { k: 'bin', op: bo.op, l: left, r: right, ln: t.line };
    }
    return left;
  }
  isCast() {
    const s = this.save();
    let res = false;
    try {
      this.next();
      const prim = this.peek().t === 'kw' && PRIMS.has(this.peek().v);
      this.parseType();
      while (this.is('&')) { this.next(); this.parseType(); }
      if (this.is(')')) {
        const a = this.peek(1);
        if (prim) res = true;
        else res = a.t === 'id' || a.t === 'num' || a.t === 'str' || a.t === 'char' ||
          (a.t === 'op' && ['(', '!', '~'].includes(a.v)) ||
          (a.t === 'kw' && ['this', 'new', 'super', 'true', 'false', 'null', 'switch'].includes(a.v));
      }
    } catch (e) { if (!(e instanceof CompileError)) throw e; res = false; }
    this.restore(s);
    return res;
  }
  parseUnary() {
    const t = this.peek();
    if (t.t === 'op') {
      if (t.v === '+' || t.v === '-' || t.v === '!' || t.v === '~') {
        this.next();
        if (t.v === '-' && this.peek().t === 'num' && (this.peek().kind === 'int' || this.peek().kind === 'long')) {
          // allow -2147483648
          const nt = this.peek();
          const e = this.parsePostfix(this.parsePrimary(true));
          if (e.k === 'lit' && typeof e.v === 'number') { e.v = -e.v; return e; }
          return { k: 'un', op: '-', e, ln: t.line };
        }
        const e = this.parseUnary();
        return { k: 'un', op: t.v, e, ln: t.line };
      }
      if (t.v === '++' || t.v === '--') {
        this.next(); const e = this.parseUnary();
        if (!['name', 'field', 'idx'].includes(e.k)) this.err('unexpected type\n  required: variable\n  found:    value', t);
        return { k: 'inc', op: t.v, prefix: true, target: e, ln: t.line };
      }
      if (t.v === '(' && this.isCast()) {
        this.next();
        const type = this.parseType();
        while (this.is('&')) { this.next(); this.parseType(); }
        this.expect(')');
        const e = this.isLambdaStart() ? this.parseLambda() : this.parseUnary();
        return { k: 'cast', type, e, ln: t.line };
      }
    }
    return this.parsePostfix(this.parsePrimary());
  }
  parsePostfix(e) {
    while (true) {
      const t = this.peek();
      if (t.t !== 'op') break;
      if (t.v === '.') {
        this.next();
        if (this.is('<')) this.parseTypeArgs();
        const nt = this.peek();
        if (nt.t === 'kw' && nt.v === 'class') { this.next(); e = { k: 'classlit', e, ln: nt.line }; continue; }
        if (nt.t === 'kw' && nt.v === 'this') { this.next(); e = { k: 'this', ln: nt.line }; continue; }
        if (nt.t === 'kw' && nt.v === 'new') { this.next(); e = this.parseNewRest(nt.line); continue; }
        const n = this.ident();
        if (this.is('(')) { const args = this.parseArgs(); e = { k: 'call', obj: e, n, args, ln: nt.line, src: this.srcOf(e) }; }
        else e = { k: 'field', obj: e, n, ln: nt.line };
        continue;
      }
      if (t.v === '[') {
        this.next(); const i = this.parseExpr(); this.expect(']');
        e = { k: 'idx', arr: e, i, ln: t.line }; continue;
      }
      if (t.v === '::') {
        this.next();
        let n;
        if (this.is('new')) { this.next(); n = 'new'; } else n = this.ident();
        e = { k: 'mref', target: e, n, ln: t.line }; continue;
      }
      if (t.v === '++' || t.v === '--') {
        if (!['name', 'field', 'idx'].includes(e.k)) this.err('unexpected type\n  required: variable\n  found:    value', t);
        this.next(); e = { k: 'inc', op: t.v, prefix: false, target: e, ln: t.line }; continue;
      }
      break;
    }
    return e;
  }
  srcOf(e) {
    if (!e) return '';
    switch (e.k) {
      case 'name': return e.n;
      case 'field': return this.srcOf(e.obj) + '.' + e.n;
      case 'call': return this.srcOf(e.obj ? e.obj : null) + (e.obj ? '.' : '') + e.n + '(...)';
      case 'idx': return this.srcOf(e.arr) + '[...]';
      case 'this': return 'this';
      default: return '<expression>';
    }
  }
  parsePrimary(noPostfix) {
    const t = this.peek(); const ln = t.line;
    switch (t.t) {
      case 'num': this.next();
        return { k: 'lit', v: (t.kind === 'double' || t.kind === 'float') ? new JDouble(t.v) : t.v, ln, kind: t.kind };
      case 'str': this.next(); return { k: 'lit', v: t.v, ln };
      case 'char': this.next(); return { k: 'lit', v: jchar(t.v), ln };
      case 'id': {
        this.next();
        if ((t.v === 'java' || t.v === 'javax') && this.is('.')) {
          // skip a package prefix such as java.util.  -> the class name becomes the primary
          while (this.is('.') && this.peek(1).t === 'id' && /^[a-z]/.test(this.peek(1).v) && this.is('.', 2)) { this.next(); this.next(); }
          this.next();
          const ct = this.peek(); const cn = this.ident();
          if (this.is('(')) { const args = this.parseArgs(); return { k: 'call', obj: null, n: cn, args, ln }; }
          return { k: 'name', n: cn, ln: ct.line };
        }
        if (this.is('(')) { const args = this.parseArgs(); return { k: 'call', obj: null, n: t.v, args, ln }; }
        return { k: 'name', n: t.v, ln };
      }
      case 'kw':
        switch (t.v) {
          case 'true': this.next(); return { k: 'lit', v: true, ln };
          case 'false': this.next(); return { k: 'lit', v: false, ln };
          case 'null': this.next(); return { k: 'lit', v: null, ln };
          case 'this': this.next(); return { k: 'this', ln };
          case 'super': this.next(); return { k: 'super', ln };
          case 'new': this.next(); return this.parseNewRest(ln);
          case 'switch': return this.parseSwitch(true);
          case 'int': case 'long': case 'double': case 'char': case 'boolean': case 'float': case 'short': case 'byte': {
            // int[]::new or int.class
            const type = this.parseType();
            return { k: 'typeexpr', type, ln };
          }
        }
        break;
      case 'op':
        if (t.v === '(') {
          this.next(); const e = this.parseExpr(); this.expect(')');
          return { k: 'paren', e, ln };
        }
        break;
      case 'eof': this.err('reached end of file while parsing');
    }
    this.err('illegal start of expression');
  }
  parseNewRest(ln) {
    const t = this.peek();
    let n, args = [];
    if (t.t === 'kw' && PRIMS.has(t.v)) { this.next(); n = t.v; }
    else {
      n = this.ident();
      if (this.is('<')) args = this.parseTypeArgs();
      while (this.is('.') && this.peek(1).t === 'id') { this.next(); n += '.' + this.ident(); if (this.is('<')) args = this.parseTypeArgs(); }
      n = stripPkg(n);
    }
    const base = { n, args, dims: 0 };
    if (this.is('[')) {
      const dims = []; let total = 0;
      while (this.is('[')) {
        this.next();
        if (this.is(']')) { this.next(); total++; continue; }
        if (total > dims.length) this.err("']' expected");
        dims.push(this.parseExpr()); this.expect(']'); total++;
      }
      let init = null;
      if (this.is('{')) {
        if (dims.length) this.err("';' expected");
        init = this.parseArrayInit();
      } else if (!dims.length) this.err('array dimension missing');
      return { k: 'newarr', elem: base, dims, total, init, ln };
    }
    const cargs = this.parseArgs();
    let body = null;
    if (this.is('{')) {
      const decl = { kind: 'class', name: '$Anon' + (++this.anonCount), mods: new Set(), superT: null, ifaces: [], members: [], ln, anonBase: base, typeParams: [] };
      this.parseClassBody(decl);
      this.localTypes.push(decl);
      body = decl;
    }
    return { k: 'new', type: base, args: cargs, body, ln };
  }
}
const BINPREC = { '||': 1, '&&': 2, '|': 3, '^': 4, '&': 5, '==': 6, '!=': 6, '<': 7, '>': 7, '<=': 7, '>=': 7, 'instanceof': 7, '<<': 8, '>>': 8, '>>>': 8, '+': 9, '-': 9, '*': 10, '/': 10, '%': 10 };

function parseProgram(src) {
  const p = new Parser(src);
  const unit = p.parseUnit();
  return unit;
}
