# Sacar un proyecto a producción — guía reutilizable

Escrita el 2026-09-20 al cerrar el primer lanzamiento hecho con el squad. Es el proceso **tal como
pasó**, con los tiempos reales y las trampas, para no volver a pagarlas en el siguiente proyecto. La
parte legal (§1) y la lista de básicos web (§5) valen para cualquier web con login; Supabase /
Cloudflare / Google (§2-§4) valen para cualquier proyecto con ese stack. Lo particular de cada
producto (qué se publica, cómo se modera, qué promete la Privacidad) **no está aquí**: lo saca
`@legal` del repo y del operador.

**Cómo se usa en un proyecto nuevo:** `/squad:launch` (plugin squad) copia la lista de control a
`docs/launch/checklist.md` del proyecto, ejecuta la auditoría automática sobre la URL y deja
marcado qué está hecho, qué falta y qué es tarea del operador. Esta guía es la explicación larga;
la checklist es lo que se marca.

---

## 0. En una pantalla — el orden que funcionó

| # | Fase | Quién | Tiempo real (1.er lanzamiento) | Dónde queda |
|---|------|-------|-------------|-------------|
| 1 | Decisiones legales (quién eres, qué prometes) | operador | 1 h de preguntas | `docs/legal/compliance-backlog.md` |
| 2 | Textos legales (4 públicos) + procedimientos (5 internos) | `@legal`, operador lee | 2 días la primera vez; con plantillas, una tarde | `docs/legal/*.md` + las 4 rutas de la app |
| 3 | Lo que la app tiene que HACER (consentimiento, borrar cuenta, reportes, retención, marcado IA) | squad, ~5 runs | 3 días | migraciones SQL + pantallas |
| 4 | Revisión «abogado» asistida → dictamen → aplicar | asistente | 1 día | `docs/legal/revision-abogado-<fecha>.md` |
| 5 | Supabase en producción (SQL pegado, funciones, crons, auth) | operador pega, asistente guía | 2 h | `supabase/migrations/README.md` |
| 6 | Cloudflare Pages + dominio | operador con guía | 2 h (por las trampas de §3) | dashboard |
| 7 | Google login en producción (marca verificada) | operador con guía | 2 h | Google Auth Platform |
| 8 | Básicos web / SEO (§5) | asistente | 1 h | `index.html`, `public/` |
| 9 | Smoke test en el dominio real, móvil + escritorio | operador | 30 min | `docs/product/beta-feedback.md` |
| 10 | Papeleo de proveedores (DPAs) | operador | 20 min | `docs/legal/data-map.md` |

Total: unas **dos semanas de calendario** para una beta gratuita con login. Sin la guía la mitad
fue descubrir el orden; con ella, la parte técnica (5-8) cabe en una tarde.

---

## 1. Legal — lo que se repite en todos los proyectos

La regla que lo ordena todo: **en cuanto hay login, hay datos personales**, aunque no cobres. Desde
el primer usuario real aplican RGPD, LSSI, DSA (si hay contenido de usuarios) y, si hay IA
generando texto público, el AI Act art. 50. No hace falta empresa: una persona física puede ser el
responsable.

### 1.1 Decisiones que solo puede tomar el operador (pregúntalas todas el día 1)

1. **Quién eres**: nombre legal completo, NIF, dirección para notificaciones, un email que se lea
   (`hello@…`). Va en el Aviso legal y en Privacidad. Teléfono solo cuando se cobre.
2. **Persona física o empresa**, y país (fija la ley aplicable y la autoridad: AEPD en España).
3. **Se cobra o no.** Beta gratis = Fase 1. Cobrar abre la Fase 2 (consumo, retirada, IVA, CMP).
4. **Edad**: 18+ declarado por el usuario y bloqueado en servidor. Sin menores, nada de LOPIVI
   específico más allá de moderación y evidencia. Con menores: abogado antes de abrir.
5. **Contenido sensible**: personas reales (parodia sí, suplantación no), política, datos de
   terceros en textos de usuario (aviso al escribir). Decidir qué se excluye durante la beta.
