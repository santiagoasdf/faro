import { ESTADO_TEXTO, decisorConWhatsapp, estadoDecisores } from '../decisores.js';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { COLUMNAS, COLUMNA, CANAL_LABEL, ESTADO_INTERACCION, urlDemo, urlsPdf } from '../constants.js';
import { cuando, fechaCorta, haceCuanto, hoyBA, linkUrl, linkWhatsapp, norm, numero, plural, rating } from '../format.js';
import { FormularioNuevoLead } from './FormularioNuevoLead.jsx';
import { EnlacesFaro } from './EnlacesFaro.jsx';
import { Icon, Vacio } from './ui.jsx';

export function SelectEtapa({ valor, onCambiar, etiqueta = 'Mover a…', id, compacto }) {
  return (
    <label class={`select-etapa${compacto ? ' es-compacto' : ''}`}>
      <span class="sr-only">{etiqueta}</span>
      <select
        id={id}
        value=""
        onChange={(e) => {
          const v = e.currentTarget.value;
          e.currentTarget.value = '';
          if (v) onCambiar(v);
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <option value="" disabled>{etiqueta}</option>
        {COLUMNAS.filter((c) => c.key !== valor).map((c) => (
          <option key={c.key} value={c.key}>{c.label}</option>
        ))}
      </select>
    </label>
  );
}

export function Rating({ valor, resenas }) {
  if (valor === null || valor === undefined) return null;
  return (
    <span class="rating" aria-label={`${rating(valor)} estrellas en Google, ${resenas || 0} reseñas`}>
      <Icon name="estrella" size={13} fill="currentColor" />
      <span>{rating(valor)}</span>
      {resenas ? <span class="rating-n">({numero(resenas)})</span> : null}
    </span>
  );
}

function Tarjeta({ n, ctx, onArrastrar }) {
  const ultimo = n.ultima_interaccion_at
    ? `${CANAL_LABEL[n.ultima_interaccion_canal] || 'Contacto'} ${haceCuanto(n.ultima_interaccion_at)}`
    : 'Sin contactos';
  const decs = ctx.decisoresPorNegocio?.[n.id] || [];
  const estadoDec = estadoDecisores(decs);
  const decWa = decisorConWhatsapp(decs);
  const decTitulo = decs.length ? decs.map((d) => d.nombre).join(', ') : 'No hay decisores cargados';
  return (
    <li
      class={`tarjeta${n.vencido ? ' es-vencido' : ''}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', n.id);
        e.dataTransfer.effectAllowed = 'move';
        onArrastrar(n.id);
      }}
      onDragEnd={() => onArrastrar(null)}
    >
      <button class="tarjeta-abrir" onClick={() => ctx.abrir('n', n.id)}>
        <span class="tarjeta-nombre">
          {n.nombre}
          {n.etapa_legado && <span class="chip chip-legado" title={`Etapa original: ${n.etapa}`}>legado</span>}
        </span>
        {(n.rubro || n.barrio) && (
          <span class="tarjeta-sub">{[n.rubro, n.barrio].filter(Boolean).join(', ')}</span>
        )}
        <span class="tarjeta-chips">
          <Rating valor={n.rating_google} resenas={n.resenas_google} />
          {n.demo_id && <span class="chip chip-demo">Demo{n.demo_estado ? `: ${n.demo_estado}` : ''}</span>}
          {urlDemo(n) && (
            <a
              class="enlace-demo"
              href={linkUrl(urlDemo(n))}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir la demo en una pestaña nueva"
              onClick={(e) => e.stopPropagation()}
            >
              <Icon name="externo" size={13} />
              Ver demo
            </a>
          )}
          {urlsPdf(n) && (
            <>
              <a
                class="enlace-demo enlace-pdf"
                href={urlsPdf(n).web}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir el PDF de la versión web (1440 px)"
                onClick={(e) => e.stopPropagation()}
              >
                PDF web
              </a>
              <a
                class="enlace-demo enlace-pdf"
                href={urlsPdf(n).mobile}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir el PDF de la versión mobile (390 px)"
                onClick={(e) => e.stopPropagation()}
              >
                PDF mobile
              </a>
            </>
          )}
        </span>
        <span class="tarjeta-decisor">
          <span class={`chip chip-estado-${estadoDec}`} title={decTitulo}>{ESTADO_TEXTO[estadoDec]}</span>
          {decWa && (
            <a
              class="enlace-demo enlace-wa"
              href={linkWhatsapp(decWa.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              title={`WhatsApp de ${decWa.nombre}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Icon name="whatsapp" size={13} />
              WhatsApp
            </a>
          )}
        </span>
        <span class="tarjeta-pie">
          <span class="tarjeta-ultimo">{ultimo}</span>
          {n.proxima_fecha && (
            <span class={`tarjeta-prox${n.vencido ? ' es-vencido' : ''}`}>
              {n.vencido ? <Icon name="alerta" size={13} /> : <Icon name="reloj" size={13} />}
              {n.vencido ? `Vencido ${cuando(n.proxima_fecha)}` : cuando(n.proxima_fecha)}
            </span>
          )}
          <EnlacesFaro item={n} />
        </span>
      </button>
      <SelectEtapa valor={n.columna} onCambiar={(etapa) => ctx.moverNegocio(n.id, etapa)} compacto />
    </li>
  );
}

export function Pipeline({ ctx }) {
  const { pipeline, colActiva, setColActiva, abrir, nombreDe } = ctx;
  const [texto, setTexto] = useState('');
  const [nicho, setNicho] = useState('');
  const [arrastrando, setArrastrando] = useState(null);
  const [sobre, setSobre] = useState(null);
  const [visibles, setVisibles] = useState({});
  const [alta, setAlta] = useState(false);
  const tabsRef = useRef(null);
  const PAGINA = 10;

  const nichos = useMemo(
    () => [...new Set(pipeline.map((n) => n.nicho).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
    [pipeline],
  );

  const filtrados = useMemo(() => {
    const t = norm(texto.trim());
    return pipeline.filter(
      (n) => (!nicho || n.nicho === nicho) &&
        (!t || norm(`${n.nombre} ${n.rubro} ${n.barrio}`).includes(t)),
    );
  }, [pipeline, texto, nicho]);

  const porColumna = useMemo(() => {
    const m = Object.fromEntries(COLUMNAS.map((c) => [c.key, []]));
    for (const n of filtrados) (m[n.columna] || (m[n.columna] = [])).push(n);
    return m;
  }, [filtrados]);

  const hoy = hoyBA();
  const paraHoy = useMemo(() => {
    const items = [];
    for (const n of pipeline) {
      if (n.vencido || (n.proxima_fecha === hoy && n.columna !== 'descartado' && n.columna !== 'ganado')) {
        items.push(n);
      }
    }
    return items.sort((a, b) => (a.proxima_fecha || '').localeCompare(b.proxima_fecha || ''));
  }, [pipeline, hoy]);
  const vencidosHoy = paraHoy.filter((n) => n.vencido).length;

  const escalones = useMemo(() => {
    const c = Object.fromEntries(COLUMNAS.map((x) => [x.key, { total: 0, vencidos: 0 }]));
    for (const n of pipeline) {
      if (!c[n.columna]) continue;
      c[n.columna].total++;
      if (n.vencido) c[n.columna].vencidos++;
    }
    return c;
  }, [pipeline]);
  const totalAbiertos = COLUMNAS.filter((c) => !['ganado', 'descartado'].includes(c.key))
    .reduce((a, c) => a + escalones[c.key].total, 0);

  const movimientos = useMemo(() => {
    const items = [];
    for (const n of pipeline) {
      const at = n.ultimo_movimiento_at;
      if (!at) continue;
      let detalle = `Etapa: ${COLUMNA[n.columna]?.label || n.columna}`;
      if (n.ultima_nota_at && n.ultima_nota_at === at) detalle = `Nota: ${n.ultima_nota}`;
      else if (n.ultima_interaccion_at && n.ultima_interaccion_at === at) {
        detalle = `${CANAL_LABEL[n.ultima_interaccion_canal] || 'Contacto'}: ${ESTADO_INTERACCION[n.ultima_interaccion_estado] || 'registrado'}`;
      } else if (n.editado_web_at && n.editado_por) {
        detalle = `${nombreDe(n.editado_por)} lo editó (etapa: ${COLUMNA[n.columna]?.label})`;
      }
      items.push({ id: n.id, titulo: n.nombre, detalle, at });
    }
    return items.sort((a, b) => (b.at || '').localeCompare(a.at || '')).slice(0, 8);
  }, [pipeline, nombreDe]);

  // En mobile, que la pestaña activa quede visible.
  useEffect(() => {
    tabsRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [colActiva]);

  return (
    <div class="pipeline">
      <div class="barra">
        <div class="barra-titulo-fila">
          <h1 class="barra-titulo">Páginas web</h1>
          <button type="button" class="btn btn-primario btn-chico" onClick={() => setAlta(true)}>
            <Icon name="mas" size={16} />
            Nuevo lead web
          </button>
        </div>
        <p class="barra-nota barra-nota-seccion">Negocios a los que les ofrecemos una página.</p>
        <label class="buscador">
          <Icon name="buscar" size={16} />
          <span class="sr-only">Buscar negocio</span>
          <input
            type="search"
            placeholder="Buscar por nombre, rubro o barrio"
            value={texto}
            onInput={(e) => setTexto(e.currentTarget.value)}
          />
        </label>
        <label class="filtro">
          <span class="sr-only">Nicho</span>
          <select value={nicho} onChange={(e) => setNicho(e.currentTarget.value)}>
            <option value="">Todos los nichos</option>
            {nichos.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </label>
        <p class="barra-cuenta">{numero(filtrados.length)} de {numero(pipeline.length)}</p>
      </div>

      <div class="webs-resumen">
        <section class="bloque bloque-escalera" aria-labelledby="t-pipe">
          <div class="bloque-cabeza">
            <h2 id="t-pipe">Por etapa</h2>
            <p class="bloque-nota">{plural(totalAbiertos, 'negocio abierto', 'negocios abiertos')}</p>
          </div>
          <ol class="escalera">
            {COLUMNAS.map((c, i) => {
              const e = escalones[c.key];
              return (
                <li key={c.key} style={{ '--i': i, '--c': c.color }}>
                  <button
                    type="button"
                    class={`escalon${e.total === 0 ? ' es-cero' : ''}`}
                    onClick={() => setColActiva(c.key)}
                    aria-label={`${c.label}: ${e.total}${e.vencidos ? `, ${e.vencidos} vencidos` : ''}`}
                  >
                    <span class="escalon-num">{numero(e.total)}</span>
                    <span class="escalon-label">{c.label}</span>
                    {e.vencidos > 0 && <span class="escalon-venc">{e.vencidos} venc.</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </section>

        <section class="bloque bloque-hoy" aria-labelledby="t-hoy-web">
          <div class="bloque-cabeza">
            <h2 id="t-hoy-web">Para hoy</h2>
            {paraHoy.length > 0 && (
              <p class="hoy-resumen">
                {vencidosHoy > 0 && <span class="num-vencidos">{plural(vencidosHoy, 'vencido', 'vencidos')}</span>}
                {paraHoy.length - vencidosHoy > 0 && <span>{plural(paraHoy.length - vencidosHoy, 'para hoy', 'para hoy')}</span>}
              </p>
            )}
          </div>
          {paraHoy.length === 0 ? (
            <Vacio titulo="Nada vencido ni agendado para hoy.">
              Cuando un negocio tenga próxima fecha, aparece acá.
            </Vacio>
          ) : (
            <ul class="lista-hoy">
              {paraHoy.map((n) => (
                <li key={n.id}>
                  <button class={`fila-hoy${n.vencido ? ' es-vencido' : ''}`} onClick={() => abrir('n', n.id)}>
                    <span class="fila-hoy-tipo">{COLUMNA[n.columna]?.label || n.columna}</span>
                    <span class="fila-hoy-cuerpo">
                      <span class="fila-hoy-titulo">{n.nombre}</span>
                      <span class="fila-hoy-accion">{n.proxima_accion || 'Sin próxima acción escrita'}</span>
                    </span>
                    <span class="fila-hoy-fecha">
                      {n.vencido ? <><Icon name="alerta" size={14} /> {cuando(n.proxima_fecha)}</> : 'Hoy'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section class="bloque bloque-mov" aria-labelledby="t-mov-web">
          <div class="bloque-cabeza">
            <h2 id="t-mov-web">Últimos movimientos</h2>
          </div>
          {movimientos.length === 0 ? (
            <Vacio titulo="Todavía no hay movimientos registrados." />
          ) : (
            <ul class="lista-mov">
              {movimientos.map((m) => (
                <li key={m.id}>
                  <button class="fila-mov" onClick={() => abrir('n', m.id)}>
                    <span class="fila-mov-titulo">{m.titulo}</span>
                    <span class="fila-mov-det">{m.detalle}</span>
                    <time class="fila-mov-cuando" dateTime={m.at} title={fechaCorta(m.at)}>{haceCuanto(m.at)}</time>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div class="tabs-etapas" ref={tabsRef} role="group" aria-label="Etapa">
        {COLUMNAS.map((c) => (
          <button
            key={c.key}
            class="tab-etapa"
            style={{ '--c': c.color }}
            aria-pressed={colActiva === c.key}
            onClick={() => setColActiva(c.key)}
          >
            <span class="punto" aria-hidden="true" />
            {c.label}
            <span class="tab-n">{porColumna[c.key]?.length || 0}</span>
          </button>
        ))}
      </div>

      <div class="tablero">
        {COLUMNAS.map((c, i) => {
          const items = porColumna[c.key] || [];
          return (
            <section
              key={c.key}
              class={`columna${colActiva === c.key ? ' activa' : ''}${sobre === c.key ? ' es-destino' : ''}`}
              style={{ '--c': c.color }}
              aria-labelledby={`col-${c.key}`}
              onDragOver={(e) => {
                if (!arrastrando) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (sobre !== c.key) setSobre(c.key);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setSobre(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain') || arrastrando;
                setSobre(null);
                setArrastrando(null);
                if (id) ctx.moverNegocio(id, c.key);
              }}
            >
              <header class="columna-cabeza">
                <span class="columna-paso" aria-hidden="true">{i + 1}</span>
                <h2 id={`col-${c.key}`}>{c.label}</h2>
                <span class="columna-n">{items.length}</span>
              </header>
              {items.length === 0 ? (
                <p class="columna-vacia">
                  {texto || nicho ? 'Ningún negocio coincide.' : 'Sin negocios en esta etapa.'}
                </p>
              ) : (
                <>
                  <ul class="columna-lista">
                    {items.slice(0, visibles[c.key] || PAGINA).map((n) => (
                      <Tarjeta key={n.id} n={n} ctx={ctx} onArrastrar={setArrastrando} />
                    ))}
                  </ul>
                  {(visibles[c.key] || PAGINA) < items.length && (
                    <button
                      type="button"
                      class="columna-mas"
                      onClick={() => setVisibles((v) => ({ ...v, [c.key]: (v[c.key] || PAGINA) + PAGINA }))}
                    >
                      + {Math.min(PAGINA, items.length - (visibles[c.key] || PAGINA))} más
                    </button>
                  )}
                </>
              )}
            </section>
          );
        })}
      </div>
      {pipeline.length === 0 && (
        <Vacio titulo="Todavía no hay negocios en Páginas web.">Cuando Mapin cargue candidatos, aparecen acá.</Vacio>
      )}
      <FormularioNuevoLead
        tipo="pipeline"
        abierto={alta}
        onCerrar={() => setAlta(false)}
        onGuardar={ctx.crearNegocio}
        ctx={ctx}
      />
    </div>
  );
}
