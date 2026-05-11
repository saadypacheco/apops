# APOPS Siempre — Presentación al cliente

> Estado de la aplicación al **6 de mayo de 2026**.
> Documento para presentar a Comisión Directiva de APOPS.

---

## 1. ¿Qué es APOPS Siempre?

**APOPS Siempre** es la aplicación web del gremio APOPS, accesible desde
cualquier celular o computadora sin instalar nada. Reúne en un solo lugar
los servicios que hoy se manejan por canales dispersos (WhatsApp, mail,
ventanilla en sede): credencial digital del afiliado y su grupo familiar,
novedades del gremio, canal directo de consultas, afiliación online y
panel de gestión para la administración del gremio.

Está pensada **mobile-first**: la mayoría de los afiliados va a entrar
desde el celular, así que cada pantalla está optimizada para esa pantalla.

---

## 2. Beneficios

### 🧑 Para el afiliado / la afiliada

| Necesidad real | Cómo lo resuelve la app |
|---|---|
| "Necesito mi credencial y no la encuentro" | Credencial digital siempre disponible en el celular, sin tener que ir a la sede. |
| "Mis hijos también son adherentes" | La misma app muestra **la credencial de cada miembro del grupo familiar**, todas en un solo lugar. |
| "Quiero mandarle la credencial a mi señora" | Botón de compartir directo por WhatsApp, email o link. La persona que recibe ve la credencial sin tener que registrarse. |
| "Tengo una consulta para el gremio" | Botón de WhatsApp / email / teléfono prominente en la home, con el mensaje pre-cargado y los datos del afiliado para que el gremio sepa quién consulta. |
| "¿Qué novedades hay?" | Sección de novedades visible al instante, tanto desde la landing pública (sin login) como en la app autenticada. |
| "Olvidé mi clave" | Recuperación con un email y un link — sin trámite presencial. |
| "Soy nuevo, no estoy en el padrón" | La app le ofrece dos caminos claros: solicitar acceso para revisión administrativa o iniciar la afiliación online. |

### 🏛️ Para el gremio (Comisión Directiva / Secretaría)

| Necesidad real | Cómo lo resuelve la app |
|---|---|
| "No quiero perder afiliados nuevos por trámite presencial" | **Afiliación online** completa, con firma digital, en 3 pasos. El afiliado se afilia desde el celular sin pasar por la sede. |
| "Llegan solicitudes por mail y se pierden" | **Panel de administración centralizado** con todas las solicitudes pendientes, datos completos y botones de aprobar/rechazar. Cada acción queda auditada. |
| "No tenemos forma de avisar masivamente" | Sección de **novedades publicables** desde la administración. Aparecen en la landing pública (visible para todos) y en la app de los afiliados. |
| "Necesitamos prolijidad y trazabilidad" | Toda acción crítica (login, registro, aprobaciones, afiliaciones) queda en un **registro de auditoría** consultable. |
| "Queremos imagen profesional" | Look & feel limpio, mobile-first, alineado con la identidad visual del gremio (logo APOPS, gradiente azul). |
| "El padrón está incompleto / desactualizado" | Caso "no en padrón" tiene un flujo guiado: el afiliado completa sus datos y la administración revisa la solicitud. Se evita perder miembros legítimos. |

### 🤝 Para los delegados (en preparación)

El rol de **delegado** ya está reconocido en la app (los delegados
pueden loguearse y ver una pantalla diferenciada). Las herramientas
específicas para delegados —seguimiento de cotizantes en su lugar de
trabajo, comunicación con CD, registro de novedades de sector— están
en el plan inmediato siguiente. La base técnica ya soporta el rol.

---

## 3. Recorridos principales (con capturas)

> Para cada captura indicamos:
>   - **Pantalla**: ruta exacta de la app
>   - **Usuario sugerido**: cuenta de prueba a usar
>   - **Caption**: texto que va junto a la captura

Los datos de prueba que ya están en el sistema:

| Cuenta | DNI | Legajo | Familiares |
|---|---|---|---|
| Pérez, María (activa) | 30000001 | L-0001 | 3 (Carlos cónyuge, Juan hijo, Laura hija) |
| Rodríguez, Ana (jubilada) | 20000001 | — | 1 (Mario cónyuge) |

---

### 3.1 Bienvenida y acceso (público)

**[CAPTURA 1 — Landing]**
- Pantalla: `/`
- Usuario: ninguno (no estás logueado)
- Mostrar: header con logo + saludo, carrusel de noticias destacadas, formulario de acceso, botón "Afiliate ahora", contacto al pie
- Caption: *"Pantalla de bienvenida. Las noticias destacadas están visibles sin necesidad de iniciar sesión. Quien todavía no es afiliado encuentra el acceso directo a la afiliación online."*

