#!/bin/sh
cd "$(dirname "$0")"
mkdir -p dist
cat src/mj-parse.js src/mj-runtime.js src/mj-exec.js src/mj-lib.js src/mj-api.js > dist/minijava.js
