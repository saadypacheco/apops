# Feature Specification: Registro y autenticación de afiliados

**Feature Branch**: `001-afiliado-auth`
**Created**: 2026-05-01
**Status**: Draft
**Input**: User description: "Registro y login de afiliados con dos flujos: afiliado activo (DNI + legajo, validación contra padrón ANSES, magic link); afiliado sin legajo (solo DNI, validación contra padrón no-activos, magic link, estado pendiente_validacion si no encuentra). Ver AGENTS.md §5 para el detalle."

## Clarifications

### Session 2026-05-01

- Q: Fuente y mecanismo de actualización del padrón de afiliados activos → A: Snapshot CSV/Excel cargado periódicamente por administrador. La feature de carga del padrón es precursora a esta y queda fuera de su alcance.
- Q: Existencia del padrón de afiliados no-activos → A: ~~Existe en formato CSV/Excel limpio, similar al padrón de activos~~ **(superseded por Q4 más abajo: no hay padrón separado de no-activos; los jubilados afiliados se identifican por la columna `cotiza_papel` en el mismo padrón único de cotizantes).**
- Q: Datos mínimos que necesita el administrador para validar manualmente una solicitud pendiente_validacion → A: Depende del sub-flujo de origen. (a) Si la persona venía del flujo activo (con legajo): se persiste **legajo + DNI + email**. (b) Si venía del flujo "no tengo legajo": se persiste **DNI + nombre completo + email**. El email se captura en ambos sub-flujos porque el admin lo usa para enviar la confirmación de alta y los pasos de ingreso al sistema una vez aprobada la solicitud.
- Q: Estructura del padrón y tipos válidos de afiliado → A: Una sola tabla `padron_cotizantes` (no dos padrones separados). Solo dos tipos válidos de afiliado APOPS: **`activo`** (trabajador con `APOPS = x` en padrón, paga cuota por descuento de haberes) y **`jubilado`** (jubilado con `cotiza_papel = x`, paga cuota por transferencia). El tipo `ex_empleado` se elimina del modelo: renunciar sin jubilarse no es vía válida para mantener afiliación APOPS. Personas en padrón con afiliación a otro gremio (ATE/SEC/UPCN/SECASFPI) o sin afiliación quedan en `pendiente_validacion`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Afiliado activo se registra e ingresa por primera vez (Priority: P1)

Una persona que actualmente trabaja en ANSES y figura en el padrón gremial activo
quiere usar la app por primera vez. Tiene su DNI y legajo a mano. Ingresa esos
datos en una pantalla simple, el sistema valida contra el padrón, le pide su
email, le envía un enlace mágico al correo, y al hacer clic queda autenticada
como afiliada.

**Why this priority**: es el flujo de la mayoría de la audiencia inicial
(trabajadores activos de ANSES). Sin este flujo, el producto no atiende al
público principal.

**Independent Test**: con un DNI y legajo válidos del padrón activo, una persona
puede completar el registro de extremo a extremo y quedar autenticada en la app
sin asistencia. Verificable: el usuario llega a la pantalla principal autenticado.

**Acceptance Scenarios**:

1. **Given** DNI y legajo que existen en el padrón **con `APOPS = x`**, **When**
   la persona los ingresa correctamente y luego ingresa un email válido,
   **Then** recibe un enlace mágico en ese email y al hacer clic queda
   autenticada en la app con tipo `activo` y rol `afiliado`.
2. **Given** DNI y legajo que coinciden en padrón pero **sin `APOPS = x`**
   (ej: cotiza a otro gremio como ATE/SEC/UPCN/SECASFPI), **When** la persona
   los ingresa, **Then** la solicitud queda en `pendiente_validacion` con
   mensaje claro tipo "Estamos verificando tu afiliación APOPS, te
   avisaremos por email", **sin** filtrar a qué gremio cotiza la persona.
3. **Given** DNI o legajo que no coinciden con ningún registro en el padrón,
   **When** la persona los ingresa, **Then** ve un mensaje claro y no
   técnico explicando que no se encontró su legajo y se le ofrece visiblemente
   el flujo alternativo "No tengo legajo".
