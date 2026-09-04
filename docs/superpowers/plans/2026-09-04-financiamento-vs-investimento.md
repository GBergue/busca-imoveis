# Financiamento vs Investimento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new independent page (`financiamento.html`) where the user builds multiple financing (PRICE/SAC) + investment scenarios and compares final net worth.

**Architecture:** Pure calculation functions live in `financiamento-calc.js`, loaded as a classic (non-module) script so the page keeps working when opened via `file://`, and dual-exported (guarded `module.exports`) so `node:assert` tests can import them directly. `financiamento.html` is a self-contained page (inline `<script>`, same CSS conventions as `index.html`) that persists scenarios to `localStorage` and renders a comparison table + per-scenario cards (summary, canvas chart, collapsible month-by-month table).

**Tech Stack:** Vanilla JS, no framework, no build step, `node:assert/strict` for tests — matching the rest of the repo.

**Spec:** `docs/superpowers/specs/2026-09-04-financiamento-vs-investimento-design.md`

## Global Constraints

- No new npm dependencies (no chart library — hand-drawn `<canvas>`).
- No ES module `import`/`export` in browser-loaded scripts — everything must work opened directly via `file://` (Chrome/Firefox block ES module fetches over `file://`).
- Interest rate conversion is always compound: `i_mensal = (1 + i_anual)^(1/12) - 1`.
- Property value does **not** appreciate; investment balance is not taxed; financing has no insurance/fees/TR correction — these are explicit out-of-scope simplifications from the spec.
- `patrimonioFinal = valorFinanciado + saldoFinalInvestimento`.
- Follow existing repo conventions: flat file layout at repo root, pt-BR labels/comments, CSS variables `--bd`/`--mut` from `index.html`.

---

### Task 1: Financing calc — taxa mensal + PRICE

**Files:**
- Create: `financiamento-calc.js`
- Create: `test-financiamento.mjs`

**Interfaces:**
- Produces: `taxaMensal(taxaAnual: number): number`
- Produces: `calcularParcelasPrice(valorFinanciado: number, taxaAnual: number, prazoAnos: number): { tipo: "PRICE", meses: Array<{mes, parcela, juros, amortizacao, saldoDevedor}>, totalPago: number, totalJuros: number }`

- [ ] **Step 1: Write the failing test**

Create `test-financiamento.mjs`:

```js
// Teste do módulo de cálculo financiamento vs investimento. Roda: node test-financiamento.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { taxaMensal, calcularParcelasPrice } = require("./financiamento-calc.js");

// taxaMensal: round-trip deve devolver a taxa anual original
for (const ta of [0, 0.05, 0.1, 0.15]) {
  const tm = taxaMensal(ta);
  const voltaParaAnual = Math.pow(1 + tm, 12) - 1;
  assert.ok(Math.abs(voltaParaAnual - ta) < 1e-9, `taxaMensal round-trip falhou para ${ta}: voltou ${voltaParaAnual}`);
}
assert.equal(taxaMensal(0), 0, "taxa 0 deve gerar taxa mensal 0");

// PRICE com taxa 0: parcela é só o principal dividido pelos meses
{
  const r = calcularParcelasPrice(120000, 0, 1);
  assert.equal(r.tipo, "PRICE");
  assert.equal(r.meses.length, 12);
  assert.ok(Math.abs(r.meses[0].parcela - 10000) < 1e-6, `parcela esperada 10000, veio ${r.meses[0].parcela}`);
  assert.ok(Math.abs(r.meses.at(-1).saldoDevedor) < 1e-6, `saldo devedor deveria zerar, veio ${r.meses.at(-1).saldoDevedor}`);
  assert.ok(Math.abs(r.totalJuros) < 1e-6, `sem juros com taxa 0, veio ${r.totalJuros}`);
}

// PRICE com juros: parcela é constante em todos os meses e saldo devedor zera no fim
{
  const r = calcularParcelasPrice(300000, 0.1, 30);
  const primeira = r.meses[0].parcela;
  for (const m of r.meses) assert.ok(Math.abs(m.parcela - primeira) < 1e-6, "parcela PRICE deve ser constante");
  assert.ok(Math.abs(r.meses.at(-1).saldoDevedor) < 1e-3, `saldo devedor deveria zerar, veio ${r.meses.at(-1).saldoDevedor}`);
  const somaAmortizacoes = r.meses.reduce((s, m) => s + m.amortizacao, 0);
  assert.ok(Math.abs(somaAmortizacoes - 300000) < 1e-3, `soma das amortizações deveria ser 300000, veio ${somaAmortizacoes}`);
}

console.log("ok — taxaMensal e PRICE passaram");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-financiamento.mjs`
Expected: fails with a `MODULE_NOT_FOUND` error (or `.default is not a function`) because `financiamento-calc.js` doesn't exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `financiamento-calc.js`:

```js
// Cálculos de financiamento (PRICE/SAC) e investimento. Script clássico —
// sem import/export — para funcionar abrindo financiamento.html via file://.
// module.exports fica guardado para ser usado nos testes via Node.

function taxaMensal(taxaAnual) {
  return Math.pow(1 + taxaAnual, 1 / 12) - 1;
}

function calcularParcelasPrice(valorFinanciado, taxaAnual, prazoAnos) {
  const i = taxaMensal(taxaAnual);
  const n = prazoAnos * 12;
  const parcela = i === 0 ? valorFinanciado / n : valorFinanciado * i / (1 - Math.pow(1 + i, -n));
  const meses = [];
  let saldoDevedor = valorFinanciado;
  let totalPago = 0, totalJuros = 0;
  for (let mes = 1; mes <= n; mes++) {
    const juros = saldoDevedor * i;
    const amortizacao = parcela - juros;
    saldoDevedor = Math.max(0, saldoDevedor - amortizacao);
    meses.push({ mes, parcela, juros, amortizacao, saldoDevedor });
    totalPago += parcela;
    totalJuros += juros;
  }
  return { tipo: "PRICE", meses, totalPago, totalJuros };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { taxaMensal, calcularParcelasPrice };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-financiamento.mjs`
Expected: prints `ok — taxaMensal e PRICE passaram` and exits 0.

- [ ] **Step 5: Commit**

```bash
git add financiamento-calc.js test-financiamento.mjs
git commit -m "Add taxaMensal and PRICE amortization calc with tests"
```

---

### Task 2: SAC + investimento + patrimonioFinal, wire npm test

**Files:**
- Modify: `financiamento-calc.js`
- Modify: `test-financiamento.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `taxaMensal` from Task 1.
- Produces: `calcularParcelasSac(valorFinanciado, taxaAnual, prazoAnos): { tipo: "SAC", meses: Array<{mes, parcela, juros, amortizacao, saldoDevedor}>, totalPago, totalJuros }`
- Produces: `calcularFinanciamento(valorFinanciado, taxaAnual, prazoAnos, tipo: "PRICE"|"SAC")` — dispatches to the right function above. Used by `financiamento.html` in Task 3.
- Produces: `evoluirInvestimento(valorInicial, aporteMensal, taxaAnual, numMeses): { meses: Array<{mes, saldo}>, saldoFinal: number }`
- Produces: `patrimonioFinal(valorFinanciado, saldoFinalInvestimento): number`

- [ ] **Step 1: Write the failing test**

Append to `test-financiamento.mjs` (add these imports to the existing `require` destructure at the top, and add the assertions before the final `console.log`):

```js
// add to the existing destructure:
// const { taxaMensal, calcularParcelasPrice, calcularParcelasSac, calcularFinanciamento, evoluirInvestimento, patrimonioFinal } = require("./financiamento-calc.js");

// SAC: amortização constante, parcela decrescente, saldo devedor zera no fim
{
  const r = calcularParcelasSac(300000, 0.1, 30);
  assert.equal(r.tipo, "SAC");
  const amort = r.meses[0].amortizacao;
  for (const m of r.meses) assert.ok(Math.abs(m.amortizacao - amort) < 1e-6, "amortização SAC deve ser constante");
  assert.ok(r.meses[0].parcela > r.meses.at(-1).parcela, "parcela SAC deve ser decrescente");
  assert.ok(Math.abs(r.meses.at(-1).saldoDevedor) < 1e-3, `saldo devedor deveria zerar, veio ${r.meses.at(-1).saldoDevedor}`);
}

// calcularFinanciamento: dispatcher
{
  assert.equal(calcularFinanciamento(100000, 0.1, 10, "SAC").tipo, "SAC");
  assert.equal(calcularFinanciamento(100000, 0.1, 10, "PRICE").tipo, "PRICE");
}