**[CAPTURA 2 — Login con clave]**
- Pantalla: `/` (mismo que antes)
- Mostrar: zoom al card "ACCESO" con campos DNI/Legajo + Clave, botón "Ingresar", links "Magic link · Recuperar clave · Registrate"
- Caption: *"El afiliado ingresa con DNI o legajo más su clave personal. La app reconoce automáticamente cuál de los dos tipeó — el afiliado no tiene que elegir."*

**[CAPTURA 3 — Magic link / sin clave]**
- Pantalla: `/login-magic-link`
- Mostrar: form con un solo campo DNI/Legajo y botón "Enviar magic link"
- Caption: *"Para quien no quiere recordar una clave: ingresa solo el DNI/legajo, recibe un email con un link de un solo uso, y entra. Útil también para los jubilados que prefieren simpleza."*

---

### 3.2 Registro y onboarding

**[CAPTURA 4 — Formulario de registro]**
- Pantalla: `/registrarse`
- Mostrar: form completo con DNI/Legajo, email + confirmación, clave opcional
- Caption: *"Primer registro: el afiliado ingresa sus datos y elige si quiere usar clave o solo magic link. La confirmación de email evita errores de tipeo."*

**[CAPTURA 5 — No estás en el padrón]**
- Pantalla: `/no-en-padron?identifier=99999999`
- Mostrar: las dos opciones grandes (Iniciar afiliación / Solicitar acceso)
- Caption: *"Si la persona no aparece en el padrón, no recibe un mensaje de error: la app le explica el motivo y le ofrece dos caminos claros — afiliarse formalmente, o pedir acceso si ya es afiliado y hay un desfasaje administrativo."*

**[CAPTURA 6 — Solicitud enviada]**
- Pantalla: `/solicitud-enviada`
- Mostrar: pantalla de confirmación con check verde y botón "Contactar por WhatsApp"
- Caption: *"Confirmación al usuario: la solicitud se registró y el gremio va a contactarlo. Ofrece WhatsApp como canal directo en caso de urgencia."*

---

### 3.3 La credencial digital (núcleo de la app)

**[CAPTURA 7 — Home con credencial]**
- Pantalla: `/feed`
- Usuario: Pérez María (DNI 30000001 + clave)
- Mostrar: la pantalla completa — header con saludo, tabs de navegación entre credenciales [Yo · Carlos · Juan · Laura], la card de credencial del titular, y el widget de consultas debajo
- Caption: *"La pantalla principal del afiliado: ve su credencial digital al instante, puede pasar a las de cada miembro de su familia con un toque, y tiene a mano el botón para consultar al gremio."*

**[CAPTURA 8 — Credencial de un adherente con botón compartir]**
- Pantalla: `/feed`, tocar tab "Carlos"
- Mostrar: credencial de Carlos (cónyuge) con etiqueta "Afiliado Adherente · Cónyuge", y debajo el card de compartir con WhatsApp + email + copiar link
- Caption: *"Cuando se selecciona un adherente, aparece la opción de compartirle la credencial. WhatsApp es el canal principal — el más usado en Argentina."*

**[CAPTURA 9 — WhatsApp abierto con mensaje pre-cargado]**
- Pantalla: tocar el botón WhatsApp del paso anterior
- Mostrar: WhatsApp Web o app abierta con el mensaje *"Hola Carlos, te comparto tu credencial APOPS: https://..."* y el campo "Para" para elegir contacto
- Caption: *"El afiliado solo elige a quién mandárselo desde su agenda. El mensaje y el link ya van armados — sin pasos extra ni copiar/pegar."*

**[CAPTURA 10 — Vista pública (lo que recibe el familiar)]**
- Pantalla: `/credencial-publica/<uuid>` (abierta en el celular del flia o en pestaña incógnito)
- Mostrar: la credencial del adherente, sin necesidad de registrarse
- Caption: *"Lo que recibe la persona del otro lado: una página simple con su credencial, válida en cualquier dispositivo, sin instalar nada y sin crear cuenta. Es presentable directamente desde el celular."*

---

### 3.4 Comunicación con el gremio

**[CAPTURA 11 — Widget de consultas en la home]**
- Pantalla: `/feed`, scroll hasta el widget "¿Necesitás ayuda?"
- Mostrar: card con WhatsApp grande (verde), Email y Llamar
- Caption: *"Canal directo de consultas. Cualquier afiliado puede contactar al gremio en un toque, con su nombre ya pre-cargado en el mensaje para que la administración sepa de inmediato quién pregunta."*

**[CAPTURA 12 — Novedades en la app]**
- Pantalla: `/novedades`
- Mostrar: listado de noticias con cards blancas, las destacadas con borde lima
- Caption: *"Las novedades del gremio son visibles tanto en la app autenticada como en la landing pública. Las destacadas (asambleas, paros, comunicados urgentes) se diferencian visualmente."*

---

### 3.5 Afiliación online