4. **Given** una persona ya autenticada, **When** vuelve a abrir la app más
   tarde en el mismo dispositivo, **Then** sigue autenticada sin necesidad de
   reingresar credenciales.

---

### User Story 2 — Jubilado afiliado APOPS entra sin legajo (Priority: P1)

Una persona jubilada que mantuvo su afiliación APOPS pagando cuota por
transferencia (en el padrón figura con `cotiza_papel = x`) ya no tiene legajo
activo. Necesita acceder a la app. Encuentra una opción visible "No tengo
legajo", ingresa solo su DNI, el sistema lo valida contra el padrón
verificando que `cotiza_papel = x`, le pide email, y entra como `tipo=jubilado`.

**Why this priority**: misma prioridad que US1. Es la única forma de incluir
a los jubilados afiliados, que están explícitamente en el alcance del
producto y son una parte significativa de la base de afiliados.

**Independent Test**: con un DNI presente en el padrón con marca
`cotiza_papel = x`, una persona puede completar el registro alternativo de
extremo a extremo y quedar autenticada con `tipo = jubilado`.

**Acceptance Scenarios**:

1. **Given** un DNI presente en el padrón con `cotiza_papel = x`, **When**
   la persona elige "No tengo legajo", ingresa su DNI y luego un email válido,
   **Then** recibe el enlace mágico, queda autenticada con `tipo = jubilado`
   y rol `afiliado`, y la app aplica las consideraciones de accesibilidad
   reforzada propias del tipo `jubilado`.
2. **Given** un DNI presente en el padrón pero **sin** `cotiza_papel = x`
   (ej: es trabajador activo, o cotiza a otro gremio), **When** la persona
   elige "No tengo legajo" e ingresa ese DNI, **Then** la solicitud queda en
   `pendiente_validacion` (NO recibe enlace mágico) porque no se confirma
   afiliación APOPS por la vía sin legajo.
3. **Given** la persona se equivocó al ingresar el DNI, **When** corrige el
   error y reintenta, **Then** el sistema acepta el reintento sin penalización
   (dentro del límite anti-abuso).

---

### User Story 3 — Afiliado no encontrado en padrón queda pendiente de validación (Priority: P2)

Una persona que cree estar afiliada pero no figura en ningún padrón intenta
registrarse. El sistema captura su intento (con datos diferentes según el
sub-flujo de origen), lo marca como pendiente, le informa que su solicitud está
en revisión, y notifica a un administrador para que la valide manualmente desde
su consola. La persona NO obtiene acceso automático.

**Why this priority**: es un edge case importante pero no bloqueante para el
MVP — la mayoría de los afiliados deberían estar en padrón. Sin embargo, el
manejo claro evita frustración y previene accesos no autorizados.

**Independent Test**: con un DNI inexistente en ambos padrones, la persona
completa el sub-flujo correspondiente, queda registrada como
`pendiente_validacion` con los datos requeridos según su sub-flujo, y un
administrador puede ver la solicitud en su cola con la información necesaria
para validarla.

**Acceptance Scenarios**:

1. **Given** una persona ingresa DNI + legajo en el flujo activo y la
   combinación NO se encuentra en el padrón de activos, **When** confirma su
   email, **Then** queda persistida como `pendiente_validacion` con `legajo +
   DNI + email`, ve un mensaje claro tipo "Estamos revisando tu solicitud
   manualmente, te avisaremos por email cuando esté resuelta", y NO recibe
   enlace mágico automáticamente.
2. **Given** una persona elige "No tengo legajo" e ingresa DNI que NO se
   encuentra en el padrón de no-activos, **When** el sistema le solicita
   **nombre completo** y luego email, **Then** queda persistida como
   `pendiente_validacion` con `DNI + nombre completo + email`, ve el mismo
   mensaje claro y NO recibe enlace mágico automáticamente.
3. **Given** un afiliado en estado `pendiente_validacion`, **When** un
   administrador aprueba la solicitud manualmente desde su consola, **Then**
   se envía al email registrado un mensaje con la confirmación del alta y
   los pasos para ingresar al sistema (incluyendo enlace mágico para completar
   el login).
