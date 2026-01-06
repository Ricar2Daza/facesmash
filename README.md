# Face Preference

Sistema web inspirado en FaceSmash enfocado en preferencias de rostros, con separación clara entre rostros generados por IA y rostros de personas reales que entregan su consentimiento informado.

## 1. Arquitectura general

Arquitectura en una sola aplicación backend con frontend estático:

- Cliente web SPA ligera en HTML, CSS y JavaScript vanilla.
- API REST en Node.js con Express.
- Base de datos SQLite embebida mediante sqlite3.
- Almacenamiento de imágenes en disco local bajo la carpeta `uploads`.
- Módulo de ranking con algoritmo ELO para actualizar el índice de preferencia.
- Capa de seguridad con Helmet, rate limiting y sistema de reportes.

Flujo principal:

- El usuario acepta el consentimiento informado en el frontend.
- Puede:
  - Jugar duelos de preferencia entre dos rostros (IA en modo invitado, reales con sesión).
  - Subir una imagen y aceptar condiciones para aparecer en rankings públicos.
  - Consultar rankings globales de rostros IA y personas reales.
  - Revocar el consentimiento usando un token privado.
- El backend expone endpoints REST para duelos, votos, subida, rankings, revocación de consentimiento y reportes.

## 2. Stack y justificación

- Backend:
  - Node.js + Express
    - Ecosistema maduro, mantenible y ampliamente conocido.
    - Fácil de desplegar y escalar horizontalmente con múltiples instancias detrás de un balanceador.
    - Middleware abundante para seguridad (Helmet), subidas de archivos (multer) y rate limiting.
- sqlite3
    - Base de datos ligera, embebida, con buen rendimiento para prototipos y primeros despliegues.
    - Permite migrar más adelante a Postgres o MySQL manteniendo un modelo relacional similar.
  - Helmet
    - Aporta cabeceras de seguridad por defecto.
  - express-rate-limit
    - Previene spam y abuso sobre endpoints sensibles como votos, subida y reportes.
  - multer + sharp
    - Gestión de subidas de imágenes y validación de que el archivo es realmente una imagen.

- Frontend:
  - HTML + CSS + JavaScript modular
    - Interfaz minimalista, mobile-first, con una sola página y animaciones suaves.
    - Sin framework pesado, lo que reduce complejidad operativa.
    - Mantenible y fácil de portar a React/Vue en el futuro si se requiere.

- Almacenamiento de imágenes:
  - Disco local en la carpeta `backend/src/uploads` expuesta como `/uploads`.
  - A futuro puede reemplazarse por almacenamiento externo (S3, GCS) manteniendo la misma interfaz lógica desde el backend.

- Modo de acceso:
  - Modo invitado por defecto, sin cuentas de usuario obligatorias, para reducir fricción de uso y complejidad legal asociada al almacenamiento de datos personales.
  - Los datos sensibles se evitan; se utiliza un token privado de revocación en vez de emails u otra identificación directa.

En decisiones con posible riesgo legal se prioriza siempre la opción más conservadora:

- No se muestran rostros de personas reales sin consentimiento explícito.
- La revocación de consentimiento oculta el rostro de rankings y duelos.
- No se almacenan IPs en texto claro, solo un hash.

## 3. Estructura de carpetas

- `backend/`
  - `package.json` Scripts y dependencias del backend.
  - `src/`
    - `server.js` Punto de entrada del servidor Express.
    - `db/`
      - `index.js` Conexión y schema SQLite.
    - `elo.js` Lógica del algoritmo ELO.
    - `validation/`
      - `validators.js` Validaciones de payloads e imágenes.
    - `lib/`
      - `accountFilters.js` Filtros compartidos de visibilidad.
      - `adminLog.js` Registro de acciones administrativas.
    - `routes/`
      - `faces.js` Subida de rostros y obtención de duelos.
      - `rankings.js` Rankings globales IA y reales.
      - `votes.js` Registro de votos y cálculo ELO.
      - `consent.js` Revocación de consentimiento.
      - `reports.js` Reporte y moderación básica.
    - `uploads/` Carpeta creada en tiempo de ejecución, almacena imágenes.
  - `public/`
    - `index.html` SPA básica.
    - `styles.css` Estilos minimalistas y mobile-first.
    - `app.js` Lógica de la interfaz, llamadas a la API.
- `README.md` Este archivo.

## 4. Cómo correrlo

Requisitos:

- Node.js 20+ (recomendado).
- Windows / macOS / Linux.

Instalación:

```bash
cd backend
npm install
```

Arranque:

```bash
npm start
```

Servidor:

- http://localhost:3000

Datos de ejemplo (opcional):

```bash
cd backend
node scripts/seed.js
```

Variables de entorno (opcional):

- `PORT`: puerto del servidor (por defecto 3000).
- `DB_PATH`: ruta del archivo SQLite (por defecto `./data.sqlite`).
- `JWT_SECRET`: secreto para firmar JWT (obligatorio en despliegue).
- `UPLOADS_DIR`: carpeta donde se guardan las imágenes subidas (por defecto `./src/uploads`).