6. **Proveedores y dónde están**: cada uno es un encargado del tratamiento y una transferencia
   (p. ej. Supabase US, Cloudflare global, un proveedor de IA en US). Necesitas su DPA o un riesgo
   aceptado por escrito.
7. **Qué se publica**: bajo qué nombre (alias, nickname opcional, nunca el nombre del login), qué
   campos salen en la API o el JSON público (lista blanca, no lista negra).

Son exactamente las preguntas de `@legal` (`agents/legal.md`) y los flags de
`templates/legal/README.md`.

### 1.2 Documentos — 4 públicos, 5 internos

| Documento | Para quién | Dónde suele vivir |
|-----------|-----------|-------------------|
| Aviso legal (identidad, DSA punto de contacto, IA) | público, ruta `#legal` | `docs/legal/legal-notice.md`, renderizado por la app |
| Política de privacidad (resumen corto arriba, responsable, qué se publica, bases legales, retención, derechos, cookies) | público, `#privacy` | `privacy-policy.md` |
| Términos de uso (versionados: `TERMS_VERSION`) | público, `#terms` | `terms-of-use.md` |
| Normas de comunidad (qué no se permite + cómo reportar) | público, `#guidelines` | `community-guidelines.md` |
| Registro de tratamientos (art. 30) + inventario de datos + cookies/storage | interno | `docs/legal/data-map.md` |
| Procedimiento de solicitudes (acceso, borrado, portabilidad; 1 mes) | interno | `privacy-requests.md` |
| Procedimiento de moderación (DSA 16-18: recibir, ocultar, decidir, notificar, apelar) | interno | `moderation-procedure.md` |
| Procedimiento de brechas (AEPD 72 h) | interno | `breach-procedure.md` |
| Nota de alfabetización IA (AI Act art. 4) | interno | `ai-literacy.md` |

Los cuatro públicos se escriben en el idioma del producto (resumen en el idioma del país antes de
cualquier campaña allí). Cada uno lleva fecha y, los Términos, versión.

**No se escriben de cero:** el plugin squad lleva plantillas genéricas de los cuatro textos
(`templates/legal/*.md`: sin producto ni datos de nadie — variables, bloques `IF` por stack y frases
`[[WRITE]]` que se redactan con los sustantivos del proyecto; `scripts/legal-render.mjs` las renderiza)
y un agente `@legal` que, cuando un proyecto va a producción, lee el `squad.md` del proyecto, saca del
repo lo que el código ya dice, pregunta al operador el resto (identidad, país, proveedores, qué se
publica, si se cobra) y escribe los textos en el proyecto. `/squad:launch` lo lanza solo si el
proyecto no tiene textos legales.

### 1.3 Lo que la app tiene que HACER (decirlo no basta)

- **Consentimiento**: 18+ y aceptación de Términos (con versión) en el **primer acto que crea o
  publica**, no en el login (mirar sin cuenta no necesita consentimiento). Guardado en una tabla
  `consents`, comprobado **en servidor** en cada escritura. Cambiar la versión de Términos = nueva
  migración + test que fija el literal.
- **Borrar cuenta**: un botón en Perfil/Ajustes que borra TODO (auth + tablas + textos tuyos citados
  por otros) vía Edge Function con la API admin, más un trigger de purga. Aviso claro de lo que
  desaparece.
- **Retención automática**: cron que purga lo que la Privacidad promete (borradores no usados,
  contadores, reportes resueltos, cuentas dormidas). Un plazo sin cron no se promete.
- **Reportar**: botón en cada contenido + email sin cuenta. Cola de moderación en la app con
  ocultar / borrar / bloquear; el bloqueado recibe motivo y vía de revisión.
- **Filtro previo** al publicar salida de IA (lista de palabras editable, fallo seguro = oculto).
- **Marcado IA** (AI Act 50.2): `<meta name="ai-generated">`, `data-ai-generated`, píldora
  «AI-generated», aviso «puede contener errores», marca en la imagen compartida.
