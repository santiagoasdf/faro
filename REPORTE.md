# Reporte · Faro

Fecha: 20/11/2026. Todo quedó en commits locales: no hubo push ni repo remoto.

## Qué hice

Una web estática (Vite + Preact, unos 77 KB gzip de JS, casi todo del SDK de Neon) con build en `./docs` para GitHub Pages. Pantallas:

- **Login con código por mail** (Neon Auth email OTP, sin contraseña): mail → código de 6 números → adentro. Maneja mail inválido, código incorrecto o vencido, demasiados intentos, sin conexión, y reenvío con espera de 30 s. Después del login llama a `crm_es_usuario()`; si da `false`, muestra "Tu cuenta no está habilitada para Faro. Pedile acceso a Santi." y nada más.
- **Inicio**: "Para hoy" (vencidos + agendados para hoy de las dos áreas, los vencidos primero y en rojo), la **escalera** del pipeline (cada etapa es un escalón con su cantidad y sus vencidos; tocás uno y te lleva a esa columna), el resumen del seguimiento por grupo y **Últimos movimientos**, que es lo que más le sirve a Guido para ver qué viene haciendo Santi.
- **Pipeline**: kanban de 9 columnas. En escritorio, drag & drop; en todas las tarjetas, un select "Mover a…" (sirve en el celu y con teclado). Es optimista: si el PATCH falla, vuelve atrás y avisa. Buscador por nombre/rubro/barrio y filtro por nicho. En el celu se ve una columna por vez, con pestañas que se deslizan.
- **Detalle del negocio** (panel lateral en escritorio, pantalla completa en el celu): etapa, links de contacto (WhatsApp, llamar, Instagram, mail, Maps, web; solo abren la app), próxima acción, fecha y notas, historial combinado de contactos y notas, "Registrar contacto" (canal + resultado + nota) y "Agregar nota". Cada uno puede borrar solo sus propias notas.
- **Seguimiento**: leads agrupados (Caliente, Nos toca, Esperando, Sin respuesta y Excluido, este último plegado), filtros de perfil (por defecto Santiago Paoletta, queda guardado), área, "Solo vencidos" y "Ver fuera de seguimiento", más un buscador. En el detalle se editan grupo, próxima acción y fecha, notas del equipo, "En seguimiento" y notas, con la aclaración de cómo convive con Seguimientin.
- Cabecera con nombre y "Salir", botón para actualizar, recarga sola si volvés a la pestaña después de más de 2 minutos, toasts cortos y estados vacíos.

## Cómo correrlo

```bash
npm install
npm run dev      # local, contra Neon real (necesita una cuenta del allowlist)
npm run build    # genera ./docs
npm run preview  # sirve ./docs en :4173
```

Datos de prueba: `http://localhost:5173/?mock` (código `123456`; `&auto` entra directo, `&nohab` simula una cuenta no habilitada y `&fallar` hace fallar los guardados para ver el rollback). El mock vive en `mock/`, que está en `.gitignore`, y no entra en el build: verifiqué que en `docs/` no hay rastro.

Publicar: subir el repo y en GitHub Pages elegir la rama principal, carpeta `/docs`. La base relativa hace que funcione con cualquier nombre de repo.

## Decisiones

- **Preact + JSX en vez de vanilla**: el tablero, los paneles y la edición optimista tienen bastante estado, y con componentes queda más fácil de leer y tocar. Son 4 KB.
- **`src/api.js` es la única puerta a Neon.** Si el JWT vence (401/PGRST301), renueva la sesión y reintenta una vez; si vuelve a fallar, te lleva al login con "Tu sesión venció". Un UPDATE que RLS filtra devuelve 0 filas sin error: lo trato como error, para no decir "Guardado" cuando no se guardó.
- **Conteos del Inicio calculados en el navegador** a partir de `v_pipeline` y `v_seguimiento`, sin usar `v_resumen`. Así respetan el filtro de perfil (Guido ve los números de Santi) y se actualizan en el momento al mover una tarjeta. Es la misma lógica que la vista.
- Después de cada escritura se vuelve a leer la fila de `v_pipeline` o `v_seguimiento`, para que vencido, último contacto y autoría queden como los calcula la base.
- No pido `negocios` completo en el detalle: `v_pipeline` ya trae todo lo que se muestra. Leo decisores, demos, interacciones y notas.
- Rutas con hash (`#/pipeline/n/<id>`): funcionan en GitHub Pages sin configurar nada, y el botón "atrás" del celu cierra el panel.
- **Diseño**: fondo frío claro para usar en el celu con luz de día, tinta azul marino, verde esmeralda para las acciones y rojo solo para lo vencido. Tipografía Hanken Grotesk autoalojada, con números tabulares. Lo distintivo es la **escalera** (las etapas como escalones, en el login y en el Inicio). El resto es sobrio. Inputs de 16 px en el celu para que iOS no haga zoom, áreas táctiles de 44 px, navegación abajo en el celu, foco visible y `prefers-reduced-motion` respetado.
- `noindex, nofollow` en `index.html`, `docs/robots.txt` con `Disallow: /`, `.nojekyll` y `referrer: no-referrer`.

