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