- **Aviso antes de escribir texto que va a una IA** («no incluyas datos privados; será público»).
- **Claves del usuario (BYOK)** nunca tocan tu servidor: `sessionStorage`, directo al proveedor.
- **Cookies**: si no pones ninguna propia ni analítica → **no hace falta banner**; se dice en
  Privacidad y se verifica en vivo (DevTools → Application → Cookies vacío). Analítica o ads = CMP.
- **Cabeceras**: CSP `script-src 'self'`, `X-Frame-Options DENY`, nosniff, referrer, HSTS.
- **RLS** en todas las tablas + test estructural en CI + auditoría con dos cuentas reales.

### 1.4 La revisión «abogado» asistida — cómo se hizo y qué salió

1. Se congeló un commit y se pidió una revisión **con criterio de abogado** de todos los textos y
   del código que los cumple (no un resumen: bloqueadores, artículo, dónde, texto de reemplazo).
2. El resultado es un **dictamen** (`docs/legal/revision-abogado-<fecha>.md`): bloqueadores
   numerados, correcciones por documento con el copy final, una sola lista de salida.
3. Se aplica en un día (textos + strings + SQL + docs), y un run del squad para lo que es código
   (marcado IA, retirada reversible, strings de moderación veraces).

Los bloqueadores que aparecen siempre (compruébalos tú antes de pedir la revisión):
identidad incompleta del responsable · versión de Términos sin fecha ni prueba de aceptación ·
«borrar cuenta» que no borra los textos citados por otros · retención prometida sin cron · reporte
sin vía por email · moderación descrita como no es (p. ej. «revisamos todo») · salida de IA sin
marcar · datos publicados por lista negra en vez de lista blanca.

Aviso obligatorio: es una revisión asistida por IA. **Antes de cobrar**, un abogado colegiado.

### 1.5 Fase 2 — lo que se abre al cobrar (no lo hagas antes)

Modelo 036 / RETA · condiciones de pago, retirada, reembolsos, IVA, recibos · CMP certificado si
hay ads · opt-in de newsletter · marca (EUIPO) · traducción de Privacidad/Términos al idioma del
país · teléfono en el Aviso legal · agente DMCA · accesibilidad (EAA) · revisión de abogado de todo.

---

## 2. Supabase — producción sin sustos

- **Migraciones a mano**: se pegan en orden en el SQL Editor, una transacción cada una. **Nunca
  `supabase db push`** si el historial remoto no registra las antiguas (rehace todo). Cada
  migración es repegable (`create or replace`, `if not exists`).
- **Tests SQL** (`supabase/tests/*.sql`) se ejecutan entre `BEGIN` y `ROLLBACK` sobre el proyecto
  real: prueban sin dejar rastro. Se anota el `PASS` con fecha en el backlog.
- **Edge Functions**: `supabase functions deploy <name> --use-api`, **desde main**, no desde un
  worktree viejo (pasó: se desplegó una versión anterior). Secretos en Supabase → Edge Functions
  → Secrets, nunca en el repo.
- **Crons** (`pg_cron`): tras pegar, `select jobname, schedule, active from cron.job` y comparar
  con la lista esperada.
- **Auth**: proveedor Google (client id/secret), **Site URL y Redirect URLs = dominio final**
  (si siguen en pages.dev el login rebota). Clave publishable en el cliente, `service_role` solo en
  funciones.
- **RLS**: test estructural en cada gate + auditoría con dos cuentas reales no moderadoras (tokens
  nunca pegados en tickets).
- **Purga inicial**: ejecutar una vez a mano la función de retención antes de abrir.
- **MCP de Supabase**: comprobar a qué proyecto apunta antes de usarlo (pasó: apuntaba a otro
  proyecto de la misma cuenta).

---

## 3. Cloudflare Pages — los pasos y las trampas (2 horas que ahora son 20 minutos)

1. **Dominio** en Cloudflare (registro o DNS). Anota registrador y buzón del `hello@`.
2. Workers & Pages → Create → conectar GitHub. **Trampa:** «Repository not found. Are you sure
   it's public?» con un repo privado → usar el flujo antiguo **«Continue to Pages»**, que sí lo ve.
3. Build: **Framework preset = None** (si hay `docs/` con Markdown autodetecta VitePress y pone
   `npx vitepress build`, que falla). Command `pnpm build`, output `dist`, variable `NODE_VERSION`
   = la del proyecto.
