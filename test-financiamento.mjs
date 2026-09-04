// Teste do módulo de cálculo financiamento vs investimento. Roda: node test-financiamento.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { taxaMensal, calcularParcelasPrice } = require("./financiamento-calc.cjs");

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