## 8. Despliegue recomendado

Este proyecto guarda datos en disco (SQLite) y archivos subidos (uploads). Por eso, el despliegue recomendado es en un servicio con disco persistente (por ejemplo Render/Railway/Fly.io/VPS).

### Render (simple)

1. Crea un **Web Service** desde el repo `Ricar2Daza/facesmash`.
2. Configura:
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`
3. Crea un **Disk** persistente (por ejemplo montado en `/var/data`).
4. Variables de entorno recomendadas:
   - `JWT_SECRET`: un valor seguro (obligatorio)
   - `DB_PATH=/var/data/data.sqlite`
   - `UPLOADS_DIR=/var/data/uploads`

### Vercel

Vercel es ideal para frontend estático y funciones serverless. En este proyecto, el backend usa SQLite y subidas a disco, por lo que Vercel no es el objetivo recomendado para el backend.

Si quieres usar Vercel, la ruta práctica es:

- Desplegar el backend en Render/Railway/Fly.io con disco persistente.
- Mantener el frontend en el mismo backend (como ahora) o mover el frontend a Vercel apuntando a la URL del backend.

## 5. Modelo de datos

### Entidad `faces`

Representa tanto rostros generados por IA como rostros de personas reales.

- `id` integer, PK.
- `type` text, `AI` o `REAL`.
- `image_path` text, ruta pública de la imagen.
- `display_name` text opcional.
- `elo_rating` real, índice de preferencia, inicial 1200.
- `is_ai_generated` integer booleano.
- `consent_given` integer booleano.
- `consent_revoked_at` text ISO opcional.
- `is_public` integer booleano.
- `revocation_token_hash` text, hash del token privado para revocar.
- `reports_count` integer, contador de reportes.
- `created_at` text ISO.
- `updated_at` text ISO.

Reglas:

- Rostros `type = 'REAL'` solo se muestran si `consent_given = 1`, `is_public = 1` y `consent_revoked_at` es nulo.
- Rostros `type = 'AI'` se consideran siempre no personales, pero se respeta igualmente `is_public` y `consent_revoked_at` para quien desee ocultarlos.

### Entidad `votes`

- `id` integer PK.
- `face_a_id` integer FK a `faces.id`.
- `face_b_id` integer FK a `faces.id`.
- `winner_face_id` integer FK a `faces.id`, puede ser nulo si hay empate.
- `is_tie` integer booleano.
- `voter_ip_hash` text hash de IP.
- `user_agent` text truncado.
- `user_id` integer FK a `users.id` cuando hay sesión.
- `incident` text opcional para registrar incidencias.
- `created_at` text ISO.

Se usa para:

- Auditoría básica de votos.
- Posibles análisis futuros de sesgos o patrones de uso.

### Entidad `reports`

- `id` integer PK.
- `face_id` integer FK.
- `reason` text opcional.
- `created_at` text ISO.

Se usa para moderación:

- Si `reports_count` para un rostro supera un umbral (5), se marca como no público.

### Entidad `users`

Tabla de cuentas registradas para habilitar duelos de personas reales, subida autenticada y auditoría de actividad.

## 6. Implementación del sistema de ranking (ELO)

Ubicada en `backend/src/elo.js`.

- Cada rostro tiene `elo_rating`, inicializado en 1200.
- Para un duelo entre A y B:
  - Se calcula la expectativa de victoria de cada uno.
  - Se actualiza según el resultado:
    - A gana: resultado `"A"`.
    - B gana: resultado `"B"`.
    - Empate: resultado `"T"`.
- Factor K dinámico:
  - `K = 32` para ratings menores a 1800.
  - `K = 24` para ratings entre 1800 y 2100.
  - `K = 16` para ratings superiores.
- Se aplica un rango de seguridad:
  - `elo_rating` se limita a entre 800 y 2400 para evitar valores extremos.

Lógica principal:

- El frontend envía un voto con `faceAId`, `faceBId` y `winnerFaceId` o marca `isTie`.
- El backend recupera los dos ratings actuales, ejecuta `updateElo`, actualiza ambos registros y devuelve los nuevos ratings al cliente.

## 7. API funcional

Base de la API: `/api`.

### Rostros

#### `POST /api/faces/upload`

Subida de rostros.

Body: `multipart/form-data`

- Campos:
  - `type`: `AI` o `REAL`.
  - `displayName`: opcional.
  - `image`: archivo de imagen.
  - Para `REAL`:
    - `confirmOwnership`: `"true"`.
    - `acceptPublicRanking`: `"true"`.
    - `acceptTerms`: `"true"`.
  - Para `AI`:
    - `confirmAiSource`: `"true"`.

Validación:

- Formatos de imagen permitidos: JPEG, PNG, WebP.
- Tamaño máximo 5 MB.
- Para `REAL` se exige aceptación explícita de consentimiento.
- sharp verifica que el archivo sea una imagen válida.

Respuesta `201`:

```json
{
  "id": 1,
  "type": "REAL",
  "imagePath": "/uploads/...",
  "displayName": "Nombre",
  "eloRating": 1200,
  "revocationToken": "token-privado-largo"
}
```

El `revocationToken` se muestra una sola vez y permite revocar el consentimiento sin guardar datos personales.

#### `GET /api/faces/duel?category=AI|REAL`

Devuelve dos rostros aleatorios elegibles para duelo en la categoría indicada.

- `category=AI`: disponible en modo invitado (sin autenticación).
- `category=REAL`: requiere sesión válida (JWT) y cuenta activa/no suspendida con perfil completado.

Respuesta `200`:

```json
{
  "faces": [
    {
      "id": 1,
      "type": "REAL",
      "imagePath": "/uploads/...",
      "displayName": "Persona 1",
      "eloRating": 1200
    },
    {
      "id": 2,
      "type": "REAL",
      "imagePath": "/uploads/...",
      "displayName": "Persona 2",
      "eloRating": 1200
    }
  ]
}
```

### Votos

#### `POST /api/votes`

Body JSON:

- `faceAId`: id del rostro A.
- `faceBId`: id del rostro B.
- `winnerFaceId`: id del rostro ganador, opcional si hay empate.
- `isTie`: booleano, indica empate si es `true`.

Respuesta `200`:

```json
{
  "newRatings": {
    "1": 1212.3,
    "2": 1187.7
  }
}
```

Se aplica rate limiting específico a este endpoint para prevenir spam.

Autenticación:

- Si el duelo es `AI vs AI`, se permite votar sin sesión.
- Si participa cualquier rostro `REAL`, se requiere sesión válida y el voto queda auditado con `user_id`.

### Rankings

#### `GET /api/rankings?category=AI|REAL|ALL&limit=50`

Devuelve ranking global de la categoría. Para `REAL` y `ALL` requiere sesión válida.

```json
{
  "faces": [
    {
      "id": 1,
      "type": "AI",
      "imagePath": "/uploads/...",
      "displayName": "IA 1",
      "eloRating": 1450.2
    }
  ]
}
```

### Consentimiento

#### `POST /api/consent/revoke`

Body JSON:

- `token`: token de revocación entregado al subir el rostro.

Efectos:

- Establece `is_public = 0`.
- Rellena `consent_revoked_at`.
- El rostro deja de aparecer en rankings y duelos.

Respuesta `200`:

```json
{ "success": true }
```

### Reportes

#### `POST /api/reports`

Body JSON:

- `faceId`: id del rostro a reportar.
- `reason`: texto opcional.

Comportamiento:

- Registra un reporte asociado al rostro.
- Incrementa `reports_count`.
- Si el total de reportes llega a 5, el rostro pasa a `is_public = 0`.

Respuesta:

```json
{
  "success": true,
  "hidden": false
}
```

## 7. Frontend básico operativo

Características:

- Minimalista, mobile-first, con un solo HTML.
- Pestañas:
  - Duelo: muestra dos rostros según modo seleccionado (IA o reales).
  - Subir rostro: formulario con validaciones de consentimiento.
  - Rankings: listas ordenadas de rostros IA y reales.
  - Revocar consentimiento: formulario para pegar el token de revocación.
- Flujo:
  - El usuario primero acepta un cuadro de consentimiento informado.
  - Luego puede interactuar con el sistema.
- En duelos:
  - Botones de preferencia sin lenguaje negativo.
  - Botón para saltar duelo si el usuario prefiere no elegir.
- Interacción con la API usando `fetch`.

## 8. Seguridad, ética y privacidad

- Validación de imágenes:
  - Se limita el tipo MIME a JPEG, PNG y WebP.
  - Se limita el tamaño máximo de archivo.
  - sharp intenta leer metadatos de la imagen, y si falla, se rechaza.
- Prevención de abuso:
  - Rate limiting global y específico para votos.
  - Sistema de reportes con umbral para ocultar rostros problemáticos.
- Datos sensibles:
  - No se almacenan IPs en texto claro, solo un hash mediante SHA-256.
  - No se almacenan emails ni nombres reales; el nombre para mostrar es opcional y puede ser un alias.
  - Revocación de consentimiento basada en token, sin necesidad de identificar personalmente al usuario.
- Lenguaje y UX:
  - Se evita cualquier lenguaje de evaluación personal negativa.
  - Solo se habla de preferencias y de un “índice de preferencia”.

## 9. Puesta en marcha

Requisitos:

- Node.js 18 o superior instalado.

Pasos:

```bash
cd backend
npm install
npm test
npm start
```

Luego abrir en el navegador:

- `http://localhost:3000`

## 10. Evolución futura

- Migrar la base de datos a Postgres con un ORM si se escala el tráfico.
- Añadir autenticación opcional para usuarios que quieran gestionar varios rostros.
- Integrar un servicio de almacenamiento de objetos (S3, GCS) para imágenes.
- Añadir una capa de moderación asistida por IA para contenido inapropiado.
- Incorporar tests automatizados de API y de UI.
