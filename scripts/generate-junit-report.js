/*
 * Genera un informe HTML estático a partir de reports/junit.xml
 * Uso: node scripts/generate-junit-report.js
 */
const fs = require('fs');
const path = require('path');

// Prefer reports/junit.xml, fallback to reports/tfg-test-results/junit-tfg.xml
let junitPath = path.resolve(__dirname, '../reports/junit.xml');
if (!fs.existsSync(junitPath)) {
  const alt = path.resolve(__dirname, '../reports/tfg-test-results/junit-tfg.xml');
  if (fs.existsSync(alt)) junitPath = alt;
}
const outPath = path.resolve(__dirname, '../reports/index.html');

function read(file) {
  return fs.readFileSync(file, 'utf-8');
}

function write(file, content) {
  fs.writeFileSync(file, content, 'utf-8');
}

function extractAttr(tag, attr) {
  const re = new RegExp(attr + '="([^"]*)"');
  const m = re.exec(tag);
  return m ? m[1] : '';
}

function parseJUnit(xml) {
  const suitesTag = xml.match(/<testsuites[^>]*>/);
  if (!suitesTag) throw new Error('Nodo <testsuites> no encontrado');
  const tsTag = suitesTag[0];
  const tests = Number(extractAttr(tsTag, 'tests') || '0');
  const failures = Number(extractAttr(tsTag, 'failures') || '0');
  const errors = Number(extractAttr(tsTag, 'errors') || '0');
  const time = extractAttr(tsTag, 'time') || '';
  const passed = tests - failures - errors;

  const suites = [];
  const suiteRegex = /<testsuite\b[^>]*>/g;
  let m;
  while ((m = suiteRegex.exec(xml))) {
    const tag = m[0];
    suites.push({
      name: extractAttr(tag, 'name') || 'suite',
      tests: Number(extractAttr(tag, 'tests') || '0'),
      failures: Number(extractAttr(tag, 'failures') || '0'),
      errors: Number(extractAttr(tag, 'errors') || '0'),
      time: extractAttr(tag, 'time') || ''
    });
  }
  return { tests, failures, errors, time, passed, suites };
}

function render({ tests, failures, errors, time, passed, suites }) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Resumen de Tests</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 24px; color: #111; }
    h1 { margin: 0 0 8px; font-size: 20px; }
    .muted { color: #666; font-size: 12px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-top: 16px; }
    .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; }
    .kpi { font-size: 22px; font-weight: 700; margin-top: 4px; }
    .ok { color: #16a34a; }
    .warn { color: #f59e0b; }
    .err { color: #dc2626; }
  </style>
 </head>
 <body>
  <h1>Resumen de Tests (JUnit)</h1>
  <div class="muted">Fuente: <code>reports/junit.xml</code> · Generado: ${new Date().toISOString()}</div>
  <div class="grid">
    <div class="card"><div>Total tests</div><div class="kpi">${tests}</div></div>
    <div class="card"><div>Superados</div><div class="kpi ok">${passed}</div></div>
    <div class="card"><div>Fallos</div><div class="kpi warn">${failures}</div></div>
    <div class="card"><div>Errores</div><div class="kpi err">${errors}</div></div>
    <div class="card"><div>Tiempo total (s)</div><div class="kpi">${time}</div></div>
    <div class="card"><div>Suites</div><div class="kpi">${suites.length}</div></div>
  </div>
  <h2 style="margin-top:24px">Suites</h2>
  ${suites.map(s => `
    <div class="card">
      <div><strong>${s.name}</strong></div>
      <div class="muted">tests: ${s.tests} · fail: ${s.failures} · err: ${s.errors} · time: ${s.time}s</div>
    </div>`).join('')}
 </body>
 </html>`;
}

try {
  const xml = read(junitPath);
  const data = parseJUnit(xml);
  const html = render(data);
  write(outPath, html);
  console.log('Informe generado en', outPath);
} catch (e) {
  console.error('Error generando informe:', e && e.message);
  process.exit(1);
}


