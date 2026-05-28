// Genera un documento Word (.docx) con la propuesta de APOPS Siempre
// para presentar al cliente. Sigue la estructura del template provisto
// + lo adapta a lo que realmente hace la app + roadmap.
//
// Uso: npx --package docx --package tsx tsx scripts/generar-propuesta-docx.ts

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx'
import { writeFileSync } from 'node:fs'

const BRAND_BLUE = '1F72B8'
const INK = '14213D'
const MUTED = '6B7280'

// =====================================================================
// Helpers de estilo
// =====================================================================

function h1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 36,
        color: BRAND_BLUE,
        font: 'Calibri',
      }),
    ],
  })
}

function h2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 140 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 28,
        color: INK,
        font: 'Calibri',
      }),
    ],
  })
}

function h3(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 24,
        color: BRAND_BLUE,
        font: 'Calibri',
      }),
    ],
  })
}

function p(text: string, opts: { italic?: boolean } = {}): Paragraph {
  return new Paragraph({
    spacing: { after: 140, line: 320 },
    children: [
      new TextRun({
        text,
        size: 22,
        color: INK,
        font: 'Calibri',
        italics: opts.italic,
      }),
    ],
  })
}

function pBold(prefix: string, rest: string): Paragraph {
  return new Paragraph({
    spacing: { after: 140, line: 320 },
    children: [
      new TextRun({
        text: prefix,
        bold: true,
        size: 22,
        color: INK,
        font: 'Calibri',
      }),
      new TextRun({
        text: rest,
        size: 22,
        color: INK,
        font: 'Calibri',
      }),
    ],
  })
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80, line: 300 },
    children: [
      new TextRun({
        text,
        size: 22,
        color: INK,
        font: 'Calibri',
      }),
    ],
  })
}

function bulletWithBold(boldPart: string, rest: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80, line: 300 },
    children: [
      new TextRun({
        text: boldPart,
        bold: true,
        size: 22,
        color: INK,
        font: 'Calibri',
      }),
      new TextRun({
        text: rest,
        size: 22,
        color: INK,
        font: 'Calibri',
      }),
    ],
  })
}

function quote(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 200, line: 320 },
    indent: { left: 480 },
    border: {
      left: {
        color: BRAND_BLUE,
        space: 12,
        style: BorderStyle.SINGLE,
        size: 18,
      },
    },
    children: [
      new TextRun({
        text,
        italics: true,
        size: 22,
        color: MUTED,
        font: 'Calibri',
      }),
    ],
  })
}

function tableComparativa(): Table {
  const headerCell = (text: string) =>
    new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      shading: { fill: BRAND_BLUE },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text,
              bold: true,
              color: 'FFFFFF',
              size: 22,
              font: 'Calibri',
            }),
          ],
        }),
      ],
    })

  const bodyCell = (text: string) =>
    new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      children: [
        new Paragraph({
          spacing: { line: 280 },
          children: [
            new TextRun({ text, size: 21, color: INK, font: 'Calibri' }),
          ],
        }),
      ],
    })

  const rows = [
    ['Hoy (sin app)', 'Con APOPS Siempre'],
    [
      'Avisos por mail que se pierden en la bandeja',
      'Notificaciones directas al celular con tasa de lectura medida',
    ],
    [
      'Carteles en el edificio que pocos leen',
      'Novedades en la app, accesibles también desde la página pública',
    ],
    [
      'WhatsApp del delegado se inunda',
      'Hilos 1-a-1 ordenados, con historial completo y respuestas',
    ],
    [
      'La CD no sabe cuántos leyeron lo que mandó',
      'Tasa de lectura en vivo (objetivo 60-80%)',
    ],
    [
      'El delegado no ve quiénes no son APOPS en su edificio',
      'Vista completa del edificio con filtros por gremio',
    ],
    [
      'Afiliación: trámite presencial con papeles',
      'Wizard online de 3 pasos con firma digital y PDF por mail',
    ],
    [
      '11.000 cotizantes ANSES no-APOPS son invisibles',
      'Página pública con noticias y formulario de afiliación abiertos',
    ],
  ]

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      (r, i) =>
        new TableRow({
          children: r.map((c) => (i === 0 ? headerCell(c) : bodyCell(c))),
        }),
    ),
  })
}

// =====================================================================
// Contenido del documento
// =====================================================================

