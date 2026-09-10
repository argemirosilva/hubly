// Renderiza o componente real do login para o catálogo nativo, sem redesenhar a marca.
// PLAYWRIGHT_MODULE: caminho do módulo Playwright instalado no ambiente de build.
// POPPINS_FONT: caminho da fonte Poppins Light usada pelo login.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { HublyLogo } from "../client/src/components/HublyLogo";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
if (!process.env.POPPINS_FONT) throw new Error("Informe POPPINS_FONT (Poppins Light TTF).");
const font = (await readFile(process.env.POPPINS_FONT)).toString("base64");
const icon = (await readFile("client/public/hubly-icon-gold.png")).toString("base64");
const markup = renderToStaticMarkup(<HublyLogo tone="dark" height={64} />)
  .replaceAll("/hubly-icon-gold.png", `data:image/png;base64,${icon}`);
const directory = "ios/App/App/Assets.xcassets/HublyLaunchLogo.imageset";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const page = await browser.newPage({ viewport: { width: 400, height: 200 }, deviceScaleFactor: 3 });
  await page.setContent(`<style>
    @font-face { font-family:Poppins; font-weight:300; src:url(data:font/ttf;base64,${font}); }
    body { margin:0; } #logo>span { display:inline-flex; align-items:center; gap:8px; }
  </style><div id="logo" style="display:inline-flex">${markup}</div>`);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(image => image.decode()));
  });
  await page.locator("#logo").screenshot({ path: `${directory}/logo.png`, omitBackground: true });
  await writeFile(`${directory}/Contents.json`, JSON.stringify({
    images: [{ idiom: "universal", filename: "logo.png", scale: "3x" }],
    info: { version: 1, author: "xcode" },
  }, null, 2) + "\n");
} finally {
  await browser.close();
}
