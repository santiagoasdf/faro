# LevelUp CRM (web)

CRM interno para que Santi actualice sus leads y Guido siga cómo avanzan. Sitio estático (Vite + Preact) para GitHub Pages; los datos se cargan en vivo desde Neon después del login.

## Correr

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # genera ./docs (lo que publica GitHub Pages)
npm run preview    # sirve ./docs en http://localhost:4173
```

GitHub Pages: publicar desde la rama principal, carpeta `/docs`. La base es relativa (`./`), así que anda en `https://santiagoasdf.github.io/<repo>/` sin tocar nada.

## Qué usa

Solo dos URLs públicas, en `src/config.js` (no son secretos; la seguridad la ponen RLS y grants en Postgres):

- Neon Auth: `https://ep-delicate-bar-b69lex8c.neonauth.c-2.sa-east-1.aws.neon.tech/neondb/auth`
- Data API: `https://ep-delicate-bar-b69lex8c.apirest.c-2.sa-east-1.aws.neon.tech/neondb/rest/v1`

Login con código por mail (sin contraseña). Solo ven datos las cuentas que están en `crm_usuarios`.

## Datos de prueba (solo local)

`npm run dev` y abrir `http://localhost:5173/?mock` usa datos ficticios de `mock/mock-api.js` (código de login `123456`). Esa carpeta está en `.gitignore`: nunca se sube. El modo mock no existe en el build de producción.

`python tools/capturas.py` saca las capturas de `capturas/` con esos datos ficticios (necesita Playwright y el dev server corriendo).

## Estructura

```
src/
  config.js        URLs públicas de Neon
  api.js           única capa que habla con Neon (SDK @neon/neon-js)
  App.jsx          sesión, carga de datos, rutas (#/inicio, #/pipeline, #/seguimiento)
  components/      Login, Inicio, Pipeline, Seguimiento, detalles, Historial, ui
  styles.css       estilos (mobile first)
public/robots.txt  bloquea todo
```
