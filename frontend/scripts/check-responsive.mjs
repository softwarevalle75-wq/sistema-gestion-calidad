import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const outDir = path.resolve("responsive-check");
fs.mkdirSync(outDir, { recursive: true });

const viewports = [
  { name: "phone-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "tablet-1024", width: 1024, height: 768 },
  { name: "desktop-1280", width: 1280, height: 800 },
];

const fakeUser = {
  id: "00000000-0000-0000-0000-000000000001",
  nombre_usuario: "admin",
  nombre_completo: "Administrador",
  email: "admin@sgc.com",
  permisos: ["sistema.admin"],
};

const innerPages = [
  "/dashboard",
  "/documentos",
  "/ListaDeUsuarios",
  "/configuracion",
  "/procesos",
  "/AuditoriasPlanificacion",
  "/No_conformidades_Abiertas",
  "/riesgos/matriz",
];

const launch = async () => {
  const channels = ["msedge", "chrome", "chrome-beta"];
  for (const channel of channels) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch {
      // try next
    }
  }
  throw new Error("No se encontró Chrome ni Edge para las capturas");
};

const checkOverflow = async (page) => {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflowing: doc.scrollWidth > doc.clientWidth + 2,
    };
  });
};

const fulfillApi = async (page) => {
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/auth/me") || url.includes("/usuarios/")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...fakeUser,
          nombre: "Administrador",
          primer_apellido: "Sistema",
          correo_electronico: "admin@sgc.com",
          area: { nombre: "Calidad" },
          roles: [],
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
};

const browser = await launch();
const results = [];

try {
  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await fulfillApi(page);
    await page.addInitScript(
      ([token, user]) => {
        localStorage.setItem("token", token);
        localStorage.setItem("user", user);
      },
      ["fake-token-for-layout", JSON.stringify(fakeUser)],
    );

    await page.goto("http://localhost:5173/login", { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(300);
    const loginFile = path.join(outDir, `${vp.name}-login.png`);
    results.push({ viewport: vp.name, url: "/login", ...(await checkOverflow(page)), file: loginFile });
    await page.screenshot({ path: loginFile, fullPage: false });

    for (const route of innerPages) {
      await page.goto(`http://localhost:5173${route}`, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(900);
      const slug = route.replaceAll("/", "_");
      const file = path.join(outDir, `${vp.name}${slug}.png`);
      const overflow = await checkOverflow(page);
      await page.screenshot({ path: file, fullPage: false });
      results.push({ viewport: vp.name, url: route, ...overflow, file });
    }

    await page.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(results, null, 2));
if (results.some((r) => r.overflowing)) {
  process.exit(2);
}
