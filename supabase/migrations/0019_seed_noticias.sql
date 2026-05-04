-- Migration: 0019_seed_noticias
-- Feature: 002-noticias-y-roles
-- Created: 2026-05-04
--
-- Datos de muestra para que la landing tenga contenido visible.
-- En producción se reemplaza por las noticias reales que cargue el admin.

INSERT INTO noticias (titulo, resumen, contenido, destacada, publicada_at, autor) VALUES
(
  'Paritaria 2026: nueva propuesta salarial',
  'La comisión negociadora presentó la última propuesta de la paritaria. Te contamos los detalles y los próximos pasos.',
  'En la reunión paritaria del jueves, la comisión negociadora presentó una nueva propuesta salarial que incluye un incremento escalonado y bonos por presentismo. La propuesta fue puesta en consideración de la asamblea. Los detalles se discutirán en la próxima reunión de delegados.',
  true,
  now() - interval '2 hours',
  'Comisión Directiva'
),
(
  'Asamblea general — convocatoria',
  'Te invitamos a la asamblea general del próximo viernes a las 18 hs en la sede del gremio. Se tratarán temas centrales de la agenda 2026.',
  'La Comisión Directiva convoca a todos los afiliados y afiliadas a la asamblea general del viernes 15 de mayo a las 18:00 hs en la sede del gremio. Orden del día: balance del primer cuatrimestre, paritaria, situación de jubilados, comunicación interna y otros.',
  false,
  now() - interval '1 day',
  'Secretaría General'
),
(
  'Servicio de turismo: nuevos convenios',
  'Sumamos nuevos hoteles y complejos turísticos al beneficio de afiliados y afiliadas para la temporada 2026.',
  'Logramos cerrar convenios con tres nuevos complejos en la costa argentina y dos en Córdoba. Las reservas se gestionan desde la Secretaría de Turismo presentando carnet de afiliado actualizado.',
  false,
  now() - interval '3 days',
  'Secretaría de Turismo'
),
(
  'Capacitación gratuita: ANSES y trámites digitales',
  'Curso virtual abierto a toda la afiliación sobre los nuevos trámites digitales de ANSES. Inscripciones abiertas.',
  'En el marco del convenio con la Universidad Nacional, ofrecemos un curso virtual gratuito de 4 encuentros sobre los nuevos sistemas de ANSES. Cupos limitados. Inscripciones por la web del gremio.',
  false,
  now() - interval '5 days',
  'Secretaría de Capacitación'
);
