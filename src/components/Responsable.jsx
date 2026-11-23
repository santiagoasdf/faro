import { PERSONAS, personaDeEmail } from '../calendario.js';

/** Picker Santi / Guido. No usa el `perfil` de campaña. */
export function SelectResponsable({ valor, onCambiar, id, disabled }) {
  const actual = personaDeEmail(valor)?.email || '';
  return (
    <label class="campo">
      <span class="campo-label">Responsable</span>
      <select
        id={id}
        value={actual}
        disabled={disabled}
        onChange={(e) => onCambiar(e.currentTarget.value || null)}
      >
        <option value="">Sin asignar</option>
        {PERSONAS.map((p) => (
          <option key={p.key} value={p.email}>{p.nombre}</option>
        ))}
      </select>
    </label>
  );
}

export function ChipResponsable({ email }) {
  const p = personaDeEmail(email);
  if (!p) return null;
  return <span class={`chip-persona es-${p.key}`}>{p.nombre}</span>;
}