4. **Given** un afiliado en `pendiente_validacion`, **When** un administrador
   rechaza la solicitud, **Then** se notifica al afiliado por email con un
   motivo entendible y sin filtrar datos sensibles del padrón.

---

### Edge Cases

- **Magic link expirado o ya usado**: el sistema permite solicitar uno nuevo
  desde la pantalla de login sin tener que reingresar DNI/legajo.
- **Email ya registrado con otro DNI**: el sistema rechaza el intento con
  mensaje "este email ya está asociado a otro afiliado" sin filtrar cuál es
  ese afiliado.
- **DNI mismo en activo y no-activo simultáneamente**: el sistema prioriza el
  flujo activo (con legajo) por ser el caso normal de un trabajador en
  funciones; esto se documenta para auditoría.
- **Conectividad intermitente durante validación**: el sistema reintenta con
  feedback visible al usuario y no pierde el estado del formulario.
- **Magic link clickeado en un dispositivo distinto al que lo solicitó**:
  permitido para no penalizar a usuarios que cambian de dispositivo, pero se
  registra el evento y se notifica por email al afiliado.
- **Múltiples intentos fallidos de validación de padrón**: el sistema aplica
  un límite por DNI y por IP para prevenir fuerza bruta. El afiliado legítimo
  recibe mensaje claro y puede reintentar después de un período de espera.
- **Logout explícito**: accesible desde el perfil del usuario en máximo 2 taps,
  con confirmación clara.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST aceptar DNI argentino (numérico, 7-8 dígitos) como
  identificador primario en ambos flujos de registro.
- **FR-002**: El sistema MUST validar la combinación DNI + legajo contra el
  padrón de cotizantes en el flujo principal antes de continuar. La
  validación debe verificar que la fila correspondiente tenga
  **`APOPS = x`** para confirmar afiliación APOPS. Si la fila existe pero
  no tiene `APOPS = x` (ej: cotiza a ATE/SEC/UPCN/SECASFPI), la solicitud
  queda en `pendiente_validacion` sin filtrar al cliente a qué gremio
  cotiza la persona.
- **FR-003**: El sistema MUST presentar de forma claramente visible y
  accesible la opción "No tengo legajo" en la pantalla de inicio del flujo
  principal.
- **FR-004**: El sistema MUST validar el DNI contra el padrón de cotizantes
  cuando la persona elija el flujo "No tengo legajo", verificando que la
  fila correspondiente tenga **`cotiza_papel = x`** (que indica jubilado
  afiliado APOPS pagando por transferencia). Si el DNI existe pero sin
  `cotiza_papel = x`, la solicitud queda en `pendiente_validacion`.
- **FR-005**: El sistema MUST capturar el email del usuario únicamente
  después de una validación exitosa contra alguno de los dos padrones (con
  excepción del caso `pendiente_validacion` donde se captura sin validación
  para permitir contacto posterior).
- **FR-006**: El sistema MUST enviar un enlace mágico de un solo uso al email
  proporcionado, con un tiempo de expiración limitado.
- **FR-007**: El sistema MUST autenticar a la persona al hacer clic en el
  enlace mágico, asignando el tipo correcto: **`activo`** si la fila del
  padrón tiene `APOPS = x` (validado vía flujo con legajo), **`jubilado`**
  si tiene `cotiza_papel = x` (validado vía flujo sin legajo).
- **FR-008**: El sistema MUST asignar el rol `afiliado` a toda persona
  autenticada exitosamente. Otros roles (delegado, prensa, etc.) se asignan
  por separado y no son parte de este flujo.
  > **Nota de implementación**: en esta feature, el rol `afiliado` se
  > expresa **implícitamente** por la existencia de una fila en la tabla
  > `afiliados`. La tabla formal de roles y permisos
  > (`roles` + `usuarios_roles`) vive en una **feature posterior**
  > (referenciada como `deferred_dependency` en
  > `contracts/edge-pendiente-actions.json`). Cuando esa feature exista,
  > esta lógica se actualizará para registrar el rol explícitamente sin
  > cambiar el comportamiento observable para el afiliado.