**[CAPTURA 13 — Wizard paso 1 (datos personales)]**
- Pantalla: `/afiliarse`
- Mostrar: formulario del primer paso — datos del solicitante
- Caption: *"Afiliación online en 3 pasos. Primer paso: datos personales del solicitante."*

**[CAPTURA 14 — Wizard paso 3 (firma digital)]**
- Pantalla: `/afiliarse` paso de firma
- Mostrar: el canvas de firma con el botón limpiar y aceptar
- Caption: *"El afiliado firma directamente en la pantalla del celular con el dedo. La firma queda asociada a la solicitud de afiliación."*

**[CAPTURA 15 — Confirmación de afiliación]**
- Pantalla: `/afiliarse/exito`
- Mostrar: pantalla de éxito con próximos pasos
- Caption: *"La solicitud queda registrada. La Secretaría la procesa y, una vez confirmada, el nuevo afiliado puede ingresar a la app con sus credenciales."*

---

### 3.6 Vista de la administración

**[CAPTURA 16 — Panel admin: solicitudes pendientes]**
- Pantalla: `/admin`
- Usuario: cuenta admin (a confirmar credenciales)
- Mostrar: listado de solicitudes con DNI, email, motivo, fecha, y botones de aprobar/rechazar
- Caption: *"Panel para Comisión Directiva / Secretaría: todas las solicitudes pendientes en un solo lugar, con datos completos. Aprobar o rechazar es un toque, y queda auditado quién resolvió cada caso y cuándo."*

---

## 4. Aspectos técnicos relevantes para el cliente

Sin meternos en detalles técnicos, hay tres cosas que vale la pena
mencionar porque son **valor real para el gremio**:

1. **No requiere instalación.** Funciona en cualquier celular o
   computadora con navegador. No hay que pasar por App Store ni Play
   Store. Las actualizaciones son automáticas.

2. **Datos seguros.** Las credenciales y datos personales viajan
   cifrados (HTTPS), las claves se guardan con hashing estándar de
   industria, y las consultas a la base de datos están protegidas con
   reglas de acceso por rol — un afiliado solo puede ver sus propios
   datos y los de su grupo familiar, nunca los de otros.

3. **Auditable.** Toda acción crítica queda registrada con fecha, usuario,
   IP y dispositivo. Útil para resolver disputas o entender qué pasó en
   un caso puntual.

---

## 5. Lo que viene (siguiente iteración)

Funcionalidades en el roadmap inmediato, priorizadas en conjunto con CD:

- **Panel completo para delegados**: lista de cotizantes en su lugar de
  trabajo, mensajería interna con CD, seguimiento de afiliaciones de su
  sector.
- **Notificaciones push**: avisos directos al celular del afiliado para
  novedades urgentes (asamblea, paro, comunicado especial), sin
  depender del email.
- **PDF de la solicitud de afiliación**: generación automática del
  formulario firmado al completar la afiliación, descargable y enviado
  por email tanto al afiliado como al gremio.
- **Reseteo de clave dentro de la app**: hoy la recuperación va por
  magic link; el siguiente paso es permitir cambiar la clave desde el
  perfil sin volver a registrarse.
- **Beneficios y convenios**: cards con descuentos y beneficios del
  gremio (óptica, farmacia, comercios adheridos), accesibles desde la
  home.

---

## 6. Cierre

La app está hoy en estado funcional para la mayoría de los flujos
centrales: el afiliado se registra, ingresa, ve su credencial digital y
las de su grupo familiar, comparte credenciales con su flia, recibe
novedades del gremio, hace consultas y se afilia online. El gremio
gestiona solicitudes desde un panel administrativo con trazabilidad.

El siguiente paso es pasar de **MVP funcional** a **producto listo para
producción**, con las funcionalidades del roadmap arriba y el ajuste
fino de UX que surja del uso real con un grupo piloto de afiliados.

---

## Apéndice: cómo capturar las pantallas

Para tomar las capturas listadas arriba:

1. Asegurarse de que Supabase local está corriendo y la base tiene seed.
2. `npm run dev` → abrir `http://localhost:3000` en navegador desktop con
   las DevTools en modo responsive (ej. iPhone 12, 390×844 px).
3. Para cada captura: navegar a la ruta indicada, loguearse con el
   usuario sugerido, capturar la pantalla. En Chrome: F12 → modo
   responsive → tres puntos arriba a la derecha del DevTools → "Capture
   full size screenshot".
4. Las capturas pueden pegarse directamente en este markdown (al
   convertirlo a PDF/Word desde Pandoc o VSCode preview), o se pueden
   numerar y referenciar como anexo.

Para la captura del **panel admin**, hay que crear una cuenta con rol
admin. Si todavía no existe, alcanza con tomar un afiliado del seed y
actualizar manualmente su `rol = 'admin'` en la tabla `afiliados`.
