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