// evoluirInvestimento: sem rendimento, só aportes
{
  const r = evoluirInvestimento(0, 1000, 0, 12);
  assert.equal(r.meses.length, 12);
  assert.ok(Math.abs(r.saldoFinal - 12000) < 1e-6, `saldoFinal esperado 12000, veio ${r.saldoFinal}`);
}

// evoluirInvestimento: sem aporte, só o valor inicial (parado, taxa 0)
{
  const r = evoluirInvestimento(5000, 0, 0, 6);
  assert.ok(Math.abs(r.saldoFinal - 5000) < 1e-6, `saldoFinal esperado 5000, veio ${r.saldoFinal}`);
}

// patrimonioFinal
{
  assert.equal(patrimonioFinal(500000, 200000), 700000);
}

console.log("ok — SAC, investimento e patrimônio passaram");
```

Also update the `require` destructure line near the top of the file to include the new names.

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-financiamento.mjs`
Expected: fails because `calcularParcelasSac`, `calcularFinanciamento`, `evoluirInvestimento`, `patrimonioFinal` are `undefined`.

- [ ] **Step 3: Write minimal implementation**

Append to `financiamento-calc.js` (before the `module.exports` block):

```js
function calcularParcelasSac(valorFinanciado, taxaAnual, prazoAnos) {
  const i = taxaMensal(taxaAnual);
  const n = prazoAnos * 12;
  const amortizacao = valorFinanciado / n;
  const meses = [];
  let saldoDevedor = valorFinanciado;
  let totalPago = 0, totalJuros = 0;
  for (let mes = 1; mes <= n; mes++) {
    const juros = saldoDevedor * i;
    const parcela = amortizacao + juros;
    saldoDevedor = Math.max(0, saldoDevedor - amortizacao);
    meses.push({ mes, parcela, juros, amortizacao, saldoDevedor });
    totalPago += parcela;
    totalJuros += juros;
  }
  return { tipo: "SAC", meses, totalPago, totalJuros };
}

function calcularFinanciamento(valorFinanciado, taxaAnual, prazoAnos, tipo) {
  return tipo === "SAC"
    ? calcularParcelasSac(valorFinanciado, taxaAnual, prazoAnos)
    : calcularParcelasPrice(valorFinanciado, taxaAnual, prazoAnos);
}

function evoluirInvestimento(valorInicial, aporteMensal, taxaAnual, numMeses) {
  const i = taxaMensal(taxaAnual);
  const meses = [];
  let saldo = valorInicial;
  for (let mes = 1; mes <= numMeses; mes++) {
    saldo = saldo * (1 + i) + aporteMensal;
    meses.push({ mes, saldo });
  }
  return { meses, saldoFinal: saldo };
}

function patrimonioFinal(valorFinanciado, saldoFinalInvestimento) {
  return valorFinanciado + saldoFinalInvestimento;
}
```

Update the `module.exports` block at the end of `financiamento-calc.js` to:

```js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    taxaMensal,
    calcularParcelasPrice,
    calcularParcelasSac,
    calcularFinanciamento,
    evoluirInvestimento,
    patrimonioFinal,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-financiamento.mjs`
Expected: prints both `ok —` lines and exits 0.

- [ ] **Step 5: Wire into `npm test`**

In `package.json`, change the `"test"` script from:

```json
"test": "node test.mjs"
```

to:

```json
"test": "node test.mjs && node test-financiamento.mjs"
```

Run: `npm test`
Expected: both test files run, both print their `ok —` lines, exit code 0.

- [ ] **Step 6: Commit**

```bash
git add financiamento-calc.js test-financiamento.mjs package.json
git commit -m "Add SAC and investment calc, wire into npm test"
```

---

### Task 3: `financiamento.html` page

**Files:**
- Create: `financiamento.html`

**Interfaces:**
- Consumes: `calcularFinanciamento`, `evoluirInvestimento`, `patrimonioFinal` from `financiamento-calc.js` (Task 1/2), as browser globals via `<script src="financiamento-calc.js">`.
- Scenario shape stored in `localStorage["financiamento_cenarios"]`:
  ```js
  {
    id: string,
    nome: string,
    financiamento: { valorFinanciado: number, taxaAnual: number, prazoAnos: number, tipo: "PRICE"|"SAC" },
    investimento: { valorInicial: number, aporteMensal: number, taxaAnual: number },
  }
  ```