## Verificación hecha

- `npm run build` OK.
- Login con el **build real contra Neon Auth** (`vite preview`): `get-session` → pantalla de login; un mail inválido devuelve 400 del servidor y se muestra "Ese mail no parece válido". No mandé ningún código a casillas reales.
- `scripts/test-api.sh` del backend (corrido desde su carpeta, sin copiarlo): **12 OK, 0 FAIL**, todo 401 para anónimo.
- Con datos mock (Playwright): mover con el select, drag & drop, rollback ante error, agregar y borrar nota, guardar próxima acción, Escape cierra el panel y vuelve a la URL de la lista. Cero errores de consola y cero desborde horizontal a 360 px.
- Lighthouse mobile sobre el build: **Performance 97, Accesibilidad 100, Best practices 100**. SEO 63 a propósito, por el `noindex`.
- `grep -ri "postgres://\|password=\|sk_\|secret" docs/`: solo aparecen nombres internos del SDK de Better Auth (`BETTER_AUTH_SECRET` como nombre de variable de entorno, el endpoint `client/rotate-secret`). Ningún valor ni secreto.
- `docs/index.html` tiene el `noindex` y `docs/robots.txt` bloquea todo.

## Renombre a Faro

20/11/2026. El producto pasa a llamarse **Faro** (engloba los seguimientos de LevelUp y Provaider), según `NOMBRE.md`. Solo cambió el nombre visible; la lógica, los datos y el diseño quedaron igual.

- `<title>` → "Faro"; la meta description → "Faro: seguimientos de LevelUp y Provaider."; el `<noscript>` dice "para usar Faro".
- Wordmark del header y del login: "Faro" (antes "LevelUp CRM"). Se borró la regla `.wordmark-crm`, que quedó sin uso.
- Login: "Entrá a Faro" (antes "Entrá al CRM"). El pie "Uso interno de LevelUp." queda como subtítulo.
- Otros textos: "Abriendo Faro…", "Tu cuenta no está habilitada para Faro.", "En Faro desde" (detalle del negocio).
- README, este reporte, la `description` de `package.json` y el comentario de `styles.css`. El `name` del paquete (`levelup-crm-web`) no lo toqué, porque es el nombre del repo.
- Favicon: es el ícono de la escalera, sin texto, así que no hubo que cambiarlo. No hay manifest.
- Las claves internas (`crm:*` en localStorage, tablas `crm_*`) siguen igual: no se ven, y si las cambiaba se perdían los filtros guardados.
- Rebuild en `./docs` y nuevas capturas con datos ficticios: `login.png` y todo `capturas/`. `login-prod-error-desktop.png` sale del build real contra Neon Auth con un mail inválido (no se mandó ningún código). `tools/capturas.py` ahora espera el texto "Entrá a Faro".

## Capturas (datos ficticios)

`login.png` en la raíz, y en `capturas/`: login (desktop/mobile, con error de código), login de producción con error real, inicio, pipeline, detalle de negocio, registrar contacto, seguimiento, detalle de lead (desktop y mobile), cuenta no habilitada y seguimiento a 360 px. Todos los negocios y leads que aparecen son inventados.

## Pendientes

1. **Login real con Santi y Guido**, más un mail fuera del allowlist (puntos 2 y 3 de la verificación del brief). Requiere recibir el código, así que lo tienen que hacer ustedes. Lo ideal: mover una tarjeta y volverla, y agregar una nota y borrarla.
2. **Capturas `desktop.png` / `mobile.png` con datos reales**: dependen del punto 1. Las que dejé son con datos ficticios.
3. **Probar en iPhone (Safari) y Android (Chrome)** una vez publicado; ver el riesgo 1.
4. Ver `PENDIENTES-BACKEND.md`.

## Riesgos

1. **Cookies de terceros en Safari.** La sesión de Neon Auth vive en una cookie de otro dominio. Si Safari la bloquea, el login puede no persistir. Está detallado en `PENDIENTES-BACKEND.md`, con opciones.
2. **Formato del selector de fecha**: el `input type="date"` lo dibuja el navegador según el idioma del sistema (en las capturas de Chromium headless sale mm/dd). En un celu o compu en español aparece dd/mm/aaaa. El resto de las fechas las formatea la app en dd/mm/aaaa, hora de Buenos Aires.
3. **Altas por OTP**: cualquiera puede generar una cuenta vacía en Neon Auth; no ve datos por RLS. Ver `PENDIENTES-BACKEND.md`.
4. El SDK `@neon/neon-js` está en 0.10.x (pre 1.0): conviene fijar la versión (`package-lock.json` ya lo hace) y probar antes de actualizar.
5. El repo es público: la estructura de tablas se puede deducir del código. No es un problema mientras RLS y grants sigan como están, pero no hay que abrir permisos a `anonymous`.
