// URLs públicas de Neon (no son secretos). Toda la seguridad la pone Postgres: RLS + grants.
export const NEON_AUTH_URL =
  'https://ep-delicate-bar-b69lex8c.neonauth.c-2.sa-east-1.aws.neon.tech/neondb/auth';
export const NEON_DATA_API_URL =
  'https://ep-delicate-bar-b69lex8c.apirest.c-2.sa-east-1.aws.neon.tech/neondb/rest/v1';

// Perfil que se muestra por defecto en Seguimiento (y en el resumen del Inicio).
export const PERFIL_DEFAULT = 'Santiago Paoletta';
