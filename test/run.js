// Runs every case in cases.txt through real Java (ground truth, cached) and through MiniJava; reports mismatches.
const fs = require('fs'), path = require('path'), cp = require('child_process'), crypto = require('crypto');
const M = require('../dist/minijava.js');
const file = process.argv[2] || path.join(__dirname, 'cases.txt');
const only = process.argv[3];
const text = fs.readFileSync(file, 'utf8');
const cases = [];
for (const block of text.split(/^=== /m).slice(1)) {
  const lines = block.split('\n');
  const c = { name: lines[0].trim(), sections: {} };
  let cur = null;
  for (const l of lines.slice(1)) {
    const m = l.match(/^--- (\w+)$/);
    if (m) { cur = m[1]; c.sections[cur] = []; continue; }
    if (cur) c.sections[cur].push(l);
  }
  for (const k in c.sections) c.sections[k] = c.sections[k].join('\n').replace(/\n+$/, '');
  cases.push(c);
}
const cacheFile = path.join(__dirname, 'java-cache.json');
const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {};
function realJava(src, stdin) {
  const key = crypto.createHash('md5').update(src + '\0' + stdin).digest('hex');
  if (cache[key]) return cache[key];
  const dir = fs.mkdtempSync('/tmp/jt-');
  fs.writeFileSync(path.join(dir, 'Main.java'), src);
  const env = { ...process.env }; delete env.JAVA_TOOL_OPTIONS; delete env._JAVA_OPTIONS;
  const comp = cp.spawnSync('javac', ['-d', dir, '-encoding', 'UTF-8', path.join(dir, 'Main.java')], { encoding: 'utf8', env });
  let res;
  if (comp.status !== 0) res = { compile: comp.stderr };
  else {
    const run = cp.spawnSync('java', ['-Xss2m', '-cp', dir, 'Main'], { input: stdin, encoding: 'utf8', env, timeout: 8000 });
    res = { stdout: run.stdout, stderr: run.stderr, timeout: !!run.error };
  }
  cache[key] = res;
  return res;
}
let pass = 0, fail = 0;
for (const c of cases) {
  if (only && !c.name.includes(only)) continue;
  const src = c.sections.src, stdin = c.sections.stdin ? c.sections.stdin + '\n' : '';
  const t0 = Date.now();
  const r = M.run(src, { stdin });
  const ms = Date.now() - t0;
  const problems = [];
  if ('compile' in c.sections) {
    if (r.kind !== 'compile' || !r.text.includes(c.sections.compile)) problems.push(`expected compile error containing "${c.sections.compile}", got ${r.kind}: ${r.text || r.stdout}`);
    if (!('nojava' in c.sections)) { const j = realJava(src, stdin); if (!j.compile || !j.compile.includes(c.sections.compile)) problems.push(`[javac disagrees] ${JSON.stringify(j).slice(0, 300)}`); }
  } else if ('limit' in c.sections) {
    if (r.kind !== 'limit') problems.push(`expected limit, got ${r.kind}`);
  } else {
    let expOut, expErr;
    if ('nojava' in c.sections) { expOut = (c.sections.out || '') + '\n'; expErr = c.sections.err || ''; }
    else {
      const j = realJava(src, stdin);
      if (j.compile) { problems.push('[javac failed] ' + j.compile.slice(0, 400)); }
      expOut = j.stdout || ''; expErr = (j.stderr || '').trim();
      const mine = (c.sections.out || '').replace(/\n+$/, '');
      if (process.env.CHECK_MINE && mine && mine + '\n' !== expOut && mine !== expOut.replace(/\n$/, '')) problems.push(`[my expectation differs from Java]\n  mine: ${JSON.stringify(mine)}\n  java: ${JSON.stringify(expOut)}`);
    }
    const outN = (s) => (s || '').replace(/\n$/, '');
    if (outN(r.stdout) !== outN(expOut)) problems.push(`stdout mismatch\n  got:  ${JSON.stringify(r.stdout)}\n  want: ${JSON.stringify(expOut)}${r.ok ? '' : '\n  err: ' + (r.text || '')}`);
    const gotErr = (r.ok ? r.stderr : (r.stderr + (r.text || ''))).trim();
    if (expErr) { const firstLines = expErr.split('\n').slice(0, 3).join('\n'); if (!gotErr.startsWith(firstLines.split('\n')[0]) || (c.sections.err && !gotErr.includes(c.sections.err.trim()))) problems.push(`stderr mismatch\n  got:  ${JSON.stringify(gotErr)}\n  want: ${JSON.stringify(expErr)}`); }
    else if (gotErr) problems.push(`unexpected stderr: ${gotErr}`);
  }
  if (problems.length) { fail++; console.log(`✗ ${c.name} (${ms}ms)\n  ` + problems.join('\n  ')); }
  else { pass++; if (ms > 500) console.log(`  (slow: ${c.name} ${ms}ms)`); }
}
fs.writeFileSync(cacheFile, JSON.stringify(cache));
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
