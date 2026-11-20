#!/usr/bin/env python3
import pathlib
root = pathlib.Path(__file__).parent
src = root / 'src'
cm_css = (root / 'node_modules/codemirror/lib/codemirror.css').read_text()
css = (src / 'app.css').read_text()
js = '\n'.join((src / f).read_text() for f in ['mj-parse.js', 'mj-runtime.js', 'mj-exec.js', 'mj-lib.js', 'mj-api.js', 'challenges.js', 'games.js', 'wrap.js', 'app.js'])
CM = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16'
html = f'''<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Java Arena</title>
<meta name="description" content="Provocări de programare Java pe capitolele cursului: scrii cod Java care rulează în browser, primești scor și urci în ligi.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&family=Unbounded:wght@600;700;800&display=swap">
<style>
{cm_css}
{css}
</style>
<script src="{CM}/codemirror.min.js"></script>
<script src="{CM}/mode/clike/clike.min.js"></script>
<script src="{CM}/addon/edit/matchbrackets.min.js"></script>
<script src="{CM}/addon/edit/closebrackets.min.js"></script>
</head>
<body>
<div id="app"><main></main></div>
<script>
(() => {{
{js}
}})();
</script>
</body>
</html>
'''
out = root / 'dist' / 'index.html'
out.write_text(html)
print(out, len(html) // 1024, 'KB')
