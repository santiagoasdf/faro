import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { api } from './api.js';
import { PERFIL_DEFAULT } from './config.js';
import { COLUMNA, ETAPAS_CERRADAS, grupoOrden } from './constants.js';
import { hoyBA, primerNombre } from './format.js';
import { Login } from './components/Login.jsx';
import { Cabecera } from './components/Cabecera.jsx';
import { Inicio } from './components/Inicio.jsx';
import { Pipeline } from './components/Pipeline.jsx';
import { Seguimiento } from './components/Seguimiento.jsx';
import { Perfil } from './components/Perfil.jsx';
import { Calendario } from './components/Calendario.jsx';
import { DetalleNegocio } from './components/DetalleNegocio.jsx';
import { DetalleLead } from './components/DetalleLead.jsx';
import { Cargando, Marca, Panel, Toaster, mensajeError, toast } from './components/ui.jsx';

const VISTAS = ['inicio', 'pipeline', 'seguimiento', 'calendario', 'perfil'];

/** '#/pipeline/n/<id>' -> { vista: 'pipeline', tipo: 'n', id } */
function leerRuta() {
  const [vista, tipo, id] = location.hash.replace(/^#\/?/, '').split('/');
  return {
    vista: VISTAS.includes(vista) ? vista : 'inicio',
    tipo: tipo === 'n' || tipo === 'l' ? tipo : null,
    id: id ? decodeURIComponent(id) : null,
  };
}

// Recalcula campos derivados que la vista de la base calcularía, para que la UI no mienta
// entre la edición optimista y la próxima recarga.
function derivarNegocio(n) {
  const columna = COLUMNA[n.etapa] ? n.etapa : n.columna;
  return {
    ...n,
    columna,
    columna_orden: COLUMNA[columna]?.orden ?? n.columna_orden,
    etapa_legado: !COLUMNA[n.etapa],
    vencido: !!n.proxima_fecha && n.proxima_fecha < hoyBA() && !ETAPAS_CERRADAS.includes(n.etapa),
  };
}
function derivarLead(l) {
  return {
    ...l,
    grupo_orden: grupoOrden(l.grupo),
    vencido: !!l.activo && !!l.proxima_fecha && l.proxima_fecha < hoyBA(),
  };
}

function leerFiltros() {
  try {
    return { perfil: PERFIL_DEFAULT, area: '', soloVencidos: false, verInactivos: false, texto: '',
      ...JSON.parse(localStorage.getItem('crm:filtros-seg') || '{}'), texto: '' };
  } catch {
    return { perfil: PERFIL_DEFAULT, area: '', soloVencidos: false, verInactivos: false, texto: '' };
  }
}

export function App() {
  // cargando | login | no-habilitado | error-sesion | listo
  const [estado, setEstado] = useState('cargando');
  const [aviso, setAviso] = useState('');
  const [errorSesion, setErrorSesion] = useState('');
  const [yo, setYo] = useState(null);
  const [usuarios, setUsuarios] = useState({});
  const [pipeline, setPipeline] = useState(null);
  const [seguimiento, setSeguimiento] = useState(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [actualizando, setActualizando] = useState(false);
  const [ruta, setRuta] = useState(leerRuta);
  const [colActiva, setColActiva] = useState('candidato');
  const [filtrosSeg, setFiltrosSegState] = useState(leerFiltros);
  const ultimaCarga = useRef(0);
  const abrioEnApp = useRef(false);

  const setFiltrosSeg = useCallback((f) => {
    setFiltrosSegState((prev) => {
      const nuevo = typeof f === 'function' ? f(prev) : f;
      const { texto, ...persistir } = nuevo;
      localStorage.setItem('crm:filtros-seg', JSON.stringify(persistir));
      return nuevo;
    });
  }, []);

  // ---------- Carga ----------
  const cargarDatos = useCallback(async (silencioso = false, { primera = false } = {}) => {
    if (!silencioso) setErrorCarga('');
    setActualizando(true);
    try {
      // Las lecturas van acá, nunca antes de que el caller haya visto esUsuario() === true.
      const { pipeline: p, seguimiento: s, usuarios: u } = await api.cargarListas({
        reintentarSiVacio: primera,
      });
      setPipeline(p || []);
      setSeguimiento(s || []);
      setUsuarios(Object.fromEntries((u || []).map((x) => [x.email, x.nombre])));
      ultimaCarga.current = Date.now();
    } catch (e) {
      if (e?.name !== 'SesionVencida') {
        if (silencioso) toast(mensajeError(e, 'actualizar'), 'error');
        else setErrorCarga(mensajeError(e, 'cargar los datos'));
      }
    } finally {
      setActualizando(false);
    }
  }, []);

  const iniciar = useCallback(async () => {
    setEstado('cargando');
    setErrorSesion('');
    try {
      const sesion = await api.getSession();
      if (!sesion) {
        setEstado('login');
        return;
      }
      setYo(sesion);
      const habilitado = await api.esUsuario();
      // Solo si el RPC respondió false con un JWT válido: el mail no está en la allowlist.
      if (habilitado !== true) {
        setEstado('no-habilitado');
        return;
      }
      // Lecturas recién ahora, con reintento si alguna lista viene vacía por la carrera del JWT.
      await cargarDatos(false, { primera: true });
      setEstado('listo');
      setAviso('');
    } catch (e) {
      if (e?.name === 'SesionVencida') {
        setAviso('Tu sesión venció. Entrá de nuevo.');
        setEstado('login');
        return;
      }
      setErrorSesion(mensajeError(e, 'verificar tu acceso'));
      setEstado('error-sesion');
    }
  }, [cargarDatos]);

  useEffect(() => {
    iniciar();
  }, [iniciar]);

  useEffect(() => {
    const vencida = () => {
      setAviso('Tu sesión venció. Entrá de nuevo.');
      setEstado('login');
    };
    const volver = () => {
      if (document.visibilityState === 'visible' && estado === 'listo' && Date.now() - ultimaCarga.current > 120000) {
        cargarDatos(true);
      }
    };
    const hash = () => setRuta(leerRuta());
    window.addEventListener('crm:sesion-vencida', vencida);
    document.addEventListener('visibilitychange', volver);
    window.addEventListener('hashchange', hash);
    return () => {
      window.removeEventListener('crm:sesion-vencida', vencida);
      document.removeEventListener('visibilitychange', volver);
      window.removeEventListener('hashchange', hash);
    };
  }, [estado, cargarDatos]);

  async function salir() {
    await api.signOut();
    setPipeline(null);
    setSeguimiento(null);
    setYo(null);
    setAviso('');
    history.replaceState(null, '', location.pathname + location.search);
    setRuta(leerRuta());
    setEstado('login');
  }

  // ---------- Navegación ----------
  const ir = useCallback((vista) => {
    abrioEnApp.current = false;
    location.hash = `#/${vista}`;
  }, []);
  const abrir = useCallback((tipo, id) => {
    abrioEnApp.current = true;
    location.hash = `#/${leerRuta().vista}/${tipo}/${encodeURIComponent(id)}`;
  }, []);
  const cerrar = useCallback(() => {
    if (abrioEnApp.current) {
      abrioEnApp.current = false;
      history.back();
    } else {
      location.hash = `#/${leerRuta().vista}`;
    }
  }, []);

  // ---------- Escrituras ----------
  const parchearNegocioLocal = useCallback((id, patch) => {
    setPipeline((lista) => lista?.map((n) => (n.id === id ? derivarNegocio({ ...n, ...patch }) : n)));
  }, []);
  const refrescarNegocio = useCallback(async (id) => {
    try {
      const fila = await api.pipelineFila(id);
      if (fila) setPipeline((lista) => lista?.map((n) => (n.id === id ? fila : n)));
    } catch {
      /* no bloquea: la próxima recarga lo corrige */
    }
  }, []);

  /** Edición optimista con rollback. Devuelve true si se guardó. */
  const editarNegocio = useCallback(async (id, patch, okTexto = 'Guardado') => {
    const antes = pipeline?.find((n) => n.id === id);
    if (!antes) return false;
    parchearNegocioLocal(id, patch);
    try {
      await api.editarNegocio(id, patch);
      toast(okTexto);
      refrescarNegocio(id);
      return true;
    } catch (e) {
      setPipeline((lista) => lista?.map((n) => (n.id === id ? antes : n)));
      toast(mensajeError(e, 'guardar'), 'error');
      return false;
    }
  }, [pipeline, parchearNegocioLocal, refrescarNegocio]);

  const moverNegocio = useCallback((id, etapa) => {
    const n = pipeline?.find((x) => x.id === id);
    if (!n || n.etapa === etapa || !COLUMNA[etapa]) return;
    return editarNegocio(id, { etapa }, `Movido a ${COLUMNA[etapa].label}`);
  }, [pipeline, editarNegocio]);

  const refrescarLead = useCallback(async (id) => {
    try {
      const fila = await api.seguimientoFila(id);
      if (fila) setSeguimiento((lista) => lista?.map((l) => (l.id === id ? fila : l)));
    } catch {
      /* idem */
    }
  }, []);

  const editarLead = useCallback(async (id, patch, okTexto = 'Guardado') => {
    const antes = seguimiento?.find((l) => l.id === id);
    if (!antes) return false;
    setSeguimiento((lista) => lista?.map((l) => (l.id === id ? derivarLead({ ...l, ...patch }) : l)));
    try {
      await api.editarLead(id, patch);
      toast(okTexto);
      refrescarLead(id);
      return true;
    } catch (e) {
      setSeguimiento((lista) => lista?.map((l) => (l.id === id ? antes : l)));
      toast(mensajeError(e, 'guardar'), 'error');
      return false;
    }
  }, [seguimiento, refrescarLead]);

  const nombreDe = useCallback(
    (email) => (email ? primerNombre(usuarios[email], email) : ''),
    [usuarios],
  );

  const ctx = useMemo(() => ({
    yo, usuarios, nombreDe, pipeline, seguimiento, filtrosSeg, setFiltrosSeg,
    colActiva, setColActiva, ir, abrir, moverNegocio, editarNegocio, refrescarNegocio,
    editarLead, refrescarLead,
  }), [yo, usuarios, nombreDe, pipeline, seguimiento, filtrosSeg, setFiltrosSeg, colActiva, ir, abrir,
    moverNegocio, editarNegocio, refrescarNegocio, editarLead, refrescarLead]);

  // ---------- Render ----------
  if (estado === 'cargando') {
    return (
      <div class="pantalla-centro">
        <Marca size={40} />
        <Cargando texto="Abriendo Faro…" />
      </div>
    );
  }
  if (estado === 'login') {
    return (
      <>
        <Login aviso={aviso} onEntrar={iniciar} />
        <Toaster />
      </>
    );
  }
  if (estado === 'no-habilitado') {
    return (
      <div class="pantalla-centro">
        <Marca size={40} />
        <div class="no-habilitado">
          <h1>Tu cuenta no está habilitada para Faro.</h1>
          <p>Pedile acceso a Santi.{yo?.email ? ` Entraste como ${yo.email}.` : ''}</p>
          <button class="btn btn-secundario" onClick={salir}>Salir</button>
        </div>
      </div>
    );
  }
  if (estado === 'error-sesion') {
    return (
      <div class="pantalla-centro">
        <Marca size={40} />
        <div class="no-habilitado">
          <h1>No pudimos abrir Faro.</h1>
          <p>{errorSesion || 'Probá de nuevo en un momento.'}</p>
          <div class="login-acciones" style={{ justifyContent: 'center', gap: '0.75rem' }}>
            <button class="btn btn-primario" onClick={iniciar}>Reintentar</button>
            <button class="btn btn-secundario" onClick={salir}>Salir</button>
          </div>
        </div>
      </div>
    );
  }

  const negocioAbierto = ruta.tipo === 'n' ? pipeline?.find((n) => n.id === ruta.id) : null;
  const leadAbierto = ruta.tipo === 'l' ? seguimiento?.find((l) => l.id === ruta.id) : null;
  const datosListos = pipeline && seguimiento;

  return (
    <div class="app">
      <a class="saltar" href="#contenido">Saltar al contenido</a>
      <Cabecera
        vista={ruta.vista}
        yo={yo}
        nombre={primerNombre(usuarios[yo?.email] || yo?.nombre, yo?.email)}
        ir={ir}
        onSalir={salir}
        onActualizar={() => cargarDatos(true)}
        actualizando={actualizando}
      />
      <main id="contenido" class={`contenido contenido-${ruta.vista}`} tabIndex={-1}>
        {ruta.vista === 'perfil' ? (
          // El perfil no depende de los datos del CRM: se ve aunque la carga falle o siga en curso.
          <Perfil
            yo={yo}
            nombre={usuarios[yo?.email] || yo?.nombre || ''}
            onSalir={salir}
          />
        ) : errorCarga ? (
          <div class="error-carga">
            <p>{errorCarga}</p>
            <button class="btn btn-primario" onClick={() => cargarDatos()}>Reintentar</button>
          </div>
        ) : !datosListos ? (
          <Cargando texto="Trayendo los datos…" />
        ) : ruta.vista === 'pipeline' ? (
          <Pipeline ctx={ctx} />
        ) : ruta.vista === 'seguimiento' ? (
          <Seguimiento ctx={ctx} />
        ) : ruta.vista === 'calendario' ? (
          <Calendario ctx={ctx} />
        ) : (
          <Inicio ctx={ctx} />
        )}
      </main>

      <Panel
        abierto={!!(negocioAbierto || leadAbierto)}
        onCerrar={cerrar}
        titulo={negocioAbierto?.nombre || leadAbierto?.empresa || 'Detalle'}
      >
        {negocioAbierto && <DetalleNegocio key={negocioAbierto.id} negocio={negocioAbierto} ctx={ctx} onCerrar={cerrar} />}
        {leadAbierto && <DetalleLead key={leadAbierto.id} lead={leadAbierto} ctx={ctx} onCerrar={cerrar} />}
      </Panel>
      <Toaster />
    </div>
  );
}
