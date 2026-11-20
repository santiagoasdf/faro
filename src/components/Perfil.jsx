import { useState } from 'preact/hooks';
import { api } from '../api.js';
import { CampoClave, Icon } from './ui.jsx';

const MINIMO = 8;
const MAXIMO = 128;

function textoError(e) {
  const code = e?.code || '';
  if (code === 'NETWORK' || !navigator.onLine) return 'Sin conexión. Revisá internet y probá de nuevo.';
  if (code === 'TOO_MANY_REQUESTS' || e?.status === 429) {
    return 'Probaste demasiadas veces seguidas. Esperá un minuto y volvé a intentar.';
  }
  if (code === 'INVALID_PASSWORD' || code === 'INVALID_EMAIL_OR_PASSWORD') {
    return 'La contraseña actual no es correcta. Revisala.';
  }
  if (code === 'PASSWORD_TOO_SHORT') return `La nueva contraseña tiene que tener al menos ${MINIMO} caracteres.`;
  if (code === 'PASSWORD_TOO_LONG') return 'La nueva contraseña es demasiado larga. Probá con una más corta.';
  return 'No se pudo cambiar la contraseña. Probá de nuevo en un rato.';
}

export function Perfil({ yo, nombre, onSalir }) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [cerrarOtras, setCerrarOtras] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null); // { campo, texto }
  const [ok, setOk] = useState('');

  function validar() {
    if (!actual) return { campo: 'actual', texto: 'Escribí tu contraseña actual.' };
    if (!nueva) return { campo: 'nueva', texto: 'Escribí la contraseña nueva.' };
    if (nueva.length < MINIMO) {
      return { campo: 'nueva', texto: `La nueva contraseña tiene que tener al menos ${MINIMO} caracteres.` };
    }
    if (nueva.length > MAXIMO) return { campo: 'nueva', texto: 'La nueva contraseña es demasiado larga.' };
    if (nueva === actual) return { campo: 'nueva', texto: 'La nueva tiene que ser distinta de la actual.' };
    if (!repetir) return { campo: 'repetir', texto: 'Repetí la contraseña nueva.' };
    if (repetir !== nueva) return { campo: 'repetir', texto: 'Las contraseñas nuevas no coinciden.' };
    return null;
  }

  async function cambiar(e) {
    e.preventDefault();
    setOk('');
    const problema = validar();
    if (problema) {
      setError(problema);
      document.getElementById(`clave-${problema.campo}`)?.focus();
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      await api.changePassword({ currentPassword: actual, newPassword: nueva, revokeOtherSessions: cerrarOtras });
      setActual('');
      setNueva('');
      setRepetir('');
      setOk(cerrarOtras
        ? 'Listo, cambiaste tu contraseña y cerramos tu sesión en los otros dispositivos.'
        : 'Listo, cambiaste tu contraseña. La próxima vez entrá con la nueva.');
    } catch (err) {
      if (err?.status === 401 && !/PASSWORD/.test(err?.code || '')) {
        // Sin sesión válida: App vuelve al login con "Tu sesión venció".
        window.dispatchEvent(new Event('crm:sesion-vencida'));
        return;
      }
      const campo = err?.code === 'INVALID_PASSWORD' || err?.code === 'INVALID_EMAIL_OR_PASSWORD' ? 'actual'
        : /PASSWORD_TOO/.test(err?.code || '') ? 'nueva' : null;
      setError({ campo, texto: textoError(err) });
    } finally {
      setOcupado(false);
    }
  }

  const props = (campo) => ({
    id: `clave-${campo}`,
    'aria-invalid': error?.campo === campo,
    'aria-describedby': error?.campo === campo ? 'perfil-error' : undefined,
  });
  const limpiar = (fn) => (e) => {
    fn(e.currentTarget.value);
    if (ok) setOk('');
  };

  return (
    <div class="perfil">
      <header class="perfil-cabeza">
        <h1>Tu perfil</h1>
      </header>

      <section class="bloque" aria-labelledby="t-cuenta">
        <div class="bloque-cabeza">
          <h2 id="t-cuenta">Tu cuenta</h2>
        </div>
        <dl class="perfil-datos">
          <div>
            <dt>Nombre</dt>
            <dd>{nombre || '—'}</dd>
          </div>
          <div>
            <dt>Mail</dt>
            <dd>{yo?.email || '—'}</dd>
          </div>
        </dl>
      </section>

      <section class="bloque" aria-labelledby="t-clave">
        <div class="bloque-cabeza">
          <h2 id="t-clave">Cambiar contraseña</h2>
        </div>
        <form class="perfil-form" onSubmit={cambiar} noValidate>
          <input type="email" name="username" autoComplete="username" value={yo?.email || ''} hidden readOnly />
          <CampoClave
            label="Contraseña actual"
            autoComplete="current-password"
            value={actual}
            onInput={limpiar(setActual)}
            {...props('actual')}
          />
          <CampoClave
            label="Contraseña nueva"
            autoComplete="new-password"
            value={nueva}
            onInput={limpiar(setNueva)}
            {...props('nueva')}
          />
          <CampoClave
            label="Repetí la contraseña nueva"
            autoComplete="new-password"
            value={repetir}
            onInput={limpiar(setRepetir)}
            {...props('repetir')}
          />
          <p class="perfil-ayuda">Mínimo {MINIMO} caracteres.</p>
          <label class="check">
            <input type="checkbox" checked={cerrarOtras} onChange={(e) => setCerrarOtras(e.currentTarget.checked)} />
            Cerrar mi sesión en los otros dispositivos
          </label>
          {error && <p id="perfil-error" class="error" role="alert">{error.texto}</p>}
          {ok && (
            <p class="perfil-ok" role="status">
              <Icon name="ok" size={16} />
              <span>{ok}</span>
            </p>
          )}
          <button class="btn btn-primario" type="submit" disabled={ocupado}>
            {ocupado ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </form>
      </section>

      <section class="bloque perfil-salir" aria-labelledby="t-salir">
        <div class="bloque-cabeza">
          <h2 id="t-salir">Sesión</h2>
        </div>
        <p>Si usás una compu compartida, cerrá la sesión cuando termines.</p>
        <button class="btn btn-secundario" type="button" onClick={onSalir}>
          <Icon name="salir" size={16} />
          <span>Cerrar sesión</span>
        </button>
      </section>
    </div>
  );
}
