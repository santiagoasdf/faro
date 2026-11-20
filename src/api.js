// Capa única de datos. Todo pasa por acá: la UI no conoce el SDK.
// En desarrollo, `?mock` reemplaza esta implementación por una local (ver main.jsx).
import { createClient } from '@neon/neon-js';
import { NEON_AUTH_URL, NEON_DATA_API_URL } from './config.js';

let client;
function neon() {
  if (!client) {
    client = createClient({
      auth: { url: NEON_AUTH_URL }, // sin allowAnonymous: el rol anónimo no tiene permisos
      dataApi: { url: NEON_DATA_API_URL }, // el JWT se inyecta solo cuando hay sesión
    });
  }
  return client;
}

/** Error de sesión: la UI vuelve al login. */
export class SesionVencida extends Error {
  constructor() {
    super('Tu sesión venció. Entrá de nuevo.');
    this.name = 'SesionVencida';
  }
}

const esErrorDeAuth = (res) =>
  res?.status === 401 ||
  ['PGRST301', 'PGRST302', 'PGRST303'].includes(res?.error?.code) ||
  res?.name === 'AuthRequiredError' ||
  res?.error?.name === 'AuthRequiredError';

/**
 * Ejecuta una consulta PostgREST. Si el JWT venció, renueva la sesión y reintenta una vez;
 * si vuelve a fallar, tira SesionVencida.
 */
async function q(build) {
  const correr = async () => {
    try {
      return await build(neon());
    } catch (e) {
      if (esErrorDeAuth(e)) return { status: 401, error: e };
      throw e;
    }
  };
  let res = await correr();
  if (esErrorDeAuth(res)) {
    await neon().auth.getSession().catch(() => null);
    res = await correr();
    if (esErrorDeAuth(res)) {
      window.dispatchEvent(new Event('crm:sesion-vencida'));
      throw new SesionVencida();
    }
  }
  if (res.error) throw res.error;
  return res.data;
}

/** Saca un código de error legible de lo que devuelva Better Auth (o un fetch fallido). */
function errorDeAuth(e) {
  const err = new Error(e?.message || 'Error de autenticación');
  // Preferimos el código crudo de Better Auth (INVALID_EMAIL_OR_PASSWORD, INVALID_PASSWORD…)
  // al normalizado del SDK.
  err.code = e?.error?.code || e?.body?.code || e?.data?.code || e?.code;
  err.status = e?.status || e?.statusCode || e?.error?.status;
  const msg = `${e?.message || ''} ${e?.error?.message || ''}`;
  if (!/^[A-Z_]+$/.test(err.code || '')) {
    if (/invalid email or password|invalid credentials/i.test(msg)) err.code = 'INVALID_EMAIL_OR_PASSWORD';
    else if (/invalid password/i.test(msg)) err.code = 'INVALID_PASSWORD';
    else if (/invalid email/i.test(msg)) err.code = 'INVALID_EMAIL';
    else if (/password too short/i.test(msg)) err.code = 'PASSWORD_TOO_SHORT';
    else if (/password too long/i.test(msg)) err.code = 'PASSWORD_TOO_LONG';
    else if (/too many/i.test(msg)) err.code = 'TOO_MANY_REQUESTS';
  }
  if (err.status === 429) err.code = 'TOO_MANY_REQUESTS';
  if (e instanceof TypeError || /failed to fetch|network/i.test(e?.message || '')) err.code = 'NETWORK';
  return err;
}

async function auth(fn) {
  let res;
  try {
    res = await fn(neon().auth);
  } catch (e) {
    throw errorDeAuth(e);
  }
  if (res?.error) throw errorDeAuth(res.error);
  return res?.data;
}

/** Un UPDATE/DELETE que RLS filtra devuelve 0 filas sin error: lo tratamos como error. */
async function alMenosUna(promesa) {
  const filas = await promesa;
  if (!filas || filas.length === 0) {
    const e = new Error('La base no aceptó el cambio (sin permiso o la fila ya no existe).');
    e.code = 'SIN_FILAS';
    throw e;
  }
  return filas;
}


/**
 * El JWT lo inyecta el SDK en get-session (header set-auth-jwt) y lo usa
 * internamente en las llamadas a Data API. neon().auth es el cliente de
 * Better Auth: no expone getJWTToken (eso vive en un wrapper interno).
 * Por eso no podemos exigir leer el JWT; sí podemos refrescar la sesión
 * y reintentar el RPC.
 */
async function refrescarSesion() {
  await neon().auth.getSession().catch(() => null);
}