- **FR-009**: El sistema MUST persistir la sesión autenticada de modo que la
  persona no necesite volver a ingresar credenciales en visitas sucesivas
  hasta que cierre sesión explícitamente o expire la sesión.
- **FR-010**: El sistema MUST manejar el caso de DNI no encontrado en ningún
  padrón persistiendo la solicitud como `pendiente_validacion` sin emitir
  enlace mágico automático. Los datos persistidos dependen del sub-flujo de
  origen:
  - **Sub-flujo activo** (DNI + legajo no encontrados): persistir
    `legajo + DNI + email`.
  - **Sub-flujo "no tengo legajo"** (DNI no encontrado en no-activos):
    persistir `DNI + nombre completo + email`. El sistema MUST solicitar
    nombre completo a la persona antes de capturar su email cuando el DNI
    no está en el padrón.
- **FR-011**: El sistema MUST notificar a los administradores cuando aparece
  una nueva solicitud `pendiente_validacion` para que puedan procesarla
  desde su consola con los datos requeridos según el sub-flujo de origen.
- **FR-019**: El sistema MUST enviar al email registrado, cuando el
  administrador apruebe una solicitud `pendiente_validacion`, un mensaje
  con confirmación del alta + los pasos para ingresar al sistema +
  enlace mágico para completar el primer login.
- **FR-012**: El sistema MUST mostrar mensajes de error en lenguaje claro y
  no técnico, apto para personas mayores y no técnicas. Prohíbe mostrar
  códigos de error, stack traces o tecnicismos.
- **FR-013**: El sistema MUST proteger el endpoint de validación de padrón
  contra abuso por fuerza bruta limitando intentos por DNI y por IP en una
  ventana temporal definida.
- **FR-014**: El sistema MUST proveer la opción de cerrar sesión desde el
  perfil de la persona en máximo 2 acciones (taps/clicks), con confirmación
  clara.
- **FR-015**: El sistema MUST proteger los datos personales en cumplimiento
  de la Ley 25.326: cifrado en tránsito (HTTPS), no exponer al frontend más
  datos del padrón que el estrictamente necesario para confirmar el match.
- **FR-016**: El sistema MUST hacer que cada enlace mágico expire en un
  tiempo razonable (default sugerido: 24 horas) y sea de un solo uso.
- **FR-017**: El sistema MUST permitir solicitar un nuevo enlace mágico
  cuando el anterior expire o ya haya sido usado, sin requerir reingresar
  DNI o legajo si la persona ya validó en ese dispositivo recientemente.
- **FR-018**: El sistema MUST registrar (sin exponer al usuario final) cada
  intento de validación de padrón y cada autenticación exitosa, con
  finalidad de auditoría.

### Key Entities *(include if feature involves data)*

- **Afiliado**: representa a una persona registrada en la app. Atributos
  conceptuales: DNI, legajo (opcional, solo si tipo=activo), nombre, email,
  tipo (`activo` / `jubilado`), estado (`activo` / `pendiente_validacion` /
  `baja`).
- **Padrón Cotizantes**: tabla única con todos los cotizantes a gremios
  dentro de ANSES, mantenida por el gremio y cargada periódicamente desde
  Excel/CSV. Incluye trabajadores activos y jubilados que mantienen
  afiliación. Columnas relevantes para auth: DNI, legajo (nullable para
  jubilados), nombre, **`APOPS`** (flag x si es trabajador activo afiliado
  APOPS), **`cotiza_papel`** (flag x si es jubilado afiliado APOPS pagando
  por transferencia), y otras columnas de gremios (ATE, SEC, UPCN,
  SECASFPI) y metadatos del puesto que no se usan para auth.
- **Solicitud Pendiente**: registro creado cuando alguien intentó registrarse
  y no figura en ningún padrón. Atributos comunes: DNI, email, fecha de
  solicitud, sub-flujo de origen (`activo` / `sin_legajo`), estado de revisión
  (`pendiente` / `aprobada` / `rechazada`). Atributos condicionales según
  sub-flujo: `legajo` (si vino del flujo activo) o `nombre_completo` (si vino
  del flujo "no tengo legajo").