4. **Variables de entorno ANTES del primer deploy**: `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SITE_URL` (dominio final). Sin ellas la web sale pero
   el login no funciona. Después: Retry deployment.
5. **Custom domain** → añadir el dominio en el proyecto de Pages. Hasta que resuelve, el login
   rebota a un dominio muerto.
6. **Zona → desactivar lo que inyecta scripts**: Rocket Loader OFF, Email Obfuscation OFF, Auto
   Minify OFF, **Web Analytics NO** (rompen `script-src 'self'` y la analítica pone cookies que
   obligarían a banner).
7. **Cabeceras**: `public/_headers` se sirve tal cual (CSP, HSTS, X-Frame-Options, nosniff,
   Referrer-Policy). Un test del gate mantiene la CSP del `<meta>` igual a la del fichero.
8. **www → apex**: Rules → Redirect Rules → plantilla «Redirect from WWW to root» (1 clic). Sin
   esto `www.` sirve una copia con 200 (contenido duplicado).
9. **HTTPS**: el 301 de http→https viene por defecto; el HSTS lo pone `_headers`. Comprobar:
   `curl -sI http://dominio | grep -i location`.
10. **Cada push a main despliega** (1-2 min). Para saber si ya está: pedir un fichero **nuevo** de
    ese deploy (`curl -s -o /dev/null -w '%{content_type}' https://dominio/og.png`) — no la
    portada, que siempre responde.
11. **404 real**: con `public/404.html` Pages devuelve 404 a rutas inexistentes; sin él, la portada
    con 200 (soft 404). Solo válido si la app enruta por `#hash` o rutas conocidas.

---

## 4. Google — login en producción

Google Auth Platform (Cloud Console):

1. **Branding**: nombre, logo, **dominio autorizado = dominio final**, enlaces a
   `https://dominio/#privacy` y `#terms` (no pages.dev: los rechaza).
2. La verificación de marca pide **propiedad del dominio** → Search Console → método TXT → si el
   DNS está en Cloudflare, Google lo **añade solo** (botón «Authorize DNS records»). Volver y
   verificar.
3. **Publicar** la marca verificada («se verificó pero aún no se muestra… publícala»).
4. **Audience → En producción**. En «Testing» solo entran las cuentas de prueba: parece que «el
   login falla».
5. Verificación general de la app: **opcional** si los scopes son solo `openid email profile`.
6. En Supabase → Auth → Google: client id y secret; en Google → Credentials: la redirect URL que
   da Supabase.

Nota de minimización: Supabase pide siempre `email profile`; no se puede quitar `profile`. Se
documenta en Privacidad y se pone un test que fija que el cliente no añade más scopes.

---

## 5. Básicos web y SEO — la lista del operador

