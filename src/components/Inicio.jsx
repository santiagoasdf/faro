import { useMemo } from 'preact/hooks';
import { GRUPOS, origenLead } from '../constants.js';
import { cuando, fechaCorta, haceCuanto, hoyBA, hoyLargo, numero, plural, primerNombre } from '../format.js';
import { Icon, Vacio } from './ui.jsx';
import { filtrarSeguimiento } from './Seguimiento.jsx';

export function Inicio({ ctx }) {
  const { seguimiento, filtrosSeg, yo, usuarios, abrir, ir, nombreDe } = ctx;
  const hoy = hoyBA();
  const perfil = filtrosSeg.perfil;
  const leads = useMemo(
    () => filtrarSeguimiento(seguimiento, { ...filtrosSeg, soloVencidos: false, verInactivos: false, texto: '' }),
    [seguimiento, filtrosSeg],
  );

  const paraHoy = useMemo(() => {
    const items = [];
    for (const l of leads) {
      if (l.vencido || l.proxima_fecha === hoy) {
        items.push({
          tipo: 'l', id: l.id, titulo: l.empresa, sub: l.contacto, accion: l.proxima_accion,
          fecha: l.proxima_fecha, vencido: l.vencido, urgente: l.urgente, origen: origenLead(l),
        });
      }
    }
    return items.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
  }, [leads, hoy]);

  const vencidos = paraHoy.filter((x) => x.vencido).length;

  const grupos = useMemo(() => {
    const c = Object.fromEntries(GRUPOS.map((g) => [g.key, { total: 0, vencidos: 0 }]));
    for (const l of leads) {
      const k = c[l.grupo] ? l.grupo : null;
      if (!k) continue;
      c[k].total++;
      if (l.vencido) c[k].vencidos++;
    }
    return c;
  }, [leads]);

  const movimientos = useMemo(() => {
    const items = [];
    for (const l of leads) {
      const at = l.editado_web_at;
      if (!at) continue;
      items.push({
        tipo: 'l', id: l.id, titulo: l.empresa, origen: origenLead(l),
        detalle: `${nombreDe(l.editado_por) || 'Editado'}: ${l.grupo || 'sin grupo'}${l.proxima_accion ? `, ${l.proxima_accion}` : ''}`,
        at,
      });
    }
    return items.sort((a, b) => (b.at || '').localeCompare(a.at || '')).slice(0, 8);
  }, [leads, nombreDe]);

  const nombre = primerNombre(usuarios[yo?.email] || yo?.nombre, yo?.email);

  return (
    <div class="inicio">
      <header class="inicio-cabeza">
        <h1>Hola{nombre ? `, ${nombre}` : ''}</h1>
        <p class="inicio-fecha">{hoyLargo()}</p>
      </header>

      <section class="bloque bloque-hoy" aria-labelledby="t-hoy">
        <div class="bloque-cabeza">
          <h2 id="t-hoy">Para hoy</h2>
          {paraHoy.length > 0 && (
            <p class="hoy-resumen">
              {vencidos > 0 && <span class="num-vencidos">{plural(vencidos, 'vencido', 'vencidos')}</span>}
              {paraHoy.length - vencidos > 0 && <span>{plural(paraHoy.length - vencidos, 'para hoy', 'para hoy')}</span>}
            </p>
          )}
        </div>
        {paraHoy.length === 0 ? (
          <Vacio titulo="Nada vencido ni agendado para hoy.">
            Buen momento para avanzar los leads o agendar próximos pasos.
          </Vacio>
        ) : (
          <ul class="lista-hoy">
            {paraHoy.map((x) => (
              <li key={x.tipo + x.id}>
                <button class={`fila-hoy${x.vencido ? ' es-vencido' : ''}`} onClick={() => abrir(x.tipo, x.id)}>
                  <span class="fila-hoy-tipo">{x.origen}</span>
                  <span class="fila-hoy-cuerpo">
                    <span class="fila-hoy-titulo">
                      {x.titulo}
                      {x.urgente && <span class="chip chip-urgente">Urgente</span>}
                    </span>
                    <span class="fila-hoy-accion">{x.accion || 'Sin próxima acción escrita'}</span>
                  </span>
                  <span class="fila-hoy-fecha">
                    {x.vencido ? <><Icon name="alerta" size={14} /> {cuando(x.fecha)}</> : 'Hoy'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section class="bloque bloque-grupos" aria-labelledby="t-seg">
        <div class="bloque-cabeza">
          <h2 id="t-seg">Provaider y LevelUp <span class="bloque-nota">· {perfil ? primerNombre(perfil) : 'todos'}</span></h2>
          <a href="#/seguimiento" class="link-ver" onClick={(e) => { e.preventDefault(); ir('seguimiento'); }}>
            Ver leads <Icon name="flecha" size={16} />
          </a>
        </div>
        <ul class="grupos">
          {GRUPOS.filter((g) => g.key !== 'Excluido').map((g) => (
            <li key={g.key} class={`grupo-tile grupo-${g.orden}`}>
              <span class="grupo-num">{numero(grupos[g.key].total)}</span>
              <span class="grupo-label">{g.key}</span>
              {grupos[g.key].vencidos > 0 && (
                <span class="grupo-venc">{plural(grupos[g.key].vencidos, 'vencido', 'vencidos')}</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section class="bloque bloque-mov" aria-labelledby="t-mov">
        <div class="bloque-cabeza">
          <h2 id="t-mov">Últimos movimientos</h2>
        </div>
        {movimientos.length === 0 ? (
          <Vacio titulo="Todavía no hay movimientos registrados." />
        ) : (
          <ul class="lista-mov">
            {movimientos.map((m) => (
              <li key={m.tipo + m.id}>
                <button class="fila-mov" onClick={() => abrir(m.tipo, m.id)}>
                  <span class="fila-mov-titulo"><span class="fila-hoy-tipo fila-mov-tipo">{m.origen}</span>{m.titulo}</span>
                  <span class="fila-mov-det">{m.detalle}</span>
                  <time class="fila-mov-cuando" dateTime={m.at} title={fechaCorta(m.at)}>{haceCuanto(m.at)}</time>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
