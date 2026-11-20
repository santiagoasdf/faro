import { render } from 'preact';
import '@fontsource-variable/hanken-grotesk/wght.css';
import './styles.css';
import { usarApi } from './api.js';
import { App } from './App.jsx';

async function arrancar() {
  // Solo en desarrollo: `?mock` usa datos ficticios locales de /mock (carpeta ignorada por git).
  // En el build de producción este bloque desaparece.
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('mock')) {
    const mods = import.meta.glob('../mock/mock-api.js');
    const cargar = Object.values(mods)[0];
    if (cargar) usarApi((await cargar()).default);
    else console.warn('No hay /mock/mock-api.js: sigo con la API real.');
  }
  render(<App />, document.getElementById('app'));
}

arrancar();
