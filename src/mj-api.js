// ===== MiniJava public API =====
const MiniJava = {
  CompileError, JDouble, JChar, JArray, JObject, JList, JMap, JSet, JStream, JOptional, JLambda, JFunc, JavaThrow, Interp, jchar, fmtDouble, T_INT, T_DOUBLE, T_STRING, T_CHAR, T_BOOL, T_OBJ,
  // parse + load classes; returns {interp} or {error}
  load(src, opts) {
    try {
      const unit = parseProgram(src);
      const interp = new Interp(unit, opts || {});
      return { interp };
    } catch (e) {
      if (e instanceof CompileError) return { error: { ok: false, kind: 'compile', text: e.message, ln: e.line, col: e.col } };
      return { error: { ok: false, kind: 'internal', text: 'Internal error: ' + e.message, err: e } };
    }
  },
  run(src, opts) {
    const L = this.load(src, opts);
    if (L.error) return { ...L.error, stdout: '', stderr: '' };
    const I = L.interp;
    const r = I.runMain();
    return { ...r, stdout: I.stdout(), stderr: I.stderr(), interp: I };
  },
  formatError(res, src, file) {
    file = file || 'Main.java';
    if (!res || res.ok) return '';
    if (res.kind === 'compile') {
      const lines = (src || '').split('\n');
      const ln = res.ln || 1;
      const text = lines[ln - 1] !== undefined ? lines[ln - 1] : '';
      const caret = res.col ? ' '.repeat(Math.max(0, res.col - 1)) + '^' : '';
      const [first, ...rest] = res.text.split('\n');
      return `${file}:${ln}: error: ${first}\n${text}\n${caret}${rest.length ? '\n' + rest.join('\n') : ''}\n1 error`;
    }
    return res.text || '';
  },
  // ---- JS <-> Java value helpers for test harnesses ----
  intArr(a) { return new JArray(T_INT, a.slice()); },
  dblArr(a) { return new JArray(T_DOUBLE, a.map(x => new JDouble(x))); },
  strArr(a) { return new JArray(T_STRING, a.slice()); },
  charArr(s) { return new JArray(T_CHAR, [...s].map(c => jchar(c.charCodeAt(0)))); },
  list(a) { return new JList(a.slice(), 'ArrayList'); },
  dbl(x) { return new JDouble(x); },
  chr(c) { return jchar(typeof c === 'string' ? c.charCodeAt(0) : c); },
  toJs(v, I) {
    if (v instanceof JDouble) return v.v;
    if (v instanceof JChar) return String.fromCharCode(v.c);
    if (v instanceof JArray) return v.a.map(x => MiniJava.toJs(x, I));
    if (v instanceof JList) return v.a.map(x => MiniJava.toJs(x, I));
    if (v instanceof JSet) return v.items(I).map(x => MiniJava.toJs(x, I));
    if (v instanceof JOptional) return v.has ? MiniJava.toJs(v.v, I) : null;
    return v;
  },
  isDouble(v) { return v instanceof JDouble; },
};
if (typeof module !== 'undefined') module.exports = MiniJava;
