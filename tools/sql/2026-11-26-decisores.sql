-- Faro: sección "Decisores" (Páginas web). SOLO ADITIVO. Probado en el branch de Neon faro-test-decisores.
-- No aplicado en producción hasta el OK de Santi. Todo es idempotente salvo CREATE POLICY/TRIGGER (correr una vez).

-- 1) Columnas nuevas (la tabla decisores ya existía con 22 filas; el front actual lee decisores.* y no se rompe).
ALTER TABLE public.decisores
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS confirmado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS editado_por text,
  ADD COLUMN IF NOT EXISTS editado_web_at timestamptz;
ALTER TABLE public.negocios ADD COLUMN IF NOT EXISTS pistas_decisor text;

-- 2) Grants por columna (mismo criterio que el alta de leads)
GRANT INSERT (negocio_id, nombre, cargo, whatsapp, email, email_etiqueta, telefono, linkedin, instagram,
              fuente_url, confirmado, notas, editado_por, editado_web_at) ON public.decisores TO authenticated;
GRANT UPDATE (nombre, cargo, whatsapp, email, email_etiqueta, telefono, linkedin, instagram,
              fuente_url, confirmado, notas) ON public.decisores TO authenticated;
GRANT INSERT (pistas_decisor) ON public.negocios TO authenticated;
GRANT UPDATE (pistas_decisor) ON public.negocios TO authenticated;

-- 3) RLS: solo editores (crm_puede_editar). La lectura sigue con crm_leer (crm_es_usuario).
CREATE POLICY crm_insertar ON public.decisores FOR INSERT TO authenticated WITH CHECK (public.crm_puede_editar());
CREATE POLICY crm_editar   ON public.decisores FOR UPDATE TO authenticated
  USING (public.crm_puede_editar()) WITH CHECK (public.crm_puede_editar());

-- 4) Autor: crm_marcar_autor ahora también marca editado_por/editado_web_at en decisores.
CREATE OR REPLACE FUNCTION public.crm_marcar_autor() RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $f$
DECLARE v_email text;
BEGIN
  IF current_user <> 'authenticated' THEN RETURN NEW; END IF;
  v_email := public.crm_email();
  IF TG_TABLE_NAME IN ('negocios','seguimiento_leads','decisores') THEN
    NEW.editado_por := v_email; NEW.editado_web_at := now();
  ELSIF TG_TABLE_NAME IN ('interacciones','crm_notas') THEN
    NEW.autor_email := v_email;
  END IF;
  RETURN NEW;
END $f$;
CREATE TRIGGER decisores_crm_autor        BEFORE UPDATE ON public.decisores FOR EACH ROW EXECUTE FUNCTION public.crm_marcar_autor();
CREATE TRIGGER decisores_crm_autor_insert BEFORE INSERT ON public.decisores FOR EACH ROW EXECUTE FUNCTION public.crm_marcar_autor();

-- 5) Backfill SIN inventar nada.
-- 5a) WhatsApp del decisor: solo si su teléfono es el mismo número que ya figura como WhatsApp del negocio
--     (negocios.whatsapp). "confirmado" = la nota ya dice que fue verificado en fuente propia.
UPDATE public.decisores d SET
  whatsapp = CASE WHEN n.whatsapp ~* 'wa\.link/udlu37' THEN 'https://wa.link/udlu37'
                  ELSE btrim(split_part(n.whatsapp, '(', 1)) END,
  confirmado = (coalesce(d.notas,'') ~* 'verificad')
FROM public.negocios n
WHERE n.id = d.negocio_id AND coalesce(n.whatsapp,'') <> '' AND coalesce(d.telefono,'') <> ''
  AND right(regexp_replace(d.telefono,'\D','','g'),10) = right(regexp_replace(n.whatsapp,'\D','','g'),10)
  AND d.whatsapp IS NULL;
-- 5b) Pistas: las líneas de negocios.notas donde Mapin ya anotó nombres de pila/"no cargo decisor" (se copian tal cual,
--     sin citas de reseñas) para los negocios que no tienen decisores cargados.
UPDATE public.negocios n SET pistas_decisor = (
  SELECT string_agg(btrim(m[1]), E'\n')
  FROM regexp_matches(n.notas, '([^\n]*(?:decisor|dueñ[oa]|titular|propietari)[^\n]*)', 'gi') AS m
  WHERE m[1] !~ '^\s*-\s' AND m[1] !~ '«')
WHERE NOT EXISTS (SELECT 1 FROM public.decisores d WHERE d.negocio_id = n.id)
  AND n.pistas_decisor IS NULL AND n.notas ~* '(decisor|dueño|dueña|titular|propietari)';
