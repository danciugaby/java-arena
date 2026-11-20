const Games = require('../src/games.js'), wrap = require('../src/wrap.js'), M = require('../dist/minijava.js');
const fs = require('fs'), cp = require('child_process');
const env = { ...process.env }; delete env.JAVA_TOOL_OPTIONS; delete env._JAVA_OPTIONS;
function java(src) {
  const dir = fs.mkdtempSync('/tmp/gt-'); fs.writeFileSync(dir + '/Main.java', src);
  const c = cp.spawnSync('javac', ['-d', dir, dir + '/Main.java'], { encoding: 'utf8', env });
  if (c.status !== 0) return { compile: c.stderr };
  const r = cp.spawnSync('java', ['-cp', dir, 'Main'], { encoding: 'utf8', env });
  return { out: r.stdout, err: r.stderr };
}
let bad = 0;
Games.PREDICT.forEach((p, i) => {
  const src = wrap(p.code); const j = java(src); const m = M.run(src, {});
  const ok = !j.compile && m.ok && j.out === m.stdout && !p.wrong.includes(j.out.trim());
  if (!ok) { bad++; console.log(`✗ predict #${i}`, JSON.stringify({ java: j, mini: m.stdout, err: m.text })); }
  else console.log(`✓ predict #${i}: ${JSON.stringify(m.stdout.trim())}`);
});
Games.BUGS.forEach((b, i) => {
  const j = java(b.code);
  const got = j.compile ? j.compile.split('\n')[0].replace(/^.*Main\.java/, 'Main.java') : (j.err || '').trim();
  const firstLine = b.msg.split('\n')[0];
  const lineOk = j.compile ? got.startsWith(`Main.java:${b.line}:`) : (j.err || '').includes(`Main.java:${b.line})`);
  const ok = (j.compile ? got === firstLine : (j.err || '').startsWith(firstLine)) && lineOk;
  if (!ok) { bad++; console.log(`✗ bug #${i}\n  want: ${b.msg}\n  got:  ${got}`); } else console.log(`✓ bug #${i} line ${b.line}`);
  // our interpreter's view of the same program (for the UI's "run it" button)
  const m = M.run(b.code, {});
  console.log(`    mini: ${(m.ok ? 'OK ' + m.stdout : (m.kind + ' ln ' + m.ln + ': ' + (m.text || '').split('\n')[0]))}`);
});
console.log(bad ? `${bad} problems` : 'all good');
process.exitCode = bad ? 1 : 0;
