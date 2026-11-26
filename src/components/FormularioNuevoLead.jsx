import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { COLUMNAS, GRUPOS } from '../constants.js';
import {
  duplicadosLead,
  duplicadosNegocio,
  emailValido,
  hayDecisor,
  etiquetaDuplicado,
  telefonoValido,
} from '../alta.js';
import { Icon } from './ui.jsx';

const VACIO_PIPE = {
  nombre: '', rubro: '', barrio: '', telefono: '', instagram: '',
  web_url: '', nicho: 'landing', etapa: 'candidato', url_google_maps: '', notas: '',
  decisor_nombre: '', decisor_cargo: '', decisor_whatsapp: '', decisor_email: '',
  decisor_email_etiqueta: 'general', decisor_fuente_url: '', decisor_confirmado: false,
};
const VACIO_SEG = {
  empresa: '', contacto: '', email: '', perfil: '', area: '',
  grupo: 'Caliente', proxima_accion: '', proxima_fecha: '', notas: '',
};

function Campo({ label, requerido, error, children }) {
  return (
    <label class="campo">
      <span class="campo-label">{label}{requerido ? ' *' : ''}</span>
      {children}
      {error && <span class="campo-error">{error}</span>}
    </label>
  );
}

export function FormularioNuevoLead({ tipo, abierto, onCerrar, onGuardar, ctx }) {
  const pipeline = tipo === 'pipeline';
  const ref = useRef(null);
  const primero = useRef(null);
  const [form, setForm] = useState(pipeline ? VACIO_PIPE : VACIO_SEG);
  const [errores, setErrores] = useState({});
  const [aviso, setAviso] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const nichos = useMemo(() => {
    const set = new Set((ctx.pipeline || []).map((n) => n.nicho).filter(Boolean));
    set.add('landing');
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  }, [ctx.pipeline]);

  const perfiles = useMemo(() => {
    const set = new Set((ctx.seguimiento || []).map((l) => l.perfil).filter(Boolean));
    const mio = ctx.usuarios?.[ctx.yo?.email] || ctx.yo?.nombre;
    if (mio) set.add(mio);
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  }, [ctx.seguimiento, ctx.usuarios, ctx.yo]);

  const areas = useMemo(() => {
    const set = new Set((ctx.seguimiento || []).map((l) => l.area).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  }, [ctx.seguimiento]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) {
      const base = pipeline ? { ...VACIO_PIPE } : { ...VACIO_SEG };
      if (!pipeline) {
        if (ctx.filtrosSeg?.perfil) base.perfil = ctx.filtrosSeg.perfil;
        else {
          const mio = ctx.usuarios?.[ctx.yo?.email] || ctx.yo?.nombre || '';
          if (mio) base.perfil = mio;
        }
        if (ctx.filtrosSeg?.area) base.area = ctx.filtrosSeg.area;
      }
      setForm(base);
      setErrores({});
      setAviso(null);
      setEnviando(false);
      d.showModal();
      requestAnimationFrame(() => primero.current?.focus());
    }
    if (!abierto && d.open) d.close();
  }, [abierto, pipeline, ctx.filtrosSeg, ctx.usuarios, ctx.yo]);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrores((e) => (e[k] ? { ...e, [k]: '' } : e));
    setAviso(null);
  };

  function validar() {
    const e = {};
    if (pipeline) {
      if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio.';
      if (!telefonoValido(form.telefono)) e.telefono = 'Revisá el teléfono (8 a 15 dígitos).';
      if (hayDecisor(form)) {
        if (!emailValido(form.decisor_email)) e.decisor_email = 'Revisá el mail del decisor.';
        const w = String(form.decisor_whatsapp || '').trim();
        if (!telefonoValido(w) && !/^https?:\/\//i.test(w)) e.decisor_whatsapp = 'Revisá el WhatsApp (8 a 15 dígitos o un link).';
      } else if (String(form.decisor_whatsapp || form.decisor_email || '').trim()) {
        e.decisor_nombre = 'Poné el nombre del decisor para guardar su contacto.';
      }
    } else {
      if (!form.empresa.trim()) e.empresa = 'La empresa es obligatoria.';
      if (!emailValido(form.email)) e.email = 'Revisá el mail.';
    }
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  function coincidencias() {
    if (pipeline) {
      return duplicadosNegocio(ctx.pipeline, {
        nombre: form.nombre, telefono: form.telefono,
      });
    }
    return duplicadosLead(ctx.seguimiento, { empresa: form.empresa, email: form.email });
  }

  async function enviar(ev) {
    ev?.preventDefault();
    if (enviando) return;
    if (!validar()) return;
    const dups = coincidencias();
    // Un negocio no puede repetir el nombre (UNIQUE). Lo bloqueamos.
    if (pipeline) {
      const mismoNombre = dups.filter((n) => n.nombre.trim().toLowerCase() === form.nombre.trim().toLowerCase());
      if (mismoNombre.length) {
        setAviso({
          tipo: 'bloquea',
          texto: `Ya existe un negocio con ese nombre: ${mismoNombre.map((n) => etiquetaDuplicado(n, 'pipeline')).join(', ')}.`,
        });
        return;
      }
    }
    if (dups.length && aviso?.tipo !== 'duplicados') {
      const tipo = pipeline ? 'pipeline' : 'seguimiento';
      const lista = dups.slice(0, 5).map((x) => etiquetaDuplicado(x, tipo)).join(', ');
      const mas = dups.length > 5 ? ` y ${dups.length - 5} más` : '';
      setAviso({
        tipo: 'duplicados',
        texto: `Ya hay un registro parecido (${lista}${mas}). Si es el mismo, cancelá. Si es otro, podés crearlo igual.`,
      });
      return;
    }
    setEnviando(true);
    const ok = await onGuardar(form);
    setEnviando(false);
    if (ok) onCerrar();
  }

  const titulo = pipeline ? 'Nuevo negocio' : 'Nuevo lead';

  return (
    <dialog
      ref={ref}
      class="alta-dialog"
      aria-labelledby="alta-titulo"
      onCancel={(e) => {
        e.preventDefault();
        onCerrar();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onCerrar();
      }}
    >
      <form class="alta-hoja" onSubmit={enviar}>
        <header class="alta-cabeza">
          <h2 id="alta-titulo">{titulo}</h2>
          <button type="button" class="btn-icono" onClick={onCerrar} aria-label="Cerrar">
            <Icon name="cerrar" size={20} />
          </button>
        </header>

        <div class="alta-campos">
          {pipeline ? (
            <>
              <Campo label="Nombre" requerido error={errores.nombre}>
                <input ref={primero} type="text" value={form.nombre}
                  aria-invalid={!!errores.nombre}
                  onInput={(e) => set('nombre', e.currentTarget.value)}
                  autoComplete="organization" />
              </Campo>
              <Campo label="Rubro">
                <input type="text" value={form.rubro} onInput={(e) => set('rubro', e.currentTarget.value)} />
              </Campo>
              <Campo label="Barrio">
                <input type="text" value={form.barrio} onInput={(e) => set('barrio', e.currentTarget.value)} />
              </Campo>
              <Campo label="Teléfono / WhatsApp" error={errores.telefono}>
                <input type="tel" value={form.telefono} aria-invalid={!!errores.telefono}
                  placeholder="11 1234-5678"
                  onInput={(e) => set('telefono', e.currentTarget.value)} />
              </Campo>
              <Campo label="Instagram">
                <input type="text" value={form.instagram} placeholder="@cuenta"
                  onInput={(e) => set('instagram', e.currentTarget.value)} />
              </Campo>
              <Campo label="Sitio web">
                <input type="text" inputMode="url" value={form.web_url} placeholder="https://"
                  onInput={(e) => set('web_url', e.currentTarget.value)} />
              </Campo>
              <Campo label="Nicho">
                <select value={form.nicho} onChange={(e) => set('nicho', e.currentTarget.value)}>
                  {nichos.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </Campo>
              <Campo label="Etapa">
                <select value={form.etapa} onChange={(e) => set('etapa', e.currentTarget.value)}>
                  {COLUMNAS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </Campo>
              <Campo label="Google Maps">
                <input type="text" inputMode="url" value={form.url_google_maps} placeholder="https://maps.google.com/…"
                  onInput={(e) => set('url_google_maps', e.currentTarget.value)} />
              </Campo>
              <Campo label="Notas">
                <textarea rows={3} value={form.notas} onInput={(e) => set('notas', e.currentTarget.value)} />
              </Campo>
              <fieldset class="alta-decisor">
                <legend>Decisor (opcional)</legend>
                <Campo label="Nombre del decisor" error={errores.decisor_nombre}>
                  <input type="text" value={form.decisor_nombre} aria-invalid={!!errores.decisor_nombre}
                    onInput={(e) => set('decisor_nombre', e.currentTarget.value)} autoComplete="off" />
                </Campo>
                <Campo label="Cargo">
                  <input type="text" value={form.decisor_cargo} placeholder="Dueño, titular…"
                    onInput={(e) => set('decisor_cargo', e.currentTarget.value)} />
                </Campo>
                <Campo label="WhatsApp del decisor" error={errores.decisor_whatsapp}>
                  <input type="text" inputMode="tel" value={form.decisor_whatsapp} placeholder="11 1234-5678"
                    onInput={(e) => set('decisor_whatsapp', e.currentTarget.value)} />
                </Campo>
                <Campo label="Mail del decisor" error={errores.decisor_email}>
                  <input type="email" value={form.decisor_email}
                    onInput={(e) => set('decisor_email', e.currentTarget.value)} />
                </Campo>
                {form.decisor_email.trim() && (
                  <Campo label="Ese mail es…">
                    <select value={form.decisor_email_etiqueta} onChange={(e) => set('decisor_email_etiqueta', e.currentTarget.value)}>
                      <option value="del_decisor">Mail del decisor</option>
                      <option value="general">Mail general del negocio</option>
                      <option value="directorio_sin_verificar">Mail de directorio (sin verificar)</option>
                    </select>
                  </Campo>
                )}
                <Campo label="Fuente (URL)">
                  <input type="text" inputMode="url" value={form.decisor_fuente_url} placeholder="https://"
                    onInput={(e) => set('decisor_fuente_url', e.currentTarget.value)} />
                </Campo>
                <label class="check">
                  <input type="checkbox" checked={form.decisor_confirmado}
                    onChange={(e) => set('decisor_confirmado', e.currentTarget.checked)} />
                  <span>Confirmado en una fuente propia</span>
                </label>
              </fieldset>
            </>
          ) : (
            <>
              <Campo label="Empresa" requerido error={errores.empresa}>
                <input ref={primero} type="text" value={form.empresa}
                  aria-invalid={!!errores.empresa}
                  onInput={(e) => set('empresa', e.currentTarget.value)}
                  autoComplete="organization" />
              </Campo>
              <Campo label="Contacto">
                <input type="text" value={form.contacto}
                  onInput={(e) => set('contacto', e.currentTarget.value)}
                  autoComplete="name" />
              </Campo>
              <Campo label="Mail" error={errores.email}>
                <input type="email" value={form.email} aria-invalid={!!errores.email}
                  onInput={(e) => set('email', e.currentTarget.value)}
                  autoComplete="email" />
              </Campo>
              <Campo label="Perfil">
                <select value={form.perfil} onChange={(e) => set('perfil', e.currentTarget.value)}>
                  <option value="">Sin asignar</option>
                  {perfiles.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Campo>
              <Campo label="Área">
                <select value={form.area} onChange={(e) => set('area', e.currentTarget.value)}>
                  <option value="">Sin área</option>
                  {areas.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </Campo>
              <Campo label="Etapa">
                <select value={form.grupo} onChange={(e) => set('grupo', e.currentTarget.value)}>
                  {GRUPOS.map((g) => <option key={g.key} value={g.key}>{g.key}</option>)}
                </select>
              </Campo>
              <Campo label="Próxima acción">
                <input type="text" value={form.proxima_accion}
                  onInput={(e) => set('proxima_accion', e.currentTarget.value)} />
              </Campo>
              <Campo label="Próxima fecha">
                <input type="date" value={form.proxima_fecha}
                  onInput={(e) => set('proxima_fecha', e.currentTarget.value)} />
              </Campo>
              <Campo label="Notas">
                <textarea rows={3} value={form.notas} onInput={(e) => set('notas', e.currentTarget.value)} />
              </Campo>
            </>
          )}
        </div>

        {aviso && (
          <p class={`alta-aviso${aviso.tipo === 'bloquea' ? ' es-error' : ''}`} role="status">
            {aviso.texto}
          </p>
        )}

        <footer class="alta-acciones">
          <button type="button" class="btn btn-secundario" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </button>
          <button type="submit" class="btn btn-primario" disabled={enviando}>
            {enviando ? 'Creando…' : aviso?.tipo === 'duplicados' ? 'Crear igual' : 'Crear'}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
