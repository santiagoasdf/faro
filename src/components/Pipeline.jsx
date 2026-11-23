import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { COLUMNAS, CANAL_LABEL } from '../constants.js';
import { cuando, haceCuanto, norm, numero, rating } from '../format.js';
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
  const { pipeline, colActiva, setColActiva } = ctx;
  const [texto, setTexto] = useState('');
  const [nicho, setNicho] = useState('');
  const [arrastrando, setArrastrando] = useState(null);
  const [sobre, setSobre] = useState(null);
  const [visibles, setVisibles] = useState({});
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

  // En mobile, que la pestaña activa quede visible.
  useEffect(() => {
    tabsRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [colActiva]);

  return (
    <div class="pipeline">
      <div class="barra">
        <h1 class="barra-titulo">Pipeline</h1>
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
        <Vacio titulo="Todavía no hay negocios en el pipeline.">Cuando Mapin cargue candidatos, aparecen acá.</Vacio>
      )}
    </div>
  );
}
