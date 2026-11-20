// wraps a snippet (statements + optional class/method declarations) into a runnable Main class
function wrapSnippet(code) {
  const lines = code.split('\n'); const decls = [], stmts = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^(static |class |abstract class |record |interface |enum )/.test(l)) {
      let bal = 0, j = i; const block = [];
      do { const x = lines[j]; for (const ch of x) { if (ch === '{') bal++; else if (ch === '}') bal--; } block.push(x); j++; } while (bal > 0 && j < lines.length);
      if (/^(class |abstract class )/.test(block[0])) block[0] = 'static ' + block[0];
      decls.push(...block.map(x => '    ' + x)); i = j - 1;
    } else stmts.push('        ' + l);
  }
  return `import java.util.*;\nimport java.util.stream.*;\n\npublic class Main {\n${decls.join('\n')}${decls.length ? '\n\n' : ''}    public static void main(String[] args) {\n${stmts.join('\n')}\n    }\n}\n`;
}
if (typeof module !== 'undefined') module.exports = wrapSnippet;
