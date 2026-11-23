import { urlCelebe, urlLinkedin } from '../calendario.js';
import { Icon } from './ui.jsx';

/** Íconos a cele.be y LinkedIn: solo si hay una URL real. */
export function EnlacesFaro({ item, class: cls = '' }) {
  const cele = urlCelebe(item);
  const li = urlLinkedin(item);
  if (!cele && !li) return null;
  return (
    <span class={`enlaces-faro ${cls}`} onClick={(e) => e.stopPropagation()}>
      {cele && (
        <a class="enlace-faro" href={cele} target="_blank" rel="noopener noreferrer" title="Abrir en cele.be">
          <Icon name="externo" size={14} />
          <span>cele.be</span>
        </a>
      )}
      {li && (
        <a class="enlace-faro" href={li} target="_blank" rel="noopener noreferrer" title="Perfil de LinkedIn">
          <Icon name="linkedin" size={14} />
          <span>LinkedIn</span>
        </a>
      )}
    </span>
  );
}
