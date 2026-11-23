import { useEffect, useMemo, useState } from 'preact/hooks';
import { api } from '../api.js';
import {
  BALDES, DIAS_SEMANA, PERSONAS, addDays, agruparPorBalde, diasDelMes, diasDeLaSemana,
  emailCanónico, esReunion, eventosDesdeProximas, eventosEnFecha, horaCorta, mesLargo,
  normalizarEventosVista, personaDeEmail, tareasDesdeListas,
} from '../calendario.js';
import { cuando, fechaCorta, hoyBA } from '../format.js';
import { EnlacesFaro } from './EnlacesFaro.jsx';
import { ChipResponsable } from './Responsable.jsx';
import { BotonMas, Icon, PAGINA, Vacio } from './ui.jsx';

const VISTAS = [
  { key: 'lista', label: 'Lista', icono: 'lista' },
  { key: 'kanban', label: 'Kanban', icono: 'kanban' },
  { key: 'mes', label: 'Mes', icono: 'calendario' },
  { key: 'semana', label: 'Semana', icono: 'calendario' },
];

function TarjetaTarea({ t, abrir }) {
  return (
    <li>
      <button
        type="button"
        class={`cal-card${t.vencido ? ' es-vencido' : ''}${t.urgente ? ' es-urgente' : ''}`}
        onClick={() => abrir(t.tipo, t.id)}
      >
        <span class="cal-card-cabeza">
          <span class="cal-card-titulo">{t.titulo}</span>
          {t.urgente && <span class="chip chip-urgente"><Icon name="urgente" size={12} />Urgente</span>}
          <ChipResponsable email={t.responsable_email} />
        </span>
        {t.sub && <span class="cal-card-sub">{t.sub}</span>}
        <span class="cal-card-prox">
          {t.fecha && (
            <span class={`cal-card-fecha${t.vencido ? ' es-vencido' : ''}`}>
              {t.vencido ? <Icon name="alerta" size={13} /> : <Icon name="reloj" size={13} />}
              {t.vencido ? `Vencido ${cuando(t.fecha)}` : cuando(t.fecha)}
            </span>
          )}
          <span class="cal-card-accion">{t.accion || 'Sin próxima acción'}</span>
        </span>
        {(t.area || t.celebe_url || t.linkedin_url) && (
          <span class="cal-card-pie">
            {t.area && <span class="cal-card-area">{t.area}</span>}
            <EnlacesFaro item={t} />
          </span>
        )}
      </button>
    </li>
  );
}

function ListaBaldes({ grupos, abrir }) {
  const [abierto, setAbierto] = useState(() => Object.fromEntries(
    BALDES.map((b) => [b.key, !b.colapsado]),
  ));
  const [visibles, setVisibles] = useState({});
  return (
    <div class="cal-listas">
      {BALDES.map((b) => {
        const items = grupos[b.key] || [];
        const exp = abierto[b.key];
        const n = visibles[b.key] || PAGINA;
        return (
          <section key={b.key} class={`cal-grupo tono-${b.tono}${b.colapsado ? ' es-colapsable' : ''}`}>
            <button
              type="button"
              class="cal-grupo-cabeza"
              onClick={() => setAbierto((s) => ({ ...s, [b.key]: !s[b.key] }))}
              aria-expanded={exp}
            >
              <h2>{b.label}</h2>
              <span class="cal-grupo-n">{items.length}</span>
              <Icon name="flecha" size={16} class={`cal-grupo-chev${exp ? " es-abierto" : ""}`} />
            </button>
            {exp && (
              items.length ? (
                <>
                  <ul class="cal-grupo-lista">
                    {items.slice(0, n).map((t) => <TarjetaTarea key={t.tipo + t.id} t={t} abrir={abrir} />)}
                  </ul>
                  <BotonMas
                    vistos={n}
                    total={items.length}
                    onMas={() => setVisibles((v) => ({ ...v, [b.key]: n + PAGINA }))}
                  />
                </>
              ) : (
                <p class="cal-vacio">Nada en este balde.</p>
              )
            )}
          </section>
        );
      })}
    </div>
  );
}