- **Sesión Autenticada**: vínculo entre afiliado autenticado y dispositivo /
  navegador, con tiempo de expiración.
- **Enlace Mágico**: token de un solo uso emitido por email para autenticar
  al afiliado. Atributos: token, afiliado vinculado, expiración, estado
  (`activo` / `usado` / `expirado`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una persona afiliada que existe en el padrón completa el registro
  + login en menos de 90 segundos en su primer intento.
- **SC-002**: 95% de las personas que existen en padrón completan el flujo sin
  abandonar (medido por ratio de inicio vs autenticación exitosa en analítica
  interna).
- **SC-003**: Cero casos de acceso no autorizado por bypass de validación de
  padrón (verificado por auditoría de seguridad y tests automatizados).
- **SC-004**: 100% de las solicitudes en estado `pendiente_validacion` reciben
  respuesta del administrador en menos de 48 horas hábiles.
- **SC-005**: Cualquier acción del flujo (validación de padrón, envío de
  enlace mágico, autenticación final) presenta feedback visible al usuario en
  menos de 3 segundos en condiciones normales de red móvil 4G.
- **SC-006**: Cero filtraciones de datos del padrón al frontend más allá del
  match confirmado (verificado por análisis de tráfico de red en pruebas).
- **SC-007**: El flujo alternativo "No tengo legajo" es completable en menos
  de 60 segundos por una persona jubilada en su primer intento, asumiendo
  asistencia mínima.
- **SC-008**: La pantalla principal del flujo principal pasa Lighthouse
  Accessibility ≥ 90 sin asistencia de screen reader externa, medido en build
  de producción.

## Assumptions

- Los afiliados tienen acceso a un email funcional (smartphone, computadora o
  asistencia de un familiar) para recibir el enlace mágico.
- El servicio de email transaccional (SMTP o equivalente) está disponible y
  configurado en el entorno de producción.
- Los afiliados aceptan recibir un email como parte del proceso de
  autenticación. No se contempla un mecanismo alternativo (SMS, llamada) en
  el alcance de esta feature.
- El sistema asume que los administradores tienen acceso a una interfaz para
  procesar solicitudes pendientes; el detalle de esa interfaz se especifica
  en una feature aparte (panel de admin).
- Si el DNI ingresado pertenece a una persona registrada en ambos padrones
  simultáneamente (caso raro de transición), se prioriza el padrón activo.
- La duración por default de la sesión autenticada es de 30 días sin
  actividad; este valor se puede ajustar en configuración del proyecto sin
  re-spec.
- El enlace mágico expira por default en 24 horas y es de un solo uso; estos
  valores pueden ajustarse en configuración.
- Los datos del padrón nunca se exponen al frontend salvo para confirmar el
  match (devolver "encontrado" / "no encontrado" + tipo si aplica). Datos
  como nombre, fecha de nacimiento, etc., del padrón no llegan al cliente.
- El padrón único de cotizantes se ingesta al sistema mediante carga manual
  de archivo CSV/Excel por un administrador, con frecuencia periódica
  (típicamente mensual o cuando llegue una nueva exportación). El flujo de
  carga es **feature precursora separada** y NO es alcance de esta feature
  — esta asume que la tabla `padron_cotizantes` ya está poblada al momento
  de validar.
- El padrón contiene a TODOS los cotizantes a gremios en ANSES, no solo a
  afiliados APOPS. La diferenciación se hace por columna: `APOPS = x`
  (activo afiliado APOPS), `cotiza_papel = x` (jubilado afiliado APOPS),
  o flags de otros gremios (ATE / SEC / UPCN / SECASFPI) que no constituyen
  afiliación APOPS.

## Dependencies

- Esta feature es **bloqueante de todas las demás features del MVP**: sin
  autenticación funcionando, ningún módulo (consultas, dashboard delegado,
  comunicados, notificaciones, credencial digital) puede operar.
- **Precursora obligatoria**: feature única de ingesta del padrón de
  cotizantes (CSV/Excel cargado por admin) — tabla única con todas las
  columnas reales del padrón actual. Sin esa precursora, esta feature no
  puede ejecutar ni US1 ni US2.
