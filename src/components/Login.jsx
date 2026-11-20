import { useEffect, useRef, useState } from 'preact/hooks';
import { api } from '../api.js';
import { COLUMNAS } from '../constants.js';
import { CampoClave, Wordmark } from './ui.jsx';

const MAIL_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function textoError(e) {
  const code = e?.code || '';
  if (code === 'NETWORK' || !navigator.onLine) return 'Sin conexión. Revisá internet y probá de nuevo.';
  if (code === 'TOO_MANY_REQUESTS' || e?.status === 429) {
    return 'Probaste demasiadas veces seguidas. Esperá un minuto y volvé a intentar.';
  }
  if (code === 'INVALID_EMAIL') return 'Ese mail no parece válido. Revisalo.';
  if (['INVALID_EMAIL_OR_PASSWORD', 'INVALID_PASSWORD', 'CREDENTIAL_ACCOUNT_NOT_FOUND', 'USER_NOT_FOUND'].includes(code) ||
    e?.status === 401) {
    return 'El mail o la contraseña no son correctos. Revisalos y probá de nuevo.';
  }
  return 'No pudimos hacerte entrar. Probá de nuevo en un rato.';
}

/** Escalera decorativa con los colores de las etapas del pipeline. */
function Escalera() {
  const abiertas = COLUMNAS.filter((c) => c.key !== 'descartado');
  return (
    <div class="login-escalera" aria-hidden="true">
      {abiertas.map((c, i) => (
        <span key={c.key} style={{ '--h': `${(i + 1) / abiertas.length}`, '--c': c.color, '--i': i }} />
      ))}
    </div>
  );
}

export function Login({ aviso, onEntrar }) {
  const [paso, setPaso] = useState('email'); // email | clave
  const [email, setEmail] = useState(() => localStorage.getItem('crm:email') || '');
  const [clave, setClave] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const claveRef = useRef(null);
  const emailRef = useRef(null);

  useEffect(() => {
    (paso === 'clave' ? claveRef : emailRef).current?.focus();
  }, [paso]);

  function continuar(e) {
    e?.preventDefault();
    const limpio = email.trim().toLowerCase();
    if (!limpio) {
      setError('Escribí tu mail.');
      return;
    }
    if (!MAIL_VALIDO.test(limpio)) {
      setError('Ese mail no parece válido. Revisalo.');
      return;
    }
    localStorage.setItem('crm:email', limpio);
    setEmail(limpio);
    setClave('');
    setError('');
    setPaso('clave');
  }

  async function entrar(e) {
    e?.preventDefault();
    if (!clave) {
      setError('Escribí tu contraseña.');
      return;
    }
    setOcupado(true);
    setError('');
    try {
      await api.signIn(email, clave);
      setClave('');
      await onEntrar();
    } catch (err) {
      setError(textoError(err));
      setOcupado(false);
      claveRef.current?.select();
    }
  }

  return (
    <main class="login">
      <div class="login-col">
        <Wordmark />
        {paso === 'email' ? (
          <form class="login-form" onSubmit={continuar} noValidate>
            <h1>Entrá a Faro</h1>
            <p class="login-texto">Empezá con tu mail de trabajo. En el próximo paso te pedimos la contraseña.</p>
            {aviso && <p class="aviso" role="alert">{aviso}</p>}
            <label class="campo">
              <span class="campo-label">Tu mail</span>
              <input
                ref={emailRef}
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                spellcheck={false}
                placeholder="nombre@levelup.cloud"
                value={email}
                onInput={(e) => setEmail(e.currentTarget.value)}
                aria-invalid={!!error}
                aria-describedby={error ? 'login-error' : undefined}
                required
              />
            </label>
            {error && <p id="login-error" class="error" role="alert">{error}</p>}
            <button class="btn btn-primario btn-bloque" type="submit">
              Continuar
            </button>
          </form>
        ) : (
          <form class="login-form" onSubmit={entrar} noValidate>
            <h1>Tu contraseña</h1>
            <p class="login-texto">
              Entrás como <strong class="login-mail">{email}</strong>.
            </p>
            {/* Para que el gestor de contraseñas asocie la clave con el mail. */}
            <input type="email" name="username" autoComplete="username" value={email} hidden readOnly />
            <CampoClave
              label="Contraseña"
              id="login-clave"
              inputRef={claveRef}
              autoComplete="current-password"
              value={clave}
              onInput={(e) => setClave(e.currentTarget.value)}
              aria-invalid={!!error}
              aria-describedby={error ? 'login-error' : undefined}
            />
            {error && <p id="login-error" class="error" role="alert">{error}</p>}
            <button class="btn btn-primario btn-bloque" type="submit" disabled={ocupado}>
              {ocupado ? 'Entrando…' : 'Entrar'}
            </button>
            <div class="login-acciones">
              <button
                type="button"
                class="btn-link"
                disabled={ocupado}
                onClick={() => { setPaso('email'); setClave(''); setError(''); }}
              >
                Usar otro mail
              </button>
            </div>
          </form>
        )}
        <p class="login-pie">Uso interno de LevelUp.</p>
      </div>
      <Escalera />
    </main>
  );
}
