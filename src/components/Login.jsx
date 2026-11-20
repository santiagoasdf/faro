import { useEffect, useRef, useState } from 'preact/hooks';
import { api } from '../api.js';
import { COLUMNAS } from '../constants.js';
import { Wordmark } from './ui.jsx';

const ESPERA_REENVIO = 30;

function textoError(e, paso) {
  const code = e?.code || '';
  if (code === 'NETWORK' || !navigator.onLine) return 'Sin conexión. Revisá internet y probá de nuevo.';
  if (code === 'INVALID_EMAIL') return 'Ese mail no parece válido. Revisalo.';
  if (code === 'OTP_EXPIRED') return 'El código venció. Pedí uno nuevo.';
  if (code === 'TOO_MANY_ATTEMPTS') return 'Probaste demasiadas veces. Pedí un código nuevo.';
  if (code === 'INVALID_OTP' || /otp/i.test(e?.message || '')) return 'El código no es correcto. Revisalo o pedí uno nuevo.';
  if (e?.status === 429) return 'Demasiados intentos seguidos. Esperá un minuto y probá de nuevo.';
  return paso === 'codigo'
    ? 'No pudimos validar el código. Probá de nuevo.'
    : 'No pudimos mandar el código. Probá de nuevo en un rato.';
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
  const [paso, setPaso] = useState('email'); // email | codigo
  const [email, setEmail] = useState(() => localStorage.getItem('crm:email') || '');
  const [codigo, setCodigo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [espera, setEspera] = useState(0);
  const codigoRef = useRef(null);
  const emailRef = useRef(null);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera(espera - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  useEffect(() => {
    (paso === 'codigo' ? codigoRef : emailRef).current?.focus();
  }, [paso]);

  async function pedirCodigo(e) {
    e?.preventDefault();
    const limpio = email.trim().toLowerCase();
    if (!limpio) {
      setError('Escribí tu mail.');
      return;
    }
    setOcupado(true);
    setError('');
    try {
      await api.sendOtp(limpio);
      localStorage.setItem('crm:email', limpio);
      setEmail(limpio);
      setCodigo('');
      setPaso('codigo');
      setEspera(ESPERA_REENVIO);
    } catch (err) {
      setError(textoError(err, 'email'));
    } finally {
      setOcupado(false);
    }
  }

  async function entrar(e) {
    e?.preventDefault();
    const otp = codigo.replace(/\D/g, '');
    if (otp.length !== 6) {
      setError('El código tiene 6 números.');
      return;
    }
    setOcupado(true);
    setError('');
    try {
      await api.verifyOtp(email, otp);
      await onEntrar();
    } catch (err) {
      setError(textoError(err, 'codigo'));
      setOcupado(false);
    }
  }

  return (
    <main class="login">
      <div class="login-col">
        <Wordmark />
        {paso === 'email' ? (
          <form class="login-form" onSubmit={pedirCodigo} noValidate>
            <h1>Entrá al CRM</h1>
            <p class="login-texto">Te mandamos un código de 6 números a tu mail. Sin contraseñas.</p>
            {aviso && <p class="aviso" role="alert">{aviso}</p>}
            <label class="campo">
              <span class="campo-label">Tu mail</span>
              <input
                ref={emailRef}
                type="email"
                inputMode="email"
                autoComplete="email"
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
            <button class="btn btn-primario btn-bloque" type="submit" disabled={ocupado}>
              {ocupado ? 'Mandando…' : 'Mandame el código'}
            </button>
          </form>
        ) : (
          <form class="login-form" onSubmit={entrar} noValidate>
            <h1>Revisá tu mail</h1>
            <p class="login-texto">
              Mandamos el código a <strong class="login-mail">{email}</strong>. Puede tardar un minuto;
              si no aparece, mirá en spam.
            </p>
            <label class="campo">
              <span class="campo-label">Código</span>
              <input
                ref={codigoRef}
                class="input-codigo"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={codigo}
                onInput={(e) => {
                  const v = e.currentTarget.value.replace(/\D/g, '').slice(0, 6);
                  setCodigo(v);
                  e.currentTarget.value = v;
                }}
                aria-invalid={!!error}
                aria-describedby={error ? 'login-error' : undefined}
              />
            </label>
            {error && <p id="login-error" class="error" role="alert">{error}</p>}
            <button class="btn btn-primario btn-bloque" type="submit" disabled={ocupado}>
              {ocupado ? 'Entrando…' : 'Entrar'}
            </button>
            <div class="login-acciones">
              <button type="button" class="btn-link" onClick={() => { setPaso('email'); setError(''); }}>
                Usar otro mail
              </button>
              <button type="button" class="btn-link" onClick={pedirCodigo} disabled={espera > 0 || ocupado}>
                {espera > 0 ? `Reenviar en ${espera} s` : 'Reenviar código'}
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