- [ ] **Step 1: Write the page**

Create `financiamento.html`:

```html
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Financiamento vs Investimento</title>
<style>
  :root { color-scheme: light dark; --bd: #8883; --mut: #8886; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.45 system-ui, sans-serif; padding: 20px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 24px 0 8px; }
  a.voltar { color: inherit; font-size: 13px; }
  fieldset { border: 1px solid var(--bd); border-radius: 8px; margin: 0; padding: 10px 12px; }
  legend { padding: 0 4px; color: var(--mut); font-size: 12px; }
  form#novoCenario { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; margin: 16px 0 20px; }
  form#novoCenario label { display: block; font-size: 12px; color: var(--mut); margin-bottom: 2px; }
  form#novoCenario input, form#novoCenario select { padding: 6px 8px; border: 1px solid var(--bd); border-radius: 6px; font: inherit; background: transparent; color: inherit; width: 140px; }
  form#novoCenario .campo { display: flex; flex-direction: column; }
  form#novoCenario .grupo { display: flex; gap: 10px; flex-wrap: wrap; }
  form#novoCenario button { align-self: flex-end; padding: 8px 14px; border: 1px solid var(--bd); border-radius: 6px; background: transparent; color: inherit; font: inherit; cursor: pointer; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid var(--bd); }
  th.num, td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .cards { display: flex; flex-direction: column; gap: 16px; }
  .card { border: 1px solid var(--bd); border-radius: 8px; padding: 14px; }
  .card h3 { margin: 0 0 8px; font-size: 14px; display: flex; justify-content: space-between; align-items: center; }
  .card h3 button { font: inherit; color: inherit; background: transparent; border: 1px solid var(--bd); border-radius: 6px; padding: 2px 8px; cursor: pointer; }
  .card .resumo { display: flex; flex-wrap: wrap; gap: 4px 20px; color: var(--mut); margin-bottom: 10px; font-size: 13px; }
  .card .resumo b { color: inherit; }
  canvas { max-width: 100%; border: 1px solid var(--bd); border-radius: 6px; }
  details table { margin-top: 10px; }
  .vazio { color: var(--mut); padding: 20px 0; }
</style>
</head>
<body>
<a class="voltar" href="index.html">← imóveis</a>
<h1>Financiamento vs Investimento</h1>

<form id="novoCenario">
  <div class="campo"><label for="nome">Nome (opcional)</label><input id="nome" type="text" placeholder="SAC 9% 25 anos"></div>
  <fieldset>
    <legend>Financiamento</legend>
    <div class="grupo">
      <div class="campo"><label for="valorFinanciado">Valor financiado (R$)</label><input id="valorFinanciado" type="number" required min="0" step="0.01"></div>
      <div class="campo"><label for="taxaFin">Taxa ao ano (%)</label><input id="taxaFin" type="number" required min="0" step="0.01"></div>
      <div class="campo"><label for="prazoAnos">Prazo (anos)</label><input id="prazoAnos" type="number" required min="1" step="1"></div>
      <div class="campo"><label for="tipo">Tipo</label>
        <select id="tipo"><option value="PRICE">PRICE</option><option value="SAC">SAC</option></select>
      </div>
    </div>
  </fieldset>
  <fieldset>
    <legend>Investimento</legend>
    <div class="grupo">
      <div class="campo"><label for="valorInicial">Valor investido inicial (R$)</label><input id="valorInicial" type="number" min="0" step="0.01" value="0"></div>
      <div class="campo"><label for="aporteMensal">Aporte mensal (R$)</label><input id="aporteMensal" type="number" required min="0" step="0.01"></div>
      <div class="campo"><label for="taxaInv">Rendimento ao ano (%)</label><input id="taxaInv" type="number" required min="0" step="0.01"></div>
    </div>
  </fieldset>
  <button type="submit">Adicionar cenário</button>
</form>

<h2>Comparativo</h2>
<table id="comparativo">
  <thead><tr><th>Cenário</th><th class="num">Total pago</th><th class="num">Total juros</th><th class="num">Saldo investido</th><th class="num">Patrimônio final</th></tr></thead>
  <tbody id="comparativoCorpo"></tbody>
</table>

<h2>Cenários</h2>
<div class="cards" id="cards"></div>
<div class="vazio" id="vazio" hidden>Nenhum cenário ainda. Preencha o formulário acima.</div>

<script src="financiamento-calc.js"></script>
<script>
const $ = id => document.getElementById(id);
const fmt = v => "R$ " + v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const CHAVE = "financiamento_cenarios";

const lerCenarios = () => { try { return JSON.parse(localStorage.getItem(CHAVE)) || []; } catch { return []; } };
const salvarCenarios = cs => localStorage.setItem(CHAVE, JSON.stringify(cs));

let cenarios = lerCenarios();

function atualizarAporteSugerido() {
  const vf = +$("valorFinanciado").value, ta = +$("taxaFin").value / 100, pa = +$("prazoAnos").value, tipo = $("tipo").value;
  if (!vf || !ta || !pa) return;
  const r = calcularFinanciamento(vf, ta, pa, tipo);
  $("aporteMensal").value = r.meses[0].parcela.toFixed(2);
}
["valorFinanciado", "taxaFin", "prazoAnos", "tipo"].forEach(id => $(id).addEventListener("input", atualizarAporteSugerido));

function calcularCenario(c) {
  const { valorFinanciado, taxaAnual, prazoAnos, tipo } = c.financiamento;
  const fin = calcularFinanciamento(valorFinanciado, taxaAnual, prazoAnos, tipo);
  const inv = evoluirInvestimento(c.investimento.valorInicial, c.investimento.aporteMensal, c.investimento.taxaAnual, fin.meses.length);
  const patrimonio = patrimonioFinal(valorFinanciado, inv.saldoFinal);
  return { fin, inv, patrimonio };
}

function desenharGrafico(canvas, fin, inv) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const maxY = Math.max(fin.meses[0].saldoDevedor, inv.saldoFinal, 1);
  const n = fin.meses.length;
  const x = i => n === 1 ? 10 : (i / (n - 1)) * (w - 20) + 10;
  const y = v => h - 10 - (v / maxY) * (h - 20);
  const linha = (pontos, cor) => {
    ctx.strokeStyle = cor; ctx.lineWidth = 2; ctx.beginPath();
    pontos.forEach((v, i) => i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v)));
    ctx.stroke();
  };
  linha(fin.meses.map(m => m.saldoDevedor), "#e06666");
  linha(inv.meses.map(m => m.saldo), "#6699e0");
}

function linhaMesAMes(fin, inv) {
  return fin.meses.map((m, i) => `<tr>
    <td class="num">${m.mes}</td><td class="num">${fmt(m.parcela)}</td><td class="num">${fmt(m.juros)}</td>
    <td class="num">${fmt(m.amortizacao)}</td><td class="num">${fmt(m.saldoDevedor)}</td>
    <td class="num">${fmt(inv.meses[i].saldo)}</td>
  </tr>`).join("");
}

function render() {
  const linhas = cenarios.map(c => ({ c, ...calcularCenario(c) }))
    .sort((a, b) => b.patrimonio - a.patrimonio);

  $("comparativoCorpo").innerHTML = linhas.map(({ c, fin, inv, patrimonio }) => `<tr>
    <td>${c.nome || "(sem nome)"}</td>
    <td class="num">${fmt(fin.totalPago)}</td>
    <td class="num">${fmt(fin.totalJuros)}</td>
    <td class="num">${fmt(inv.saldoFinal)}</td>
    <td class="num">${fmt(patrimonio)}</td>
  </tr>`).join("");

  $("cards").innerHTML = linhas.map(({ c, fin, inv, patrimonio }) => `
    <div class="card" data-id="${c.id}">
      <h3>${c.nome || "(sem nome)"} <button type="button" class="remover" data-id="${c.id}">remover</button></h3>
      <div class="resumo">
        <span>total pago: <b>${fmt(fin.totalPago)}</b></span>
        <span>total juros: <b>${fmt(fin.totalJuros)}</b></span>
        <span>saldo investido: <b>${fmt(inv.saldoFinal)}</b></span>
        <span>patrimônio final: <b>${fmt(patrimonio)}</b></span>
      </div>
      <canvas width="600" height="160"></canvas>
      <details>
        <summary>tabela mês a mês</summary>
        <table>
          <thead><tr><th class="num">Mês</th><th class="num">Parcela</th><th class="num">Juros</th><th class="num">Amortização</th><th class="num">Saldo devedor</th><th class="num">Saldo investido</th></tr></thead>
          <tbody>${linhaMesAMes(fin, inv)}</tbody>
        </table>
      </details>
    </div>
  `).join("");

  [...$("cards").querySelectorAll("canvas")].forEach((canvas, i) => desenharGrafico(canvas, linhas[i].fin, linhas[i].inv));
  $("cards").querySelectorAll(".remover").forEach(btn => btn.onclick = () => {
    cenarios = cenarios.filter(c => c.id !== btn.dataset.id);
    salvarCenarios(cenarios);
    render();
  });

  $("vazio").hidden = cenarios.length > 0;
  $("comparativo").hidden = cenarios.length === 0;
}

$("novoCenario").addEventListener("submit", e => {
  e.preventDefault();
  const c = {
    id: String(Date.now()),
    nome: $("nome").value.trim(),
    financiamento: {
      valorFinanciado: +$("valorFinanciado").value,
      taxaAnual: +$("taxaFin").value / 100,
      prazoAnos: +$("prazoAnos").value,
      tipo: $("tipo").value,
    },
    investimento: {
      valorInicial: +$("valorInicial").value,
      aporteMensal: +$("aporteMensal").value,
      taxaAnual: +$("taxaInv").value / 100,
    },
  };
  cenarios.push(c);
  salvarCenarios(cenarios);
  e.target.reset();
  render();
});

render();
</script>
</body>
</html>
```

