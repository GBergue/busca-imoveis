// Teste do módulo de cálculo financiamento vs investimento. Roda: node test-financiamento.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { taxaMensal, calcularParcelasPrice, calcularParcelasSac, calcularFinanciamento, evoluirInvestimento, valorImovelFinal, aplicarIR, patrimonioFinal } = require("./financiamento-calc.js");

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

// evoluirInvestimento: totalAportado soma valor inicial + aportes mensais
{
  const r = evoluirInvestimento(1000, 500, 0, 3);
  assert.equal(r.totalAportado, 2500);
}

// amortização extra (SAC, taxa 0): quita antes do prazo, total pago = valor financiado
{
  const r = calcularParcelasSac(120000, 0, 1, { valor: 10000, periodicidadeMeses: 2 });
  assert.equal(r.meses.length, 8, `esperado quitar em 8 meses, veio ${r.meses.length}`);
  assert.ok(Math.abs(r.totalPago - 120000) < 1e-6, `totalPago esperado 120000, veio ${r.totalPago}`);
  assert.ok(Math.abs(r.meses.at(-1).saldoDevedor) < 1e-6, "saldo devedor deveria zerar");
}

// amortização extra (PRICE, taxa 0): quita antes do prazo, sem estourar amortização no último mês
{
  const r = calcularParcelasPrice(120000, 0, 1, { valor: 10000, periodicidadeMeses: 2 });
  assert.ok(r.meses.length < 12, `esperado quitar antes de 12 meses, veio ${r.meses.length}`);
  assert.ok(Math.abs(r.meses.at(-1).saldoDevedor) < 1e-6, "saldo devedor deveria zerar");
}

// valorImovelFinal: sem valorização, valor não muda; com valorização, capitaliza pelo ano
{
  assert.equal(valorImovelFinal(100000, 0, 12), 100000);
  const r = valorImovelFinal(100000, 0.1, 12);
  assert.ok(Math.abs(r - 110000) < 1e-6, `esperado 110000, veio ${r}`);
}

// aplicarIR: taxa sobre o ganho, sem IR sobre prejuízo/principal
{
  assert.ok(Math.abs(aplicarIR(15000, 10000, 0.15) - 14250) < 1e-6);
  assert.equal(aplicarIR(15000, 10000, 0), 15000);
  assert.equal(aplicarIR(9000, 10000, 0.15), 9000, "sem ganho, IR não deve reduzir o saldo");
}

console.log("ok — SAC, investimento e patrimônio passaram");
console.log("ok — taxaMensal e PRICE passaram");
console.log("ok — amortização extra, valorização do imóvel e IR passaram");