const realApi = {
  // --- Sesión ---
  async getSession() {
    const data = await auth((a) => a.getSession());
    return data?.user ? { email: data.user.email, nombre: data.user.name } : null;
  },
  async signIn(email, password) {
    const data = await auth((a) => a.signIn.email({ email, password }));
    // El JWT viaja en el header set-auth-jwt de get-session, no en el sign-in.
    await neon().auth.getSession().catch(() => null);
    return data;
  },
  changePassword: ({ currentPassword, newPassword, revokeOtherSessions = false }) =>
    auth((a) => a.changePassword({ currentPassword, newPassword, revokeOtherSessions })),
  signOut: () => auth((a) => a.signOut()).catch(() => null),

  // --- Permisos ---
  /**
   * true si el mail de la sesión está en crm_usuarios.
   * Tira si no hay JWT válido o si el RPC falla: NUNCA hay que interpretar
   * un error, un null o un 401 como "no habilitado".
   */
  async esUsuario() {
    const consultar = () => q((c) => c.rpc('crm_es_usuario'));
    await refrescarSesion();
    let valor;
    try {
      valor = await consultar();
    } catch (e) {
      if (!esErrorDeAuth(e) && e?.name !== 'SesionVencida') throw e;
      await refrescarSesion();
      valor = await consultar();
    }
    if (valor === true) return true;
    // Un false o un valor raro puede ser una carrera justito después del login
    // (auth.user_id() todavía vacío ⇒ crm_es_usuario() da false y RLS devuelve 0 filas).
    await refrescarSesion();
    valor = await consultar();
    if (valor === true) return true;
    if (valor === false) return false;
    const e = new Error('No pudimos verificar tu acceso. Probá de nuevo.');
    e.code = 'RPC_INVALIDO';
    throw e;
  },
  usuarios: () => q((c) => c.from('crm_usuarios').select('email,nombre,rol,activo')),

  // --- Listas ---
  pipeline: () =>
    q((c) => c.from('v_pipeline').select('*').order('columna_orden').order('nombre')),
  pipelineFila: (id) =>
    q((c) => c.from('v_pipeline').select('*').eq('id', id).maybeSingle()),
  seguimiento: () =>
    q((c) =>
      c.from('v_seguimiento').select('*')
        .order('grupo_orden')
        .order('proxima_fecha', { ascending: true, nullsFirst: false })
        .order('empresa'),
    ),
  seguimientoFila: (id) =>
    q((c) => c.from('v_seguimiento').select('*').eq('id', id).maybeSingle()),

  // --- Detalle de negocio ---
  async detalleNegocio(id) {
    const [decisores, demos, interacciones, notas] = await Promise.all([
      q((c) => c.from('decisores').select('*').eq('negocio_id', id).order('created_at')),
      q((c) => c.from('demos').select('*').eq('negocio_id', id).order('created_at', { ascending: false })),
      q((c) => c.from('interacciones').select('id,canal,mensaje,estado,fecha,notas,autor_email,decisor_id')
        .eq('negocio_id', id).order('fecha', { ascending: false })),
      q((c) => c.from('crm_notas').select('id,texto,autor_email,created_at')
        .eq('negocio_id', id).order('created_at', { ascending: false })),
    ]);
    return { decisores, demos, interacciones, notas };
  },
  notasLead: (id) =>
    q((c) => c.from('crm_notas').select('id,texto,autor_email,created_at')
      .eq('seguimiento_id', id).order('created_at', { ascending: false })),

  // --- Escrituras (solo las columnas que la base permite) ---
  editarNegocio: (id, patch) =>
    alMenosUna(q((c) => c.from('negocios').update(patch).eq('id', id).select('id'))),
  editarLead: (id, patch) =>
    alMenosUna(q((c) => c.from('seguimiento_leads').update(patch).eq('id', id).select('id'))),
  registrarContacto: (fila) =>
    q((c) => c.from('interacciones').insert(fila).select('id,canal,mensaje,estado,fecha,notas,autor_email,decisor_id').single()),
  agregarNota: (fila) =>
    q((c) => c.from('crm_notas').insert(fila).select('id,texto,autor_email,created_at').single()),
  borrarNota: (id) => alMenosUna(q((c) => c.from('crm_notas').delete().eq('id', id).select('id'))),
};

// Objeto mutable para que el modo mock (solo en dev) pueda reemplazar la implementación.
export const api = { ...realApi };
export function usarApi(impl) {
  Object.assign(api, impl);
}
