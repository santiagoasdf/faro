import { Icon, Wordmark } from './ui.jsx';

const NAV = [
  { key: 'inicio', label: 'Inicio' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'seguimiento', label: 'Seguimiento' },
  { key: 'calendario', label: 'Calendario' },
  { key: 'perfil', label: 'Perfil' },
];

export function Cabecera({ vista, nombre, ir, onSalir, onActualizar, actualizando }) {
  const link = (n, cls) => (
    <a
      key={n.key}
      href={`#/${n.key}`}
      class={cls}
      aria-current={vista === n.key ? 'page' : undefined}
      onClick={(e) => {
        e.preventDefault();
        ir(n.key);
      }}
    >
      <Icon name={n.key} size={20} />
      <span>{n.label}</span>
    </a>
  );

  return (
    <>
      <header class="cabecera">
        <div class="cabecera-in">
          <a href="#/inicio" class="cabecera-marca" onClick={(e) => { e.preventDefault(); ir('inicio'); }}>
            <Wordmark />
          </a>
          <nav class="nav-top" aria-label="Secciones">
            {NAV.map((n) => link(n, 'nav-top-link'))}
          </nav>
          <div class="cabecera-usuario">
            <button
              class="btn-icono"
              onClick={onActualizar}
              disabled={actualizando}
              aria-label="Actualizar datos"
              title="Actualizar datos"
            >
              <Icon name="actualizar" class={actualizando ? 'girando' : ''} />
            </button>
            {nombre && <span class="cabecera-nombre">{nombre}</span>}
            <button class="btn btn-fantasma btn-chico" onClick={onSalir}>
              <Icon name="salir" size={16} />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </header>
      <nav class="nav-abajo" aria-label="Secciones">
        {NAV.map((n) => link(n, 'nav-abajo-link'))}
      </nav>
    </>
  );
}
