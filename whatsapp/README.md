# CRM → WhatsApp notifier (OpenWA)

Servicio **independiente** que reenvía las notificaciones del panel del CRM al
WhatsApp de los ejecutivos usando el gateway **OpenWA**.

> No modifica el código del CRM. Solo **lee** su base de datos (`app_notifications`)
> y llama al API HTTP de OpenWA. Todo vive en esta carpeta.

---

## ¿Cómo funciona?

1. El CRM, cuando ocurre algo (ej. "Cliente listo para tarifa", "Cliente listo
   para afiliación", broadcasts, alertas), escribe una fila en la tabla
   `app_notifications` — que es **exactamente lo que se ve en el panel web**.
2. Este servicio sondea esa tabla cada pocos segundos buscando filas nuevas
   cuyos destinatarios sean **ejecutivos** (`users.role = 'executive'`).
3. Por cada notificación nueva, busca el WhatsApp **verificado** del ejecutivo en
   `user_channel_addresses` (canal `whatsapp`) y lo envía vía OpenWA.
4. Guarda un "watermark" (último id procesado) en `.state.json` para no repetir.

Así, lo que aparece en la web también llega al celular del vendedor.

```
   ┌──────────┐   escribe    ┌──────────────────┐   sondea   ┌──────────────┐   POST    ┌────────┐
   │   CRM    │ ───────────▶ │ app_notifications│ ◀───────── │   notifier   │ ────────▶ │ OpenWA │ ─▶ 📱
   └──────────┘  (libsql)    └──────────────────┘  (lee)     └──────────────┘ send-text └────────┘
```

---

## Requisitos

- **bun** o **Node.js ≥ 22.6** (ambos ejecutan TypeScript de forma nativa: bun
  directo, Node con *type stripping*). Probado en Node 24 y bun.
- El **servidor libsql del CRM** corriendo (por defecto `http://127.0.0.1:8080`,
  lo levanta `bun run dev:libsql` en el CRM).
- El **gateway OpenWA** corriendo (por defecto `http://localhost:2785`) con una
  sesión de WhatsApp **conectada** (QR escaneado).

Escrito en **TypeScript**, sin dependencias en runtime (no requiere `npm install`
para ejecutarse; `typescript`/`@types/node` solo se usan para el `typecheck`).

---

## Configuración

1. Copia `.env.example` a `.env` (ya hay un `.env` con los valores detectados):

   ```
   WEB_DB_URL=http://127.0.0.1:8080
   OPENWA_BASE_URL=http://localhost:2785
   OPENWA_API_KEY=<tu api key de OpenWA>
   OPENWA_SESSION_NAME=pruebita
   POLL_INTERVAL_MS=4000
   TARGET_ROLE=executive
   COUNTRY_CODE=51
   START_FROM=now
   DRY_RUN=false
   ```

   - `OPENWA_API_KEY`: está en `OpenWA/data/.api-key`.
   - `OPENWA_SESSION_NAME`: el **nombre** de la sesión en OpenWA (no el UUID). El
     servicio resuelve el UUID solo.

---

## Cargar el WhatsApp de los ejecutivos

El servicio solo envía a ejecutivos que tengan un número **verificado** en la BD.
Hay dos formas de cargarlo:

- **Desde la app del CRM**: el ejecutivo registra y verifica su número de WhatsApp
  en su perfil/onboarding.
- **Con el helper incluido** (rápido para pruebas):

  ```bash
  # Ver ejecutivos y su WhatsApp actual
  node register-number.ts --list      # o: bun register-number.ts --list

  # Registrar/verificar un número (userId  teléfono)
  node register-number.ts 3 987654321
  ```

---

## Ejecutar

```bash
cd crm/whatsapp
node index.ts          # o: bun index.ts
```

Y, en otra terminal, el bot de onboarding (opcional):

```bash
node onboarding-bot.ts # o: bun onboarding-bot.ts
```

Verás logs como:

```
[..] INFO Iniciando CRM → WhatsApp notifier {...}
[..] INFO Sesión OpenWA lista {"sessionId":"...","status":"connected"}
[..] INFO Nuevas notificaciones a procesar: 1
[..] INFO WhatsApp enviado {"id":42,"userId":3,"chatId":"51987654321@c.us"}
```

### Prueba de punta a punta

1. Asegúrate de que la sesión de OpenWA esté **conectada** (escanea el QR con el
   número emisor, p. ej. `912345678`). Si está en `qr_ready`, los envíos fallan.
2. Registra tu número como WhatsApp de un ejecutivo:
   `node register-number.ts <userIdEjecutivo> 987654321`
3. Arranca el servicio: `node index.ts`
4. Genera una notificación en el CRM para ese ejecutivo (ej. mueve un lead a una
   etapa que lo notifique, o un admin envía un broadcast a ese usuario).
5. Debe llegarte el WhatsApp a `987654321`.

> Para una prueba sin tocar el CRM, usa `DRY_RUN=true`: el servicio imprime lo que
> enviaría sin mandar nada.

---

## 🛡️ Evitar baneos (mejores prácticas)

> ⚠️ **Lo más importante:** WhatsApp banea por **comportamiento**, no solo por
> velocidad. Un número ya marcado se vuelve a banear con un solo mensaje. Si te
> banearon, **ese número está quemado**: cambia de número, no de intervalo.

Resumen de la documentación oficial de OpenWA (`docs/16-risk-management.md` y
`docs/12-troubleshooting-faq.md`):

**HACER ✅**
- Usar un **número dedicado** (no personal).
- **Calentar números nuevos**: uso normal 1–2 semanas antes de automatizar.
- Que los empleados **guarden el número y escriban primero** (no enviar a quien
  nunca te ha escrito → es la señal de spam #1).
- **Delays aleatorios** entre mensajes (este servicio ya lo hace).
- **Personalizar** mensajes (evitar contenido idéntico a muchos destinatarios).
- **Subir el volumen gradualmente**; máx. ~200/día en números nuevos.
- Verificar que el número exista en WhatsApp antes de enviar (`VERIFY_NUMBER=true`).

**NO HACER ❌**
- Enviar en **ráfaga** o a números desconocidos.
- Plantillas **idénticas** a muchos destinatarios.
- >200 mensajes/día en números nuevos.
- Comunicación **unidireccional** ignorando respuestas.
- IPs de datacenter sin proxy residencial.

**Cómo este servicio aplica lo anterior:** intervalo aleatorio `MIN_DELAY_SEC`–
`MAX_DELAY_SEC`, simulación de "escribiendo…" (`TYPING_SEC`), verificación previa
del número (`VERIFY_NUMBER`), backoff ante rate-limit (429), topes opcionales
(`MAX_PER_HOUR`/`MAX_PER_DAY`) y horario silencioso (`QUIET_HOURS`).

**Alternativa sin riesgo de baneo:** la **WhatsApp Business API oficial (Meta
Cloud)** es el canal sancionado para notificaciones automáticas. El CRM ya la
soporta vía el paquete `@crm/message-channels` (solo faltan credenciales). Para
volumen alto y producción, es la opción recomendada.

## Notas de diseño

- **Entrega "a lo más una vez"**: si un envío falla, se reintenta hasta
  `MAX_ATTEMPTS` (3) ciclos; luego se descarta para no bloquear la cola. Los fallos
  quedan en el log.
- **Watermark persistente** en `.state.json`. La primera vez, con `START_FROM=now`,
  ignora el historial; con `beginning`, reenvía lo pendiente.
- **Sesión por nombre**: el engine de OpenWA se identifica por UUID, que puede
  cambiar si recreas la sesión. Por eso configuras el **nombre** y el servicio
  resuelve el UUID en cada arranque (y se re-resuelve si recibe 404).
- **Sin dependencias**: habla el protocolo HTTP (Hrana) de libsql directamente.

---

## Archivos

| Archivo                | Qué hace                                                        |
| ---------------------- | -------------------------------------------------------------- |
| `index.ts`             | Loop principal: sondea, compone el mensaje y envía.           |
| `onboarding-bot.ts`    | Bot de opt-in: recibe a quien escribe primero y lo activa.    |
| `lib/libsql.ts`        | Cliente mínimo del servidor libsql del CRM (solo lectura aquí).|
| `lib/openwa.ts`        | Cliente del gateway OpenWA (resolver sesión + enviar texto).   |
| `register-number.ts`   | Helper para cargar/verificar el WhatsApp de un usuario.        |
| `tsconfig.json`        | Configuración de TypeScript.                                   |
| `.env`                 | Configuración (no se versiona).                                |
| `.state.json`          | Watermark del último id procesado (no se versiona).            |
| `.onboarding.json`     | Estado del bot de onboarding (no se versiona).                 |
