// Teste do extrator. Roda: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extrair, aplicarOverride } from "./extract.mjs";

const html = readFileSync(new URL("./fixture.html", import.meta.url), "utf8");
const im = extrair(html, "https://imobiliaria-exemplo.com.br/ap123");

assert.equal(im.preco, 450000, `preco: esperado 450000, veio ${im.preco}`);
assert.equal(im.condominio, 480, `condominio: veio ${im.condominio}`);
assert.equal(im.iptu, 1200, `iptu: veio ${im.iptu}`);
assert.equal(im.quartos, 3, `quartos: veio ${im.quartos}`);
assert.equal(im.suites, 1, `suites: veio ${im.suites}`);
assert.equal(im.banheiros, 2, `banheiros: veio ${im.banheiros}`);
assert.equal(im.vagas, 1, `vagas: veio ${im.vagas}`);
assert.equal(im.area_util, 78, `area_util: veio ${im.area_util}`);
assert.equal(im.area_total, 95, `area_total: veio ${im.area_total}`);
assert.equal(im.tipo, "Apartamento", `tipo: veio ${im.tipo}`);
assert.equal(im.cidade, "Cidade Exemplo", `cidade: veio ${im.cidade}`);
assert.equal(im.bairro, "Centro", `bairro: veio ${im.bairro}`);
assert.equal(im.site, "imobiliaria-exemplo.com.br");
assert.ok(im.caracteristicas.includes("piscina"), "deveria achar piscina");
assert.ok(im.caracteristicas.includes("elevador"), "deveria achar elevador");
assert.ok(im.foto.startsWith("https://cdn.exemplo.com/"), `foto: veio ${im.foto}`);

// override manual sobrescreve campo raspado
const corrigido = aplicarOverride(im, {
  "https://imobiliaria-exemplo.com.br/ap123": { bairro: "Centro Histórico", preco: 445000 },
});
assert.equal(corrigido.bairro, "Centro Histórico");
assert.equal(corrigido.preco, 445000);
assert.equal(corrigido.quartos, 3, "override não deve mexer no resto");

console.log("ok — todos os asserts passaram");