const doc = new Document({
  creator: 'APOPS Siempre',
  title: 'Propuesta APOPS Siempre',
  description: 'Propuesta de aplicación móvil para el gremio APOPS',
  styles: {
    default: {
      document: { run: { font: 'Calibri', size: 22 } },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1000, right: 1100, bottom: 1000, left: 1100 },
        },
      },
      children: [
        // ─── Portada ───────────────────────────────────────────────
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 1200, after: 200 },
          children: [
            new TextRun({
              text: 'APOPS Siempre',
              bold: true,
              size: 64,
              color: BRAND_BLUE,
              font: 'Calibri',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: 'Propuesta de aplicación móvil para el gremio APOPS',
              size: 28,
              color: INK,
              font: 'Calibri',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
          children: [
            new TextRun({
              text: 'Asociación del Personal de los Organismos de Previsión Social',
              italics: true,
              size: 22,
              color: MUTED,
              font: 'Calibri',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 1200 },
          children: [
            new TextRun({
              text: 'Estado al 16 de mayo de 2026',
              size: 20,
              color: MUTED,
              font: 'Calibri',
            }),
          ],
        }),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 1. Objetivo ───────────────────────────────────────────
        h1('1. Objetivo'),
        p(
          'Desarrollar una aplicación moderna que mejore la experiencia ' +
            'del afiliado del gremio APOPS, simplifique la comunicación ' +
            'entre la Comisión Directiva, los delegados y los afiliados, ' +
            'agilice los trámites como la afiliación online, y permita a ' +
            'la CD medir el impacto real de sus comunicaciones a través ' +
            'de métricas vivas.',
        ),
        p(
          'A diferencia de otras propuestas, APOPS Siempre amplía su ' +
            'alcance también a los cotizantes de ANSES que aún no son ' +
            'afiliados APOPS, sirviendo como herramienta concreta de ' +
            'captación y crecimiento del gremio.',
        ),

        // ─── 2. Problema Actual ────────────────────────────────────
        h1('2. Problema actual'),
        p(
          'El gremio enfrenta cinco problemas concretos que la digitalización resuelve:',
        ),
        bulletWithBold(
          'Comunicación interna deficiente: ',
          'los avisos por mail se pierden en la bandeja, los carteles en los edificios no se leen, y el WhatsApp del delegado se inunda con otras conversaciones. La mitad de los afiliados se entera tarde o no se entera.',
        ),
        bulletWithBold(
          'Sin métricas: ',
          'la CD no sabe quién leyó cada comunicado, qué delegados están activos, qué temas interesan más a los afiliados. Las decisiones se toman por intuición, no por datos.',
        ),
        bulletWithBold(
          'Trámites presenciales: ',
          'afiliarse hoy requiere ir a la sede, completar papeles, esperar. Eso desincentiva a quien no es APOPS pero querría asociarse.',
        ),
        bulletWithBold(
          '11.000 cotizantes ANSES invisibles: ',
          'la mayoría del personal de ANSES no es APOPS todavía. El gremio no tiene cómo llegarles directamente para contarles qué hace, qué consigue en paritarias, qué beneficios ofrece.',
        ),
        bulletWithBold(
          'Delegados sin herramientas: ',
          'el delegado de cada edificio no tiene una vista clara de quiénes son los compañeros que aún no son APOPS — los principales candidatos a invitar.',
        ),

        // ─── 3. Propuesta ──────────────────────────────────────────
        h1('3. Propuesta'),
        p(
          'APOPS Siempre es una aplicación web instalable en cualquier ' +
            'celular (PWA - Progressive Web App), accesible sin necesidad ' +
            'de Play Store ni App Store. Centraliza los servicios del ' +
            'gremio, ofrece a la Comisión Directiva un termómetro de uso ' +
            'en vivo, y abre la comunicación del gremio a toda la ' +
            'comunidad ANSES — no solo a los afiliados APOPS actuales.',
        ),
        p(
          'Está pensada mobile-first: la mayoría de los afiliados va a ' +
            'entrar desde el celular, así que cada pantalla está ' +
            'optimizada para esa experiencia. También funciona desde ' +
            'computadora con la misma funcionalidad.',
        ),

        h3('Antes vs. después de la app'),
        tableComparativa(),

        new Paragraph({ children: [new PageBreak()] }),

        // ─── 4. Funcionalidades operativas ─────────────────────────
        h1('4. Funcionalidades operativas (ya en producción)'),
        p(
          'A continuación se detalla todo lo que la aplicación ya hace, ' +
            'agrupado por tipo de usuario.',
        ),

        h2('Para el afiliado / la afiliada'),
        bullet('Credencial digital propia y de cada miembro del grupo familiar (cónyuge, hijos).'),
        bullet('Compartir credencial por WhatsApp con un toque (link público a la vista, sin requerir registro del destinatario).'),
        bullet('Recepción de notificaciones directas del delegado del edificio o de la Comisión Directiva.'),
        bullet('Feed de novedades del gremio en el home.'),
        bullet('Botón de contacto siempre visible (WhatsApp, email, llamar) con plantilla pre-cargada.'),
        bullet('Instalable en el celular como cualquier app del sistema operativo.'),

        h2('Para el delegado / la delegada'),
        bullet('Vista completa de su edificio: TODAS las personas del padrón ANSES de los edificios que representa, no solo los afiliados a APOPS.'),
        bullet('Buscador por nombre, DNI o legajo.'),
        bullet('Filtros por gremio (APOPS, ATE, UPCN, SECASFPI, jubilados, sin gremio).'),
        bullet('Identificación inmediata de los candidatos a captación (no-APOPS).'),
        bullet('Hilos de comunicación bidireccional con la Comisión Directiva.'),
        bullet('Alertas automáticas cuando hay altas o bajas en su edificio (al cargarse el padrón nuevo).'),
        bullet('Plantillas WhatsApp para saludos de eventos del mes (cumpleaños, aniversarios de afiliación).'),
        bullet('Mensaje de bienvenida automático solo cuando la persona es APOPS (a no-afiliados se mostraría una invitación, mensaje distinto).'),

        h2('Para la Comisión Directiva'),
        bullet('Panel admin con gestión de novedades (crear, editar, eliminar con confirmación).'),
        bullet('Carga del padrón ANSES desde Excel mensual, con histórico de snapshots preservado.'),
        bullet('Dashboard con 7 vistas: Resumen, Padrón, Evolución, Eventos del mes, Delegados, Uso, Altas/Bajas.'),
        bulletWithBold(
          'Tab "Uso" (el termómetro): ',
          'adopción global, tasa de lectura por canal, top delegados activos, listado accionable de inactivos, lo que llega a la CD.',
        ),
        bullet('Procesamiento de solicitudes de afiliación online recibidas con un click (aprobar / rechazar con motivo, auditado).'),
        bullet('Métricas comparables mes a mes.'),
        bullet('Mapa de Argentina con choropleth + heatmap de edificios.'),

        h2('Afiliación online'),
        bullet('Wizard guiado en 3 pasos: datos obligatorios mínimos → datos opcionales colapsados → resumen + firma digital + envío.'),
        bullet('Firma digital con el dedo (celular) o el mouse (computadora).'),
        bullet('PDF generado server-side con todos los datos completos + firma embebida.'),
        bullet('Envío automático del PDF a tres destinatarios: al aspirante (acuse de recibo), a la CD (para procesarlo) y al delegado del edificio declarado (para que esté en conocimiento).'),

        h2('Para toda la comunidad ANSES'),
        bullet('Página principal pública sin necesidad de login. Cualquier cotizante de ANSES puede entrar y ver las novedades.'),
        bullet('Página /noticias con el listado completo, también pública.'),
        bullet('Cada noticia individual accesible y compartible por su link directo (apto para difusión por WhatsApp orgánico).'),
        bullet('Botón "Afiliarme" siempre visible desde la landing.'),
        bullet('Botón "Instalar app" en el header para captación.'),

        new Paragraph({ children: [new PageBreak()] }),

        // ─── 5. Beneficios para el Sindicato ───────────────────────
        h1('5. Beneficios para el sindicato'),
        bullet('Reducción significativa de atención telefónica y presencial.'),
        bullet('Mayor cobertura comunicacional con métricas concretas medibles.'),
        bullet('Captación de cotizantes ANSES no-APOPS como crecimiento real del gremio.'),
        bullet('Mejora de la imagen institucional con presencia digital moderna.'),
        bullet('Digitalización de procesos clave: afiliación, padrón, comunicación interna.'),
        bullet('Datos en vivo para que la Comisión Directiva tome decisiones con evidencia.'),
        bullet('Sin costos de publicación en tiendas (Play Store: USD 25 una vez; App Store: USD 99 por año — ninguno aplica para PWA).'),
        bullet('Actualizaciones automáticas para todos los usuarios sin intervención manual.'),
        bullet('Mayor transparencia y comunicación entre CD, delegados y afiliados.'),

        // ─── 6. Diferencial ────────────────────────────────────────
        h1('6. Diferencial'),
        p(
          'APOPS Siempre no es solo una aplicación de credencial digital. Es una infraestructura de comunicación bidireccional que se distingue por cuatro decisiones de diseño:',
        ),
        bulletWithBold(
          'Sirve a dos públicos a la vez: ',
          'afiliados APOPS con experiencia completa (login + credencial + comunicación + perfil) y comunidad ANSES con contenido público (noticias + afiliación online).',
        ),
        bulletWithBold(
          'Termómetro vivo para la CD: ',
          'el tab "Uso" del dashboard mide adopción, tasa de lectura, engagement de delegados y comunicación entrante. Ningún otro sistema gremial ofrece esta visibilidad.',
        ),
        bulletWithBold(
          'Equipa al delegado: ',
          'la vista completa del edificio con filtros por gremio le permite identificar oportunidades de captación que hoy no tiene cómo ver.',
        ),
        bulletWithBold(
          'Trazabilidad legal: ',
          'cada afiliación online queda con firma digital embebida y PDF auditable distribuido a tres destinatarios. Defensible ante cualquier consulta posterior.',
        ),

        new Paragraph({ children: [new PageBreak()] }),

        // ─── 7. Roadmap ────────────────────────────────────────────
        h1('7. Roadmap — Funcionalidades para pensar más adelante'),
        p(
          'Las siguientes funcionalidades están planeadas pero todavía no operativas. Algunas tienen la infraestructura técnica lista y solo dependen de configuración o decisión de negocio; otras requieren desarrollo nuevo.',
        ),

        h2('Corto plazo (próximas semanas)'),
        bulletWithBold(
          'Notificaciones push reales al celular: ',
          'la infraestructura está completamente deployada. Solo falta cargar 3 variables de entorno en el servidor.',
        ),
        bulletWithBold(
          'Email automático con el PDF firmado de la afiliación: ',
          'el código genera el PDF y dispara los envíos. Falta crear la cuenta del servicio de mail y verificar el dominio "apops.org.ar" en DNS.',
        ),
        bulletWithBold(
          'Rol "Publicador de noticias": ',
          'para que la CD delegue la comunicación a la Secretaría de Prensa sin dar acceso al padrón ni a las afiliaciones.',
        ),
        bulletWithBold(
          'Tests automatizados end-to-end: ',
          'cobertura completa del flujo del afiliado, del delegado y del admin con Playwright.',
        ),

        h2('Mediano plazo (próximos meses)'),
        bulletWithBold(
          'Delegados regionales: ',
          'rol intermedio con varios edificios bajo su cargo y vista agregada por región.',
        ),
        bulletWithBold(
          'Tracking de pantallas por perfil: ',
          'medir qué contenido le interesa más a cada tipo de usuario para mejorar la estrategia editorial.',
        ),
        bulletWithBold(
          'Autogestión de adherentes: ',
          'que el titular pueda agregar o editar sus familiares directamente desde la app, sin pasar por administración.',
        ),
        bulletWithBold(
          'Cartilla médica con búsqueda y geolocalización: ',
          'listado de prestadores filtrable por especialidad y cercanía con el afiliado.',
        ),
        bulletWithBold(
          'Acceso integrado a beneficios, descuentos y turismo: ',
          'directorio de comercios adheridos + sistema de reserva en complejos turísticos del gremio.',
        ),
        bulletWithBold(
          'Solicitud y administración de turnos: ',
          'reserva online de turnos para sede, asesoramiento jurídico, atención del gremio.',
        ),
        bulletWithBold(
          'Cumplimiento de protección de datos personales: ',
          'políticas de retención + consentimiento explícito en formularios.',
        ),

        h2('Largo plazo (próximo año)'),
        bulletWithBold(
          'Aplicaciones móviles nativas (iOS / Android): ',
          'si el uso lo justifica. La PWA cubre el 95% del caso actual.',
        ),
        bulletWithBold(
          'Sistema de votación interna del gremio: ',
          'asambleas digitales con identificación segura del votante.',
        ),
        bulletWithBold(
          'Asistente virtual con inteligencia artificial: ',
          'chatbot que responde consultas frecuentes sobre días de pago, trámites, beneficios.',
        ),
        bulletWithBold(
          'Integración con APIs de ANSES: ',
          'validación automatizada de cambios en el padrón sin tener que cargar Excel mensual.',
        ),
        bulletWithBold(
          'Consulta de recibos, aportes y convenios: ',
          'integrada con el sistema de RRHH del gremio para que cada afiliado vea su histórico financiero.',
        ),
        bulletWithBold(
          'Sistema de reclamos digitales: ',
          'flujo formal de presentación de reclamos con seguimiento en tiempo real.',
        ),

        new Paragraph({ children: [new PageBreak()] }),

        // ─── 8. ¿Cómo se instala y actualiza? ──────────────────────
        h1('8. ¿Cómo se instala y se actualiza?'),
        p(
          'APOPS Siempre es una PWA (Progressive Web App). No se descarga desde la Play Store ni la App Store — se instala desde el mismo navegador en un toque y se actualiza sola.',
        ),

        h2('Instalación en celular Android'),
        bullet('Entrar a apops.vercel.app en Chrome.'),
        bullet('Chrome muestra un banner "Instalar app" en la parte inferior, o tocar el botón "Instalar" del header de la app.'),
        bullet('Confirmar. El ícono APOPS queda en la pantalla principal, como cualquier otra app.'),
        bullet('Tiempo total: aproximadamente 10 segundos.'),

        h2('Instalación en iPhone / iPad'),
        bullet('Entrar a apops.vercel.app en Safari (no Chrome ni Firefox en iOS).'),
        bullet('Tocar el botón Compartir (cuadrado con flecha hacia arriba, en la barra inferior).'),
        bullet('Deslizar hacia abajo y elegir "Agregar a pantalla de inicio".'),
        bullet('Tocar "Agregar" en la esquina superior derecha.'),
        bullet('La app aparece en el menú de aplicaciones como cualquier otra.'),

        h2('Instalación en computadora'),
        bullet('Entrar a apops.vercel.app en Chrome, Edge o Brave.'),
        bullet('Aparece un ícono de instalación en la barra de direcciones, o usar el menú con "Instalar APOPS Siempre".'),
        bullet('La app queda como ventana independiente, listada entre las aplicaciones del sistema operativo.'),

        h2('Actualización automática'),
        p(
          'No requiere acción del usuario. Cada vez que se abre la aplicación, el navegador chequea en background si hay versión nueva y la descarga silenciosamente. En el siguiente uso la versión actualizada está disponible.',
        ),
        p(
          'A diferencia de las apps nativas, no hay "Update now" como en Play Store, no hay versiones desactualizadas circulando, no hay riesgo de que un usuario quede con una versión vieja. Todos siempre tienen la última versión.',
        ),

        // ─── 9. Conclusión ─────────────────────────────────────────
        h1('9. Conclusión'),
        p(
          'APOPS Siempre demuestra que es posible modernizar la relación entre el gremio y sus afiliados sin grandes inversiones de infraestructura ni dependencia de tiendas de aplicaciones. La base está operativa en producción, con más de 15.500 cotizantes del padrón ANSES gestionados y un termómetro vivo del uso.',
        ),
        p(
          'La propuesta no busca crear únicamente una aplicación institucional, sino una herramienta de servicio real centrada en las necesidades cotidianas del afiliado, equipando a los delegados con información que hoy no tienen, dando a la Comisión Directiva visibilidad de impacto, y ampliando el alcance comunicacional a toda la comunidad ANSES.',
        ),
        quote(
          '"Esta no es una app de moda ni un gadget. Es la infraestructura digital que el gremio necesita para los próximos 10 años: comunicación directa al afiliado, visibilidad para captar a los 11.000 cotizantes ANSES que todavía no son APOPS, datos en vivo para decidir con evidencia, y trámites digitales que ANSES y otros gremios ya van a empezar a exigir."',
        ),
        p(
          'El próximo paso es decidir el rollout oficial y planificar la incorporación progresiva de las funcionalidades del roadmap.',
        ),
      ],
    },
  ],
})

Packer.toBuffer(doc).then((buffer) => {
  const outPath = 'Propuesta-APOPS-Siempre.docx'
  writeFileSync(outPath, buffer)
  console.log(`✓ Documento generado: ${outPath}`)
  console.log(`  (abrilo con Word o Google Docs)`)
})
