// Coleta anúncios de imóveis e alimenta o dashboard.
//
//   node scrape.mjs <url1> <url2> ...      (ou coloque as URLs em links.txt, uma por linha)
//
// Abre cada URL no Chromium headless, extrai as características (extract.mjs),
// mescla correções manuais de overrides.json, faz append em data.json (dedupe
// por URL) e regenera data.js para o dashboard.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { chromium } from "playwright";
import { extrair, aplicarOverride } from "./extract.mjs";

const here = (f) => new URL(f, import.meta.url);
const readJSON = (f, fallback) =>
  existsSync(here(f)) ? JSON.parse(readFileSync(here(f), "utf8")) : fallback;

function coletarUrls() {
  const args = process.argv.slice(2).filter(Boolean);
  if (args.length) return args;
  if (existsSync(here("links.txt"))) {
    return readFileSync(here("links.txt"), "utf8")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => l.split(/\s+/)[0]); // ignora anotações após a URL
  }
  return [];
}

const urls = [...new Set(coletarUrls())];
if (!urls.length) {
  console.error("Nenhuma URL. Passe como argumento ou preencha links.txt");
  process.exit(1);
}

const overrides = readJSON("overrides.json", {});
const existentes = readJSON("data.json", []);
const porUrl = new Map(existentes.map((i) => [i.url, i]));

const browser = await chromium.launch();
const ctx = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  locale: "pt-BR",
});

let ok = 0;
for (const url of urls) {
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2500); // deixa o JS renderizar
    const html = await page.content();
    const imovel = aplicarOverride(extrair(html, url), overrides);
    porUrl.set(url, imovel);
    ok++;
    console.log(
      `ok   ${url}\n     ${imovel.tipo ?? "?"} · ${imovel.bairro ?? "?"} · ` +
      `${imovel.quartos ?? "?"}q · ${imovel.area_util ?? "?"}m² · ` +
      `R$ ${imovel.preco?.toLocaleString("pt-BR") ?? "?"}`
    );
  } catch (e) {
    porUrl.set(url, { url, erro: String(e.message || e), coletado_em: new Date().toISOString() });
    console.log(`ERRO ${url}\n     ${e.message || e}`);
  } finally {
    await page.close();
  }
}

await browser.close();

const dados = [...porUrl.values()];
writeFileSync(here("data.json"), JSON.stringify(dados, null, 2));
writeFileSync(here("data.js"), "window.IMOVEIS = " + JSON.stringify(dados, null, 2) + ";\n");

const comErro = dados.filter((d) => d.erro).length;
console.log(`\n${ok}/${urls.length} coletados nesta rodada · ${dados.length} no total · ${comErro} com erro`);
console.log("Abra index.html no navegador.");
