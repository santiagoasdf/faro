"""Saca capturas de la UI con datos FICTICIOS (modo ?mock, solo en `npm run dev`).

Requisitos: `pip install playwright` + `playwright install chromium`, y el dev server corriendo:
    npm run dev
    python tools/capturas.py [http://localhost:5173/]

Necesita mock/mock-api.js (carpeta ignorada por git). Guarda login.png en la raíz y el resto en capturas/.
"""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173/").rstrip("/") + "/"
RAIZ = Path(__file__).resolve().parent.parent
OUT = RAIZ / "capturas"
OUT.mkdir(exist_ok=True)

DESKTOP = {"viewport": {"width": 1440, "height": 900}, "device_scale_factor": 1}
MOBILE = {
    "viewport": {"width": 390, "height": 844},
    "device_scale_factor": 2,
    "is_mobile": True,
    "has_touch": True,
}

errores = []


def nueva(browser, perfil):
    ctx = browser.new_context(locale="es-AR", timezone_id="America/Argentina/Buenos_Aires", **perfil)
    page = ctx.new_page()
    page.on("console", lambda m: m.type == "error" and errores.append(f"console: {m.text}"))
    page.on("pageerror", lambda e: errores.append(f"pageerror: {e}"))
    return ctx, page


def esperar_datos(page):
    page.wait_for_selector(".contenido .bloque, .tablero, .grupos-lista", timeout=10000)
    page.wait_for_timeout(500)


def foto(page, nombre, full=False):
    page.screenshot(path=str(OUT / nombre), full_page=full)
    print("ok", nombre)


with sync_playwright() as p:
    browser = p.chromium.launch()

    # --- Login (desktop + mobile), incluye el paso del código ---
    for perfil, suf in ((DESKTOP, "desktop"), (MOBILE, "mobile")):
        ctx, page = nueva(browser, perfil)
        page.goto(BASE + "?mock")
        page.wait_for_selector("text=Entrá a Faro")
        page.wait_for_timeout(900)
        if suf == "desktop":
            page.screenshot(path=str(RAIZ / "login.png"))
            print("ok login.png")
        foto(page, f"login-{suf}.png")
        page.fill("input[type=email]", "santi@ejemplo.test")
        page.click("text=Mandame el código")
        page.wait_for_selector("text=Revisá tu mail")
        page.fill(".input-codigo", "111111")
        page.click("button:has-text('Entrar')")
        page.wait_for_selector(".error")
        foto(page, f"login-codigo-error-{suf}.png")
        page.fill(".input-codigo", "123456")
        page.click("button:has-text('Entrar')")
        esperar_datos(page)
        ctx.close()

    # --- Vistas principales con sesión ficticia ---
    for perfil, suf in ((DESKTOP, "desktop"), (MOBILE, "mobile")):
        ctx, page = nueva(browser, perfil)
        page.goto(BASE + "?mock&auto#/inicio")
        esperar_datos(page)
        foto(page, f"inicio-{suf}.png", full=(suf == "mobile"))

        page.goto(BASE + "?mock&auto#/pipeline")
        esperar_datos(page)
        if suf == "mobile":
            page.click(".tab-etapa:has-text('Contactado')")
            page.wait_for_timeout(300)
        foto(page, f"pipeline-{suf}.png")

        page.click(".columna.activa .tarjeta-abrir >> nth=0" if suf == "mobile" else ".columna:nth-child(5) .tarjeta-abrir >> nth=0")
        page.wait_for_selector(".historial, .historial-vacio")
        page.wait_for_timeout(450)
        foto(page, f"detalle-negocio-{suf}.png")
        page.click("button:has-text('Registrar contacto')")
        page.wait_for_timeout(250)
        page.locator(".form-inline").scroll_into_view_if_needed()
        foto(page, f"registrar-contacto-{suf}.png")
        page.keyboard.press("Escape")
        page.wait_for_timeout(400)

        page.goto(BASE + "?mock&auto#/seguimiento")
        esperar_datos(page)
        foto(page, f"seguimiento-{suf}.png", full=(suf == "mobile"))
        page.click(".lead >> nth=0")
        page.wait_for_selector(".historial, .historial-vacio")
        page.wait_for_timeout(450)
        foto(page, f"detalle-lead-{suf}.png")
        ctx.close()

    # --- Cuenta no habilitada ---
    ctx, page = nueva(browser, MOBILE)
    page.goto(BASE + "?mock&auto&nohab")
    page.wait_for_selector("text=no está habilitada")
    foto(page, "no-habilitada-mobile.png")
    ctx.close()

    # --- 360 px: que nada desborde ---
    ctx, page = nueva(browser, {**MOBILE, "viewport": {"width": 360, "height": 740}})
    for ruta in ("#/inicio", "#/pipeline", "#/seguimiento"):
        page.goto(BASE + "?mock&auto" + ruta)
        esperar_datos(page)
        ancho = page.evaluate("document.documentElement.scrollWidth")
        if ancho > 360:
            errores.append(f"desborde horizontal en {ruta}: {ancho}px")
    foto(page, "seguimiento-360.png")
    ctx.close()

    browser.close()

print("\n".join(errores) if errores else "Sin errores de consola ni desbordes.")
