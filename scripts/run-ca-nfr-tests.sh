#!/bin/bash
# Script para ejecutar TODOS los tests de Criterios de Aceptación NFR
# Sin tests skipped

echo "🧪 Ejecutando tests de Criterios de Aceptación NFR..."
echo ""

npm run tests -- \
  tests/8.4-non-functional/load-performance-nfr.test.js \
  tests/8.4-non-functional/interaction-latency-nfr.test.js \
  tests/8.4-non-functional/novice-usability-nfr.test.js \
  tests/8.4-non-functional/autosave-latency-nfr.test.js \
  tests/8.4-non-functional/e2e-critical-flows-nfr.test.js \
  tests/8.4-non-functional/export-audit-nfr.test.js \
  tests/8.4-non-functional/code-quality-nfr.test.js
