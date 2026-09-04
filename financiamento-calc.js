// Cálculos de financiamento (PRICE/SAC) e investimento. Script clássico —
// sem import/export — para funcionar abrindo financiamento.html via file://.
// module.exports fica guardado para ser usado nos testes via Node.

function taxaMensal(taxaAnual) {
  return Math.pow(1 + taxaAnual, 1 / 12) - 1;
}

// amortizacaoExtra: { valor, periodicidadeMeses } opcional. A cada
// periodicidadeMeses, soma valor à amortização normal do mês — a parcela
// nominal não muda ("reduzir prazo"), então o financiamento pode quitar
// antes de prazoAnos*12 meses e o array `meses` sai mais curto.
function calcularParcelasPrice(valorFinanciado, taxaAnual, prazoAnos, amortizacaoExtra) {
  const i = taxaMensal(taxaAnual);
  const n = prazoAnos * 12;
  const parcela = i === 0 ? valorFinanciado / n : valorFinanciado * i / (1 - Math.pow(1 + i, -n));
  const { valor: valorExtra = 0, periodicidadeMeses: periodoExtra = 0 } = amortizacaoExtra || {};
  const meses = [];
  let saldoDevedor = valorFinanciado;
  let totalPago = 0, totalJuros = 0;
  for (let mes = 1; mes <= n && saldoDevedor > 1e-6; mes++) {
    const juros = saldoDevedor * i;
    const amortizacaoNormal = Math.min(parcela - juros, saldoDevedor);
    const extra = valorExtra > 0 && periodoExtra > 0 && mes % periodoExtra === 0
      ? Math.min(valorExtra, saldoDevedor - amortizacaoNormal) : 0;
    const amortizacao = amortizacaoNormal + extra;
    const parcelaPaga = juros + amortizacaoNormal;
    saldoDevedor = Math.max(0, saldoDevedor - amortizacao);
    meses.push({ mes, parcela: parcelaPaga, juros, amortizacao, extra, saldoDevedor });
    totalPago += parcelaPaga + extra;
    totalJuros += juros;
  }
  return { tipo: "PRICE", meses, totalPago, totalJuros };
}

function calcularParcelasSac(valorFinanciado, taxaAnual, prazoAnos, amortizacaoExtra) {
  const i = taxaMensal(taxaAnual);
  const n = prazoAnos * 12;
  const amortizacaoNormalBase = valorFinanciado / n;
  const { valor: valorExtra = 0, periodicidadeMeses: periodoExtra = 0 } = amortizacaoExtra || {};
  const meses = [];
  let saldoDevedor = valorFinanciado;
  let totalPago = 0, totalJuros = 0;
  for (let mes = 1; mes <= n && saldoDevedor > 1e-6; mes++) {
    const juros = saldoDevedor * i;
    const amortizacaoNormal = Math.min(amortizacaoNormalBase, saldoDevedor);
    const extra = valorExtra > 0 && periodoExtra > 0 && mes % periodoExtra === 0
      ? Math.min(valorExtra, saldoDevedor - amortizacaoNormal) : 0;
    const amortizacao = amortizacaoNormal + extra;
    const parcelaPaga = amortizacaoNormal + juros;
    saldoDevedor = Math.max(0, saldoDevedor - amortizacao);
    meses.push({ mes, parcela: parcelaPaga, juros, amortizacao, extra, saldoDevedor });
    totalPago += parcelaPaga + extra;
    totalJuros += juros;
  }
  return { tipo: "SAC", meses, totalPago, totalJuros };
}

function calcularFinanciamento(valorFinanciado, taxaAnual, prazoAnos, tipo, amortizacaoExtra) {
  return tipo === "SAC"
    ? calcularParcelasSac(valorFinanciado, taxaAnual, prazoAnos, amortizacaoExtra)
    : calcularParcelasPrice(valorFinanciado, taxaAnual, prazoAnos, amortizacaoExtra);
}

function evoluirInvestimento(valorInicial, aporteMensal, taxaAnual, numMeses) {
  const i = taxaMensal(taxaAnual);
  const meses = [];
  let saldo = valorInicial;
  for (let mes = 1; mes <= numMeses; mes++) {
    saldo = saldo * (1 + i) + aporteMensal;
    meses.push({ mes, saldo });
  }
  const totalAportado = valorInicial + aporteMensal * numMeses;
  return { meses, saldoFinal: saldo, totalAportado };
}

// Valor do imóvel ao final de numMeses, capitalizando valorizacaoAnual mês a mês.
function valorImovelFinal(valorImovel, valorizacaoAnual, numMeses) {
  const i = taxaMensal(valorizacaoAnual || 0);
  return valorImovel * Math.pow(1 + i, numMeses);
}

// Saldo líquido de IR sobre o ganho (saldoFinal - totalAportado), alíquota fixa.
function aplicarIR(saldoFinal, totalAportado, aliquotaIR) {
  const ganho = Math.max(0, saldoFinal - totalAportado);
  return saldoFinal - ganho * (aliquotaIR || 0);
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
    valorImovelFinal,
    aplicarIR,
    patrimonioFinal,
  };
}