function KanbanBaldes({ grupos, abrir }) {
  const [sinFecha, setSinFecha] = useState(false);
  const [visiblesN, setVisiblesN] = useState({});
  const visibles = BALDES.filter((b) => !b.colapsado);
  const sf = BALDES.find((b) => b.key === 'sin_fecha');
  const itemsSf = grupos.sin_fecha || [];
  const nDe = (key) => visiblesN[key] || PAGINA;
  const mas = (key, n) => setVisiblesN((v) => ({ ...v, [key]: n + PAGINA }));
  return (
    <div class="cal-kanban-wrap">
      <div class="cal-kanban tablero">
        {visibles.map((b) => {
          const items = grupos[b.key] || [];
          const n = nDe(b.key);
          return (
            <section key={b.key} class={`columna cal-col tono-${b.tono}`} aria-labelledby={`balde-${b.key}`}>
              <header class="columna-cabeza">
                <h2 id={`balde-${b.key}`}>{b.label}</h2>
                <span class="columna-n">{items.length}</span>
              </header>
              {items.length === 0 ? (
                <p class="columna-vacia">Sin tarjetas.</p>
              ) : (
                <>
                  <ul class="columna-lista">
                    {items.slice(0, n).map((t) => <TarjetaTarea key={t.tipo + t.id} t={t} abrir={abrir} />)}
                  </ul>
                  <BotonMas vistos={n} total={items.length} onMas={() => mas(b.key, n)} />
                </>
              )}
            </section>
          );
        })}
      </div>
      {sf && (
        <section class={`cal-sin-fecha tono-${sf.tono}`}>
          <button type="button" class="cal-grupo-cabeza" onClick={() => setSinFecha((v) => !v)} aria-expanded={sinFecha}>
            <h2>{sf.label}</h2>
            <span class="cal-grupo-n">{itemsSf.length}</span>
            <span class="cal-sin-ayuda">Leads activos sin próxima fecha</span>
          </button>
          {sinFecha && (
            itemsSf.length ? (
              <>
                <ul class="cal-grupo-lista cal-sin-lista">
                  {itemsSf.slice(0, nDe('sin_fecha')).map((t) => <TarjetaTarea key={t.tipo + t.id} t={t} abrir={abrir} />)}
                </ul>
                <BotonMas
                  vistos={nDe('sin_fecha')}
                  total={itemsSf.length}
                  onMas={() => mas('sin_fecha', nDe('sin_fecha'))}
                />
              </>
            ) : (
              <p class="cal-vacio">Todos los leads activos tienen fecha.</p>
            )
          )}
        </section>
      )}
    </div>
  );
}

function PuntoEvento({ ev, abrir }) {
  const lead = ev.lead;
  const reunion = esReunion(ev);
  return (
    <div class={`cal-ev${reunion ? ' es-reunion' : ''}${ev.estado === 'vencido' ? ' es-vencido' : ''}${ev.derivado ? ' es-derivado' : ''}`}>
      <button
        type="button"
        title={ev.titulo}
        onClick={() => lead?.id && abrir(lead.tipo || 'l', lead.id)}
      >
        {reunion && !ev.todo_el_dia && horaCorta(ev.inicia_en) && (
          <span class="cal-ev-hora">{horaCorta(ev.inicia_en)}</span>
        )}
        <span class="cal-ev-tit">{ev.titulo}</span>
        {ev.derivado && <span class="cal-ev-origen">próxima acción</span>}
        {reunion && ev.fuente === 'calendly' && <span class="cal-ev-origen">Calendly</span>}
      </button>
      {ev.meet_url && (
        <a class="cal-ev-meet" href={ev.meet_url} target="_blank" rel="noopener noreferrer" title="Unirse a la reunión" onClick={(e) => e.stopPropagation()}>
          Meet
        </a>
      )}
    </div>
  );
}

