"""Saca capturas de la UI con datos FICTICIOS (modo ?mock, solo en `npm run dev`).

Requisitos: `pip install playwright` + `playwright install chromium`, y el dev server corriendo:
    npm run dev
    python tools/capturas.py [http://localhost:5173/]

Necesita mock/mock-api.js (carpeta ignorada por git). Guarda login.png en la raíz y el resto en capturas/. Las contraseñas que usa son de relleno: el mock acepta cualquiera de 8+ caracteres.
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

    # --- Login (desktop + mobile): paso del mail y paso de la contraseña, con sus errores ---
    # El mock acepta cualquier mail con una contraseña de 8+ caracteres; las de prueba se generan acá
    # y no corresponden a ninguna cuenta real.
    corta = "x" * 5
    valida = "prueba-" + "x" * 8
    for perfil, suf in ((DESKTOP, "desktop"), (MOBILE, "mobile")):
        ctx, page = nueva(browser, perfil)
        page.goto(BASE + "?mock")
        page.wait_for_selector("text=Entrá a Faro")
        page.wait_for_timeout(900)
        if suf == "desktop":
            page.screenshot(path=str(RAIZ / "login.png"))
            print("ok login.png")
        foto(page, f"login-{suf}.png")
        page.click("button:has-text('Continuar')")
        page.wait_for_selector(".error")
        foto(page, f"login-mail-vacio-{suf}.png")
        page.fill("input[type=email]", "santi@")
        page.click("button:has-text('Continuar')")
        page.wait_for_selector(".error:has-text('no parece válido')")
        foto(page, f"login-mail-invalido-{suf}.png")
        page.fill("input[type=email]", "santi@ejemplo.test")
        page.click("button:has-text('Continuar')")
        page.wait_for_selector("text=Tu contraseña")
        page.wait_for_timeout(200)
        foto(page, f"login-clave-{suf}.png")
        page.click("button:has-text('Entrar')")
        page.wait_for_selector(".error:has-text('Escribí tu contraseña')")
        foto(page, f"login-clave-vacia-{suf}.png")
        page.fill("#login-clave", corta)
        page.click("button:has-text('Entrar')")
        page.wait_for_selector(".error:has-text('no son correctos')")
        page.click("button[aria-label='Mostrar contraseña']")
        foto(page, f"login-clave-error-{suf}.png")
        page.fill("#login-clave", valida)
        page.click("button:has-text('Entrar')")
        esperar_datos(page)
        ctx.close()

    # Demasiados intentos (429) y sin conexión
    for flag, nombre, texto in (("lento", "login-clave-429", "demasiadas veces"), ("offline", "login-clave-red", "Sin conexión")):
        for perfil, suf in ((DESKTOP, "desktop"), (MOBILE, "mobile")):
            ctx, page = nueva(browser, perfil)
            page.goto(BASE + f"?mock&{flag}")
            page.wait_for_selector("text=Entrá a Faro")
            page.fill("input[type=email]", "santi@ejemplo.test")
            page.click("button:has-text('Continuar')")
            page.fill("#login-clave", valida)
            page.click("button:has-text('Entrar')")
            page.wait_for_selector(f".error:has-text('{texto}')")
            foto(page, f"{nombre}-{suf}.png")
            ctx.close()

    # --- Perfil (desktop + mobile) ---
    for perfil, suf in ((DESKTOP, "desktop"), (MOBILE, "mobile")):
        ctx, page = nueva(browser, perfil)
        page.goto(BASE + "?mock&auto#/perfil")
        page.wait_for_selector("text=Cambiar contraseña")
        page.wait_for_timeout(400)
        foto(page, f"perfil-{suf}.png")
        page.fill("#clave-actual", valida)
        page.fill("#clave-nueva", "nueva-" + "y" * 8)
        page.fill("#clave-repetir", "nueva-" + "z" * 8)
        page.click("button:has-text('Cambiar contraseña')")
        page.wait_for_selector(".error:has-text('no coinciden')")
        page.eval_on_selector(".perfil-form .error", "e => e.scrollIntoView({block: 'center'})")
        foto(page, f"perfil-no-coinciden-{suf}.png")
        page.fill("#clave-actual", corta)
        page.fill("#clave-repetir", "nueva-" + "y" * 8)
        page.click("button:has-text('Cambiar contraseña')")
        page.wait_for_selector(".error:has-text('actual no es correcta')")
        page.eval_on_selector(".perfil-form .error", "e => e.scrollIntoView({block: 'center'})")
        foto(page, f"perfil-actual-incorrecta-{suf}.png")
        page.fill("#clave-actual", valida)
        page.click("button:has-text('Cambiar contraseña')")
        page.wait_for_selector(".perfil-ok")
        page.eval_on_selector(".perfil-ok", "e => e.scrollIntoView({block: 'center'})")
        foto(page, f"perfil-ok-{suf}.png")
        ancho = page.evaluate("document.documentElement.scrollWidth")
        if ancho > perfil["viewport"]["width"]:
            errores.append(f"desborde horizontal en perfil {suf}: {ancho}px")
        page.click(".perfil-salir button")
        page.wait_for_selector("text=Entrá a Faro")
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

    # --- Cuenta no habilitada (mail ficticio @no-habilitado.test) ---
    ctx, page = nueva(browser, MOBILE)
    page.goto(BASE + "?mock")
    page.fill("input[type=email]", "alguien@no-habilitado.test")
    page.click("button:has-text('Continuar')")
    page.fill("#login-clave", valida)
    page.click("button:has-text('Entrar')")
    page.wait_for_selector("text=no está habilitada")
    foto(page, "no-habilitada-mobile.png")
    ctx.close()

    # --- 360 px: que nada desborde ---
    ctx, page = nueva(browser, {**MOBILE, "viewport": {"width": 360, "height": 740}})
    for ruta in ("#/inicio", "#/pipeline", "#/seguimiento", "#/perfil"):
        page.goto(BASE + "?mock&auto" + ruta)
        if ruta == "#/perfil":
            page.wait_for_selector("text=Cambiar contraseña")
        else:
            esperar_datos(page)
        ancho = page.evaluate("document.documentElement.scrollWidth")
        if ancho > 360:
            errores.append(f"desborde horizontal en {ruta}: {ancho}px")
    foto(page, "perfil-360.png")
    page.goto(BASE + "?mock&auto#/seguimiento")
    esperar_datos(page)
    foto(page, "seguimiento-360.png")
    ctx.close()

    # --- Cabecera de escritorio en el ancho mínimo (900 px) con la pestaña nueva ---
    ctx, page = nueva(browser, {**DESKTOP, "viewport": {"width": 900, "height": 700}})
    page.goto(BASE + "?mock&auto#/perfil")
    page.wait_for_selector("text=Cambiar contraseña")
    ancho = page.evaluate("document.documentElement.scrollWidth")
    if ancho > 900:
        errores.append(f"desborde horizontal en cabecera a 900px: {ancho}px")
    foto(page, "perfil-900.png")
    ctx.close()

    browser.close()

print("\n".join(errores) if errores else "Sin errores de consola ni desbordes.")
