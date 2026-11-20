const Arena = require('../src/challenges.js');
let bad = 0;
for (const ch of Arena.challenges) {
  const r = Arena.submit(ch, ch.ref);
  const fails = [...r.tests, ...r.validators].filter(t => !(t.pass || t.ok));
  const line = `${ch.id.padEnd(11)} ref: league=${r.league} score=${r.score} size=${r.size} metric=${r.metric}`;
  if (r.compile || r.league !== 'legend') { bad++; console.log('✗ ' + line, r.compile || '', JSON.stringify(r.bonusState)); fails.forEach(f => console.log('   ', JSON.stringify({ got: f.got, want: f.want, why: f.why, err: f.errText || (f.res && f.res.text) }).slice(0, 400))); }
  else console.log('✓ ' + line);
  const s = Arena.submit(ch, ch.starter);
  const sf = [...s.tests, ...s.validators].filter(t => !(t.pass || t.ok)).length;
  console.log(`   starter: compile=${s.compile ? 'ERROR ' + s.compile.split('\n')[0] : 'ok'} league=${s.league} failing=${sf}`);
  if (s.compile) bad++;
}
console.log(bad ? `\n${bad} problems` : '\nall good');
process.exitCode = bad ? 1 : 0;