function VistaMes({ cursor, eventos, abrir, hoy }) {
  const [anio, mes] = [cursor.getUTCFullYear(), cursor.getUTCMonth() + 1];
  const dias = diasDelMes(anio, mes);
  const mesStr = String(mes).padStart(2, '0');
  return (
    <div class="cal-mes">
      <div class="cal-mes-dow" aria-hidden="true">
        {DIAS_SEMANA.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div class="cal-mes-grid">
        {dias.map((iso) => {
          const evs = eventosEnFecha(eventos, iso);
          const otro = iso.slice(5, 7) !== mesStr;
          return (
            <div
              key={iso}
              class={`cal-dia${otro ? ' es-otro' : ''}${iso === hoy ? ' es-hoy' : ''}${evs.some((e) => e.estado === 'vencido') ? ' es-vencido' : ''}`}
            >
              <span class="cal-dia-n">{Number(iso.slice(8))}</span>
              <div class="cal-dia-evs">
                {evs.slice(0, 3).map((ev, i) => <PuntoEvento key={ev.inicia_en + ev.titulo + i} ev={ev} abrir={abrir} />)}
                {evs.length > 3 && <span class="cal-dia-mas">+{evs.length - 3}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VistaSemana({ cursor, eventos, abrir, hoy }) {
  const iso = cursor.toISOString().slice(0, 10);
  const dias = diasDeLaSemana(iso);
  return (
    <div class="cal-semana">
      {dias.map((d) => {
        const evs = eventosEnFecha(eventos, d);
        return (
          <section key={d} class={`cal-sem-col${d === hoy ? ' es-hoy' : ''}`}>
            <header class="cal-sem-cabeza">
              <span class="cal-sem-dow">{DIAS_SEMANA[dias.indexOf(d)]}</span>
              <span class="cal-sem-n">{fechaCorta(d)}</span>
            </header>
            {evs.length === 0 ? (
              <p class="cal-vacio">Sin eventos.</p>
            ) : (
              <ul class="cal-sem-lista">
                {evs.map((ev, i) => (
                  <li key={ev.inicia_en + ev.titulo + i}><PuntoEvento ev={ev} abrir={abrir} /></li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

export function Calendario({ ctx }) {
  const { pipeline, seguimiento, abrir } = ctx;
  const hoy = hoyBA();
  const [vista, setVista] = useState('lista');
  const [filtro, setFiltro] = useState(''); // '', santi email, guido email
  const [cursor, setCursor] = useState(() => new Date(`${hoy}T00:00:00Z`));
  const [eventosVista, setEventosVista] = useState(null); // null = todavía no; [] o filas = v_calendario

  useEffect(() => {
    let vivo = true;
    api.calendario?.()
      .then((rows) => { if (vivo) setEventosVista(rows); })
      .catch(() => { if (vivo) setEventosVista(null); });
    return () => { vivo = false; };
  }, []);

  const tareas = useMemo(() => {
    const todas = tareasDesdeListas(pipeline, seguimiento);
    if (!filtro) return todas;
    const canon = emailCanónico(filtro);
    return todas.filter((t) => personaDeEmail(t.responsable_email)?.email === canon);
  }, [pipeline, seguimiento, filtro]);

  const grupos = useMemo(() => agruparPorBalde(tareas, hoy), [tareas, hoy]);

  const eventosDerivados = useMemo(() => eventosDesdeProximas(tareas), [tareas]);
  // v_calendario, cuando exista y traiga filas; si no, follow-ups all-day derivados de proxima_fecha.
  const eventos = useMemo(() => {
    if (Array.isArray(eventosVista) && eventosVista.length > 0) return normalizarEventosVista(eventosVista);
    return eventosDerivados;
  }, [eventosVista, eventosDerivados]);

  const anio = cursor.getUTCFullYear();
  const mes = cursor.getUTCMonth() + 1;

  function moverMes(delta) {
    const d = new Date(Date.UTC(anio, mes - 1 + delta, 1));
    setCursor(d);
  }
  function moverSemana(delta) {
    setCursor(new Date(`${addDays(cursor.toISOString().slice(0, 10), delta * 7)}T00:00:00Z`));
  }

  const conFecha = tareas.filter((t) => t.fecha).length;
  const vencidos = (grupos.para_ayer || []).length;

  return (
    <div class="calendario">
      <div class="barra barra-cal">
        <div class="barra-titulos">
          <h1 class="barra-titulo">Calendario</h1>
          <p class="barra-nota">
            {conFecha} con fecha{vencidos ? ` · ${vencidos} vencidas` : ''}
            {Array.isArray(eventosVista) && eventosVista.length > 0
              ? ' · eventos de v_calendario'
              : ' · mes/semana: preview derivado de la próxima acción (v_calendario aún no tiene eventos)'}
          </p>
        </div>
        <div class="cal-toolbar">
          <div class="segmentado-op cal-vistas" role="tablist" aria-label="Vista">
            {VISTAS.map((v) => (
              <button
                key={v.key}
                type="button"
                role="tab"
                aria-selected={vista === v.key}
                class={vista === v.key ? 'es-activa' : ''}
                onClick={() => setVista(v.key)}
              >
                <Icon name={v.icono} size={16} />
                {v.label}
              </button>
            ))}
          </div>
          <div class="segmentado-op cal-filtro-pers" role="group" aria-label="Responsable">
            <button type="button" class={!filtro ? 'es-activa' : ''} onClick={() => setFiltro('')}>Todos</button>
            {PERSONAS.map((p) => (
              <button
                key={p.key}
                type="button"
                class={filtro === p.email ? 'es-activa' : ''}
                onClick={() => setFiltro(p.email)}
              >
                {p.nombre}
              </button>
            ))}
          </div>
        </div>
      </div>

      {(vista === 'mes' || vista === 'semana') && (
        <div class="cal-nav-periodo">
          <button type="button" class="btn-icono" aria-label="Anterior" onClick={() => (vista === 'mes' ? moverMes(-1) : moverSemana(-1))}>
            <Icon name="volver" />
          </button>
          <h2 class="cal-periodo">
            {vista === 'mes' ? mesLargo(anio, mes) : `Semana del ${fechaCorta(diasDeLaSemana(cursor.toISOString().slice(0, 10))[0])}`}
          </h2>
          <button type="button" class="btn-icono" aria-label="Siguiente" onClick={() => (vista === 'mes' ? moverMes(1) : moverSemana(1))}>
            <Icon name="adelante" />
          </button>
          <button type="button" class="btn btn-fantasma btn-chico" onClick={() => setCursor(new Date(`${hoy}T00:00:00Z`))}>Hoy</button>
        </div>
      )}

      {vista === 'lista' && <ListaBaldes grupos={grupos} abrir={abrir} />}
      {vista === 'kanban' && <KanbanBaldes grupos={grupos} abrir={abrir} />}
      {vista === 'mes' && <VistaMes cursor={cursor} eventos={eventos} abrir={abrir} hoy={hoy} />}
      {vista === 'semana' && <VistaSemana cursor={cursor} eventos={eventos} abrir={abrir} hoy={hoy} />}

      {tareas.length === 0 && vista !== 'mes' && vista !== 'semana' && (
        <Vacio titulo="No hay seguimientos para mostrar.">
          {filtro ? 'Nadie de este responsable tiene una próxima acción todavía.' : 'Cuando haya una próxima fecha, aparece acá.'}
        </Vacio>
      )}
    </div>
  );
}