- [ ] **Step 2: Manual verification (no automated UI test in this repo)**

Open `financiamento.html` directly in a browser (double-click the file, or `file:///E:/workspaceJs/busca-imoveis/financiamento.html`):
1. Confirm the empty state shows "Nenhum cenário ainda." and the comparativo table is hidden.
2. Fill the form: valor financiado `300000`, taxa `10`, prazo `30`, tipo `SAC`. Confirm "Aporte mensal" auto-fills as you type (should update after the last required field is filled).
3. Fill valor investido inicial `0`, rendimento `8`. Submit.
4. Confirm a card appears with a canvas chart (red line falling = saldo devedor, blue line rising = saldo investido), a comparativo table row, and that expanding "tabela mês a mês" shows 360 rows.
5. Reload the page — confirm the scenario persists (read from localStorage).
6. Add a second scenario with `PRICE` and a different rate, confirm the comparativo table now has 2 rows sorted by patrimônio final (highest first).
7. Click "remover" on one card, confirm it disappears from both the card list and the comparativo table, and stays gone after reload.

- [ ] **Step 3: Commit**

```bash
git add financiamento.html
git commit -m "Add financiamento.html scenario builder page"
```

---

### Task 4: Cross-links and docs

**Files:**
- Modify: `index.html`
- Modify: `README.md`