| Ítem | Cómo se hace / se comprueba | Quién |
|------|-----------------------------|-------|
| Aviso legal | §1.2, ruta `#legal` enlazada en el pie | asistente |
| Política de privacidad | §1.2, ruta `#privacy` | asistente |
| Aviso de cookies | sin cookies propias ni analítica → sin banner; dicho en Privacidad; verificado en DevTools. Con analítica o ads → CMP | asistente |
| Forzar HTTPS | 301 + HSTS en `_headers`; `curl -sI http://…` | asistente |
| Meta títulos y descripciones | `<title>`, `description`, `canonical`, Open Graph, Twitter card, `og.png` 1200×630 | asistente |
| Datos estructurados | JSON-LD `WebApplication` o el tipo que toque (bloque de datos: no lo ejecuta el navegador, la CSP no lo bloquea) | asistente |
| Sitemap y robots.txt | `public/sitemap.xml` + línea `Sitemap:` en robots; en Search Console → Sitemaps → enviar la URL | asistente / **operador (1 clic)** |
| Ficha de Google | Google Business Profile es para negocios con local; para una web, **Search Console** verificado | — |
| Favicon | Google no muestra favicons `data:` en resultados → `/favicon.png` 48×48 enlazado + `apple-touch-icon` 180 + `/favicon.ico` | asistente |
| Texto alternativo en imágenes | `alt` en las que informan, `aria-hidden` en las decorativas | asistente |
| Imágenes comprimidas | `pngquant` + test del gate con tope de peso para `public/` | gate |
| Velocidad de carga | cero terceros, bundle pequeño; formal: PageSpeed Insights móvil | **operador (1 min)** |
| Contraste de colores | impeccable en cada pantalla tocada; auditoría completa `/impeccable audit` | asistente |
| Se ve bien en móvil | verificar 375/390 en las pantallas clave + smoke test del operador | operador |
| Página 404 personalizada | `public/404.html` → Pages responde 404 de verdad | asistente |
| Enlaces rotos | el script de auditoría pide cada enlace externo | script de auditoría |
| Formularios anti-spam | sin formularios públicos sin cuenta: login + consentimiento + RLS + límites (longitud, tope por hora, lista de palabras). Reporte por email = `mailto` | — |
| *(faltaba en la lista)* www → apex | Redirect Rule en Cloudflare (§3.8) | **operador (1 clic)** |
| *(faltaba)* cabeceras de seguridad | CSP, X-Frame DENY, nosniff, Referrer-Policy, HSTS | gate |
| *(faltaba)* Open Graph al compartir | pegar la URL en X/WhatsApp y ver la tarjeta | operador |

---

## 6. Smoke test (guion, 30 minutos, móvil y escritorio)

1. Entrar con el proveedor de login → pantalla de consentimiento → aceptar.
2. Perfil → nombre público / nickname → guardar → se ve en portada.
3. Crear el contenido principal del producto → publicar → aparece donde toca; desde otra cuenta,
   interactuar (comentar, votar, lo que tenga el producto).
4. Ver el contenido publicado: etiqueta «AI-generated» y aviso de errores si hay IA.
5. Reportar un contenido → desaparece → aparece en la cola de moderación.
6. Email de reporte desde el pie → llega al `hello@`.
7. Compartir en X → tarjeta con imagen. Copy link → abre en incógnito.
8. Sign out → lo público sigue legible sin cuenta. Borrar cuenta desde una cuenta de prueba →
   desaparece todo lo suyo.
9. DevTools → Application: cookies vacío, `localStorage` solo las claves listadas en Privacidad;
   Network: solo tu dominio + los proveedores listados.
10. Lo que falle → `docs/product/beta-feedback.md`, con las palabras del operador.

---

## 7. Papeleo de proveedores — 20 minutos

- **Supabase**: Organization settings → Legal documents → fecha de aceptación del DPA → `data-map.md`.
- **Cloudflare**: el DPA se aplica con los términos de cuenta; anotar enlace y fecha.
- **Proveedor de IA**: si no ofrece DPA a cuentas individuales → riesgo aceptado por escrito (sin
  datos del usuario en prompts, logging OFF, entrenamiento denegado; revisar antes de cobrar).

---

## 8. Qué se automatiza — `/squad:launch`

Lo que costó tiempo no fue hacer cada cosa, fue **saber qué faltaba y en qué orden**. Por eso:

- `templates/launch-checklist.md` (plugin squad): esta lista, vacía, con casillas y «quién».
- `scripts/launch-audit.sh <url>`: comprueba en 10 segundos lo automatizable — redirección
  https y www, HSTS/CSP/X-Frame, robots + sitemap, 404 real, `<title>`/description/canonical/OG,
  favicon alcanzable, JSON-LD, tamaño de bundle, TTFB, enlaces externos — y pinta ✅/❌.
- `/squad:launch <url>`: copia la checklist al proyecto, ejecuta la auditoría, marca lo que está,
  y lista lo que solo puede hacer el operador (DPAs, Redirect Rule, Search Console, Google
  Audience, smoke test), con el enlace a esta guía para el porqué.

Lo que **no** se automatiza y hay que hacer a mano en cada proyecto: las decisiones de §1.1, los
textos (se renderizan de las plantillas genéricas del plugin y se redactan las frases `[[WRITE]]`,
no de cero), la revisión asistida de abogado, y el smoke test.