**Interfaces:**
- None (pure wiring/docs, no new functions).

- [ ] **Step 1: Add a link from `index.html` to the new page**

In `index.html`, right after `<h1>Busca de Imóveis</h1>` (around line 61), add:

```html
<h1>Busca de Imóveis</h1>
<p><a href="financiamento.html">financiamento vs investimento →</a></p>
```

- [ ] **Step 2: Update `README.md`'s file table**

In the `## Arquivos` table in `README.md` (around line 33-41), add two rows after the `overrides.json` row:

```markdown
| `financiamento.html` | simulador de financiamento (PRICE/SAC) vs investimento, com cenários salvos localmente |
| `financiamento-calc.js` | funções puras de cálculo de financiamento/investimento. Tem teste (`npm test`) |
```

- [ ] **Step 3: Verify the full test suite still passes**

Run: `npm test`
Expected: both `ok —` lines from `test.mjs` and `test-financiamento.mjs` print, exit code 0.

- [ ] **Step 4: End-to-end manual check**

Open `index.html`, confirm the new "financiamento vs investimento →" link is visible and navigates to `financiamento.html`. From there, confirm "← imóveis" navigates back.

- [ ] **Step 5: Commit**

```bash
git add index.html README.md
git commit -m "Link financiamento module from the dashboard and document it"
```

---

## After all tasks

Push the branch:

```bash
git push
```
