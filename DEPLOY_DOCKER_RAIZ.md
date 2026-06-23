# Despliegue MisterTicket completo desde la raíz — CON DOCKER 🐳

Esta guía levanta **todo el proyecto** (PostgreSQL + Backend Django + Frontend Next.js + MinIO en desarrollo) con **un solo comando** desde la carpeta raíz `MisterTicket/`, usando el `docker-compose.yml` que ya existe ahí.

> **Almacenamiento de archivos:** en **local** se usa **MinIO** (simula S3). En **producción AWS** debes configurar un bucket **S3 real** en la consola de AWS — ver sección **6.1** y usar `docker-compose.prod.aws.yml`.

> **Repositorio:** `https://github.com/Thebetus7/SW1-misterticket-2026-1.git`
>
> **Estructura del proyecto:**
> ```
> MisterTicket/
> ├── docker-compose.yml          ← Orquesta todos los servicios (desde aquí se levanta todo)
> ├── docker-compose.prod.yml     ← Variante producción (crear según esta guía)
> ├── backend/
> │   ├── Dockerfile              ← Crear (ver sección 2)
> │   ├── .dockerignore           ← Crear (ver sección 2)
> │   ├── .env                    ← Variables locales (NO se sube a Git)
> │   ├── requirements.txt
> │   ├── manage.py
> │   └── venv/                   ← IGNORADO por Git; Docker no lo usa
> └── frontend/
>     ├── Dockerfile              ← Crear (ver sección 2)
>     ├── .dockerignore           ← Crear (ver sección 2)
>     ├── package.json
>     └── node_modules/           ← IGNORADO por Git; Docker lo reconstruye
> ```

---

## ¿Por qué desde la raíz?

| Ventaja | Descripción |
|---------|-------------|
| **Un solo comando** | `docker compose up` levanta DB + backend + frontend (+ MinIO) |
| **Red interna Docker** | Los servicios se hablan por nombre (`db`, `backend`, `minio`) sin configurar IPs |
| **Sin instalar Python/Node/Postgres** | Solo necesitas Docker Desktop en tu PC o Docker en el servidor |
| **Reproducible** | Tu compañero clona el repo y levanta lo mismo con los mismos pasos |
| **Independiente de `venv/`** | El entorno virtual de Python local no se usa ni se sube al servidor |

---

## Almacenamiento de archivos: MinIO vs AWS S3

MisterTicket guarda fotos de perfil, portadas de eventos, archivos de música, etc. El backend (`backend/core/settings.py`) soporta **tres modos** controlados por la variable `USE_S3`:

| Modo | Cuándo usarlo | Variable clave |
|------|---------------|----------------|
| **Local** (`USE_S3=False`) | Pruebas rápidas sin archivos en la nube | Archivos en `backend/media/` |
| **MinIO** (`USE_S3=True` + endpoint MinIO) | **Desarrollo local** y Docker en tu PC | `AWS_S3_ENDPOINT_URL=http://minio:9000` |
| **AWS S3 real** (`USE_S3=True` sin endpoint) | **Producción en AWS** | Sin `AWS_S3_ENDPOINT_URL`; credenciales IAM |

```
┌─────────────────────────────────────────────────────────────────┐
│  DESARROLLO (tu PC / Docker local)                              │
│  docker compose up  →  MinIO en contenedor  →  bucket misterticket│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PRODUCCIÓN (AWS EC2) — RECOMENDADO                             │
│  docker compose -f docker-compose.prod.aws.yml up  →  AWS S3    │
│  (NO levantar MinIO en el servidor; usar bucket S3 de AWS)      │
└─────────────────────────────────────────────────────────────────┘
```

> **Guías de referencia en el repo:**
> - MinIO local: `backend/MINIO_LOCAL.md`
> - AWS S3 en producción: `backend/S3_PRODUCCION.md`

**Qué sube el backend según configuración** (fotos de usuario, portadas, audio, etc.):
- Con MinIO: URL tipo `http://minio:9000/misterticket/usuarios/fotos/...` (interna) o `http://IP_AWS:9000/...` (pública si abres el puerto).
- Con AWS S3: URL tipo `https://misterticket-prod.s3.us-east-1.amazonaws.com/usuarios/fotos/...`

---

## 1. Requisitos previos

### En tu PC (Windows)

1. Instala **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** y reinicia la PC.
2. Abre Docker Desktop y verifica que esté corriendo (icono verde en la bandeja).
3. En PowerShell o Git Bash:
   ```powershell
   docker --version
   docker compose version
   ```

### En servidor AWS (producción)

Solo necesitas Docker + Git instalados (ver `BACKEND_DEPLOY_DOCKER.md` paso 3). **No** hace falta Python, Node ni PostgreSQL en el host.

---

## 2. Archivos que debes crear (una sola vez)

El `docker-compose.yml` de la raíz **ya referencia** `backend/Dockerfile` y `frontend/Dockerfile`, pero esos archivos **aún no existen**. Créalos antes del primer `docker compose up`.

### 2.1 `backend/Dockerfile`

```dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    libjpeg-dev \
    zlib1g-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Por defecto: Gunicorn. docker-compose.yml lo sobreescribe con runserver en desarrollo.
CMD ["gunicorn", "--workers", "3", "--bind", "0.0.0.0:8000", "core.wsgi:application"]
```

### 2.2 `backend/.dockerignore`

```
venv
__pycache__
*.pyc
*.pyo
.env
.git
media
staticfiles
*.md
```

### 2.3 `frontend/Dockerfile`

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

# Por defecto: producción. docker-compose.yml lo sobreescribe con "npm run dev" en desarrollo.
CMD ["npm", "run", "start"]
```

### 2.4 `frontend/.dockerignore`

```
node_modules
.next
.git
Dockerfile
.dockerignore
npm-debug.log
README.md
```

### 2.5 Actualizar `docker-compose.yml` de la raíz (recomendado)

El compose actual funciona, pero le faltan **MinIO**, **`env_file`** del backend y variables de Stripe/S3. Reemplaza o amplía tu `docker-compose.yml` con esto:

```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    container_name: misterticket_db
    environment:
      POSTGRES_DB: misterticket
      POSTGRES_USER: mt_user
      POSTGRES_PASSWORD: mt_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  minio:
    image: minio/minio:latest
    container_name: misterticket_minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
      MINIO_API_CORS_ALLOW_ORIGIN: "*"
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: misterticket_backend
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    env_file:
      - ./backend/.env.docker
    environment:
      - DB_NAME=misterticket
      - DB_USER=mt_user
      - DB_PASSWORD=mt_password
      - DB_HOST=db
      - DB_PORT=5432
      - AWS_S3_ENDPOINT_URL=http://minio:9000
    depends_on:
      - db
      - minio
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: misterticket_frontend
    command: npm run dev
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000/api
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  minio_data:
```

> **Nota:** Usamos `backend/.env.docker` (archivo nuevo para Docker) en lugar de tu `.env` local, porque las credenciales de DB y MinIO cambian dentro de la red Docker.

### 2.6 Crear `backend/.env.docker`

Copia tu `.env` local pero **ajusta** estos valores para que funcionen **dentro de Docker**:

```env
SECRET_KEY=django-insecure-misterticket-secret-key-default-dev
DEBUG=True

# Postgres: el host es el nombre del servicio "db", NO "localhost"
DB_NAME=misterticket
DB_USER=mt_user
DB_PASSWORD=mt_password
DB_HOST=db
DB_PORT=5432

# MinIO: el host es el nombre del servicio "minio", NO "localhost"
USE_S3=True
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_STORAGE_BUCKET_NAME=misterticket
AWS_S3_ENDPOINT_URL=http://minio:9000

# Stripe (modo test)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

> Agrega `backend/.env.docker` a `.gitignore` si contiene claves reales, o commitea una plantilla `backend/.env.docker.example` sin secretos.

---

## 3. Levantar el proyecto en LOCAL (desde la raíz)

Todos los comandos se ejecutan **desde la carpeta raíz** `MisterTicket/`:

```powershell
cd "c:\EDBERTO\ULT SEMESTRE\SW1\FINAL\MisterTicket"
```

### 3.1 Primera vez — construir e iniciar

```powershell
# Construir imágenes e iniciar todos los servicios
docker compose up --build
```

O en segundo plano:

```powershell
docker compose up --build -d
```

Espera a que todos los contenedores estén `running`. Verifica:

```powershell
docker compose ps
```

Deberías ver:

| Servicio | Puerto | URL |
|----------|--------|-----|
| `db` | 5432 | PostgreSQL interno |
| `minio` | 9000 / 9001 | http://localhost:9001 (consola web) |
| `backend` | 8000 | http://localhost:8000/api/ |
| `frontend` | 3000 | http://localhost:3000 |

### 3.2 Primera vez — migraciones y datos iniciales

Con los contenedores corriendo, en **otra terminal** (también desde la raíz):

```powershell
cd "c:\EDBERTO\ULT SEMESTRE\SW1\FINAL\MisterTicket"

# Aplicar migraciones
docker compose exec backend python manage.py migrate

# Crear superusuario y usuarios de prueba
docker compose exec backend python manage.py seed_admin

# (Opcional) Cargar artistas y eventos demo
docker compose exec backend python manage.py seeder_add_artistas
docker compose exec backend python manage.py seeder_eventos
```

### 3.3 Crear el bucket de MinIO (primera vez — solo desarrollo local)

> MinIO es **solo para desarrollo**. En AWS producción usa S3 (sección 6.1).

1. Abre http://localhost:9001 en el navegador.
2. Login: `minioadmin` / `minioadmin`.
3. Crea un bucket llamado **`misterticket`** (debe coincidir con `AWS_STORAGE_BUCKET_NAME`).
4. En **Access Policy** del bucket, ponlo **public** (para que las imágenes se vean).

### 3.4 Verificar que todo funciona

- Frontend: http://localhost:3000
- Admin Django: http://localhost:8000/admin/
- API: http://localhost:8000/api/

---

## 4. Comandos útiles del día a día (desde la raíz)

```powershell
# Ver logs de todos los servicios
docker compose logs -f

# Ver logs solo del backend
docker compose logs -f backend

# Detener todo (conserva datos en volúmenes)
docker compose down

# Detener y BORRAR volúmenes (resetea la BD — cuidado)
docker compose down -v

# Reiniciar un solo servicio
docker compose restart backend

# Entrar al contenedor del backend (shell)
docker compose exec backend bash

# Ejecutar un comando Django cualquiera
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate

# Reconstruir solo el backend tras cambiar requirements.txt
docker compose build backend
docker compose up -d backend
```

---

## 5. Desarrollo vs Producción

El `docker-compose.yml` de la raíz está pensado para **desarrollo**:
- Backend con `runserver` (hot reload al editar código Python).
- Frontend con `npm run dev` (hot reload al editar React/Next.js).
- Volúmenes montados (`./backend:/app`) para ver cambios sin reconstruir.
- **MinIO incluido** — simula S3 en tu PC (ver sección 3.3 para crear el bucket).

### Dos archivos compose para producción

| Archivo | Storage | Cuándo usarlo |
|---------|---------|---------------|
| `docker-compose.prod.yml` | MinIO en contenedor | Solo pruebas en servidor; **no recomendado en AWS real** |
| `docker-compose.prod.aws.yml` | **AWS S3** (consola AWS) | **Producción en EC2** — ver sección 6 |

### 5.1 Producción con MinIO (solo pruebas) — `docker-compose.prod.yml`

Crea este archivo junto al `docker-compose.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    container_name: misterticket_db
    environment:
      POSTGRES_DB: ${DB_NAME:-misterticket}
      POSTGRES_USER: ${DB_USER:-mt_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-mt_password}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  minio:
    image: minio/minio:latest
    container_name: misterticket_minio
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: misterticket_backend
    command: >
      sh -c "python manage.py migrate &&
             python manage.py collectstatic --noinput &&
             gunicorn --workers 3 --bind 0.0.0.0:8000 core.wsgi:application"
    env_file:
      - ./backend/.env.docker
    environment:
      - DB_HOST=db
      - DB_PORT=5432
      - DEBUG=False
      - AWS_S3_ENDPOINT_URL=http://minio:9000
    ports:
      - "8000:8000"
    volumes:
      - static_volume:/app/staticfiles
      - media_volume:/app/media
    depends_on:
      - db
      - minio
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:8000/api}
    container_name: misterticket_frontend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  minio_data:
  static_volume:
  media_volume:
```

> Para producción, el `frontend/Dockerfile` debe ser **multi-stage** (ver `FRONTEND_DEPLOY_DOCKER.md`) para que `npm run build` ocurra al construir la imagen.

Levantar en producción **con MinIO** (solo pruebas):

```powershell
docker compose -f docker-compose.prod.yml up --build -d
```

### 5.2 Producción con AWS S3 (recomendado en EC2) — `docker-compose.prod.aws.yml`

Este compose **no incluye MinIO**. El backend sube archivos directamente a un bucket S3 que configuras en la consola de AWS (sección 6.1).

Crea `docker-compose.prod.aws.yml` en la raíz:

```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    container_name: misterticket_db
    environment:
      POSTGRES_DB: ${DB_NAME:-misterticket}
      POSTGRES_USER: ${DB_USER:-mt_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-mt_password}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: misterticket_backend
    command: >
      sh -c "python manage.py migrate &&
             python manage.py collectstatic --noinput &&
             gunicorn --workers 3 --bind 0.0.0.0:8000 core.wsgi:application"
    env_file:
      - ./backend/.env.docker.aws
    environment:
      - DB_HOST=db
      - DB_PORT=5432
      - DEBUG=False
    ports:
      - "8000:8000"
    volumes:
      - static_volume:/app/staticfiles
    depends_on:
      - db
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:8000/api}
    container_name: misterticket_frontend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  static_volume:
```

### 5.3 `backend/.env.docker.aws` (variables para AWS S3)

Créalo en el servidor (nunca lo subas a Git con claves reales):

```env
SECRET_KEY=clave-larga-y-aleatoria-produccion
DEBUG=False

DB_NAME=misterticket
DB_USER=mt_user
DB_PASSWORD=mt_password_seguro
DB_HOST=db
DB_PORT=5432

# ─── AWS S3 (producción) ─────────────────────────────────────────
USE_S3=True
AWS_ACCESS_KEY_ID=AKIA...          # Del usuario IAM (sección 6.1 paso 3)
AWS_SECRET_ACCESS_KEY=wJalr...     # Secret key del CSV de IAM
AWS_STORAGE_BUCKET_NAME=misterticket-prod
AWS_S3_REGION_NAME=us-east-1       # Misma región donde creaste el bucket
# NO incluir AWS_S3_ENDPOINT_URL — vacío = AWS S3 real (ver settings.py)

STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

> Si `AWS_S3_ENDPOINT_URL` está vacío u omitido, Django usa URLs públicas HTTPS de S3 (`https://misterticket-prod.s3.us-east-1.amazonaws.com/...`).

---

## 6. Desplegar en AWS desde la raíz (un solo servidor)

Puedes levantar **todo el stack** en **una sola EC2** desde la raíz. En producción real debes usar **AWS S3** (no MinIO en el servidor).

### Flujo recomendado en AWS

```
1. Configurar S3 en la consola AWS     ← sección 6.1 (ANTES de levantar Docker)
2. Crear EC2 + instalar Docker         ← sección 6.2
3. Clonar repo + crear .env.docker.aws ← sección 6.3
4. docker compose -f docker-compose.prod.aws.yml up --build -d
5. Verificar subida de archivos a S3   ← sección 6.5
```

---

### 6.1 Configurar AWS S3 en la consola (OBLIGATORIO antes del deploy)

> Haz esto **desde tu navegador** en [AWS Console](https://console.aws.amazon.com/), **antes** de levantar los contenedores en EC2.

#### Paso 1 — Crear el bucket S3

1. Inicia sesión en AWS → busca el servicio **S3**.
2. Clic en **Create bucket**.
3. Configura:
   - **Bucket name:** `misterticket-prod` (debe ser **único globalmente**; si está ocupado prueba `misterticket-prod-sw1-2026`).
   - **AWS Region:** la más cercana (ej. `us-east-1` o `sa-east-1` para Sudamérica).
   - **Object Ownership:** **ACLs enabled** → **Bucket owner preferred**.
4. En **Block Public Access settings:**
   - **Desmarca** "Block all public access".
   - Confirma el aviso (necesario para que las fotos se vean sin login).
5. Clic en **Create bucket**.

#### Paso 2 — Política pública del bucket (Bucket Policy)

Para que las imágenes de perfil, portadas y archivos de música sean accesibles desde el frontend y la app móvil:

1. Abre el bucket `misterticket-prod` → pestaña **Permissions**.
2. **Bucket Policy** → **Edit**.
3. Pega (reemplaza el nombre del bucket si usaste otro):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::misterticket-prod/*"
    }
  ]
}
```

4. **Save changes**.

#### Paso 3 — Usuario IAM y Access Keys

> **Nunca** uses las credenciales root de tu cuenta AWS.

1. Ve a **IAM** → **Users** → **Create user**.
2. Nombre: `misterticket-s3-user`.
3. **No** marques acceso a consola AWS (solo programático).
4. **Permissions** → **Add permissions** → **Create policy** (nueva pestaña) con:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::misterticket-prod",
        "arn:aws:s3:::misterticket-prod/*"
      ]
    }
  ]
}
```

5. Nombre de la política: `MisterTicketS3Policy` → **Create policy**.
6. Asigna `MisterTicketS3Policy` al usuario `misterticket-s3-user`.
7. **Security credentials** → **Create access key** → **Application running outside AWS**.
8. **Descarga el CSV o copia las claves ahora** (AWS no las vuelve a mostrar):
   - `Access key ID` → `AWS_ACCESS_KEY_ID` en `.env.docker.aws`
   - `Secret access key` → `AWS_SECRET_ACCESS_KEY` en `.env.docker.aws`

#### Paso 4 — CORS en S3 (si el frontend accede directo al bucket)

En el bucket → **Permissions** → **Cross-origin resource sharing (CORS)** → **Edit**:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": [
      "http://IP_AWS:3000",
      "http://IP_AWS",
      "https://tu-dominio.com"
    ],
    "ExposeHeaders": []
  }
]
```

> En MisterTicket el backend sube los archivos vía Django; el frontend suele recibir URLs de S3 en las respuestas JSON. CORS en S3 ayuda si el navegador carga imágenes desde otro origen.

#### Paso 5 — (Opcional) Versionado y migrar archivos existentes

- **Versioning:** en el bucket → **Properties** → **Bucket Versioning** → Enable (recuperar archivos borrados por error).
- **Migrar desde MinIO/local** (si ya tienes archivos en desarrollo):

```bash
# En tu PC, con AWS CLI instalado y configurado (aws configure)
aws s3 sync ./backend/media/ s3://misterticket-prod/
```

---

### 6.2 Crear EC2

1. **Nombre:** `misterticket-full-docker`.
2. **AMI:** Amazon Linux 2023.
3. **Instancia:** `t3.small` mínimo (3 contenedores: db + backend + frontend).
4. **Llave:** `misterticket-full-key.pem` → guardar en `~/.ssh/`.
5. **Grupo de seguridad** — abrir estos puertos:
   | Puerto | Servicio |
   |--------|----------|
   | 22 | SSH |
   | 80 | Nginx (opcional, proxy) |
   | 3000 | Frontend Next.js |
   | 8000 | Backend Django API |
   | ~~9000 / 9001~~ | **No abrir** — en producción usas AWS S3, no MinIO |
6. **Disco:** 25 GiB gp3.
7. **Lanzar instancia**.

---

### 6.3 Instalar Docker en la EC2

```bash
ssh -i misterticket-full-key.pem ec2-user@IP_AWS

sudo dnf update -y
sudo dnf install -y git docker
sudo systemctl enable docker && sudo systemctl start docker
sudo usermod -aG docker ec2-user

# Docker Compose v2
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64 \
     -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

exit   # Salir y volver a entrar para aplicar grupo docker
```

### 6.4 Clonar y configurar (desde la raíz del repo)

```bash
ssh -i misterticket-full-key.pem ec2-user@IP_AWS

cd /home/ec2-user
git clone https://github.com/Thebetus7/SW1-misterticket-2026-1.git
cd SW1-misterticket-2026-1

# Variables del backend con credenciales AWS S3 (sección 5.3 y 6.1)
nano backend/.env.docker.aws
# Pegar SECRET_KEY, DB_*, USE_S3=True, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
# AWS_STORAGE_BUCKET_NAME=misterticket-prod, AWS_S3_REGION_NAME=us-east-1
# NO incluir AWS_S3_ENDPOINT_URL

# Variables de la raíz (frontend build + DB para compose)
nano .env
```

Contenido de `.env` en la raíz:

```env
DB_NAME=misterticket
DB_USER=mt_user
DB_PASSWORD=mt_password_seguro
NEXT_PUBLIC_API_URL=http://IP_AWS:8000/api
```

> Asegúrate de haber creado `docker-compose.prod.aws.yml` (sección 5.2) y subido esos archivos al repo con `git push` antes del `git pull` en el servidor.

---

### 6.5 Levantar todo desde la raíz (con AWS S3)

```bash
cd /home/ec2-user/SW1-misterticket-2026-1

# Producción con S3 — SIN contenedor MinIO
docker compose -f docker-compose.prod.aws.yml up --build -d

# Seeders (migrate ya corre al arrancar el backend)
docker compose -f docker-compose.prod.aws.yml exec backend python manage.py seed_admin
```

Accede a:
- Frontend: `http://IP_AWS:3000`
- API: `http://IP_AWS:8000/api/`
- Admin Django: `http://IP_AWS:8000/admin/`

> Si quieres servir el frontend en el puerto 80 sin `:3000`, instala Nginx como reverse proxy (ver `FRONTEND_DEPLOY_DOCKER.md` sección 9).

---

### 6.6 Verificar que AWS S3 funciona (después del deploy)

#### A) Comprobar que Django usa S3 y no MinIO

```bash
docker compose -f docker-compose.prod.aws.yml exec backend python manage.py shell
```

```python
from django.core.files.storage import default_storage
print(default_storage.__class__)
# Debe mostrar: <class 'storages.backends.s3boto3.S3Boto3Storage'>
exit()
```

#### B) Subir un archivo de prueba

```bash
docker compose -f docker-compose.prod.aws.yml exec backend python manage.py shell
```

```python
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

path = default_storage.save('test/hello.txt', ContentFile(b'Hola S3 desde Docker'))
print(default_storage.url(path))
# Debe retornar algo como:
# https://misterticket-prod.s3.us-east-1.amazonaws.com/test/hello.txt
exit()
```

Abre esa URL en el navegador. Si ves el texto, S3 está bien configurado.

#### C) Probar desde la API (foto de perfil)

```http
PUT http://IP_AWS:8000/api/usuarios/perfil/
Authorization: Bearer <tu_token_jwt>
Content-Type: multipart/form-data

foto: <archivo imagen>
```

La respuesta JSON debe incluir una URL **HTTPS** de S3, por ejemplo:

```json
{
  "foto": "https://misterticket-prod.s3.us-east-1.amazonaws.com/usuarios/fotos/1/foto.jpg"
}
```

#### D) Revisar en la consola AWS

1. Ve a **S3** → bucket `misterticket-prod` → pestaña **Objects**.
2. Deberías ver carpetas como `test/`, `usuarios/fotos/`, etc., tras subir archivos.

#### E) Logs si falla la subida

```bash
docker compose -f docker-compose.prod.aws.yml logs backend | grep -i storage
docker compose -f docker-compose.prod.aws.yml logs backend | grep -i s3
```

Errores frecuentes:
- `AccessDenied` → revisa IAM policy y Bucket Policy (sección 6.1).
- `NoSuchBucket` → el nombre en `AWS_STORAGE_BUCKET_NAME` no coincide con el bucket creado.
- Sigue usando MinIO → tienes `AWS_S3_ENDPOINT_URL` en `.env.docker.aws`; **elimínala** para AWS S3 real.

---

### 6.7 Alternativa: producción con MinIO en la misma EC2 (no recomendado)

Solo para pruebas académicas si **no** quieres configurar S3 en AWS:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

Deberás:
- Abrir puertos 9000/9001 en el security group.
- Crear bucket `misterticket` en http://IP_AWS:9001.
- Usar `backend/.env.docker` con `AWS_S3_ENDPOINT_URL=http://minio:9000`.

En un proyecto real en AWS, **usa siempre la sección 6.1 + `docker-compose.prod.aws.yml`**.

---

## 🔄 ¿Cómo subir actualizaciones del proyecto?

### Paso A — Desde tu PC local (GitHub Desktop o terminal)

Desde la carpeta local del proyecto:

```powershell
cd "c:\EDBERTO\ULT SEMESTRE\SW1\FINAL\MisterTicket"

git status
git add .
git commit -m "feat: descripción del cambio"

# Si trabajas en tu rama:
git push origin branch-edberto
# Luego en GitHub: Pull Request → master → Merge

# O directo a master:
git push origin master
```

### Paso B — En el servidor AWS (SSH, desde la raíz del repo)

```bash
ssh -i misterticket-full-key.pem ec2-user@IP_AWS

cd /home/ec2-user/SW1-misterticket-2026-1

# Traer cambios
git pull origin master

# Reconstruir y reiniciar (desde la raíz) — producción con S3
docker compose -f docker-compose.prod.aws.yml build
docker compose -f docker-compose.prod.aws.yml up -d

# Si hubo cambios en models.py
docker compose -f docker-compose.prod.aws.yml exec backend python manage.py migrate

# Ver logs
docker compose -f docker-compose.prod.aws.yml logs -f
```

> **Regla:** el código se cambia en tu PC → `git push` → en el servidor `git pull` → `docker compose up --build -d` desde la raíz. Nunca edites código directamente en producción.

---

## 🛑 Apagar para ahorrar en AWS

### Detener contenedores (EC2 sigue encendida — sigue cobrando)

```bash
cd /home/ec2-user/SW1-misterticket-2026-1
docker compose -f docker-compose.prod.aws.yml down
```

### Detener la EC2 completa (recomendado)

1. **Consola AWS** → **EC2** → **Instancias** → **Detener instancia**.
2. ⚠️ **NUNCA** uses **Terminar instancia**.
3. Al reiniciar, **cambia la IP pública** → actualiza `NEXT_PUBLIC_API_URL` y la URL en la app móvil Flutter.

### Volver a encender

```bash
ssh -i misterticket-full-key.pem ec2-user@NUEVA_IP_AWS
cd /home/ec2-user/SW1-misterticket-2026-1
docker compose -f docker-compose.prod.aws.yml up -d
docker compose -f docker-compose.prod.aws.yml ps
```

---

## ⚠️ Solución de Problemas (Troubleshooting)

### 1. `failed to solve: failed to read dockerfile` o `Dockerfile not found`
Faltan los archivos de la sección 2. Créalos en `backend/` y `frontend/` antes de ejecutar `docker compose up`.

### 2. `connection refused` al backend desde el frontend
- Verifica que el backend esté corriendo: `docker compose ps`
- En local, `NEXT_PUBLIC_API_URL` debe ser `http://localhost:8000/api`
- En AWS, debe ser `http://IP_AWS:8000/api` (y reconstruir el frontend si cambió)

### 3. Backend no conecta a Postgres (`could not connect to server`)
- El `.env.docker` debe tener `DB_HOST=db` (nombre del servicio), **no** `localhost`.
- Espera unos segundos tras `docker compose up`; Postgres tarda en iniciar.
- Revisa logs: `docker compose logs db`

### 4. Imágenes no se suben / error de almacenamiento

#### En desarrollo (MinIO en Docker)

- Verifica que MinIO esté corriendo: `docker compose ps minio`
- `AWS_S3_ENDPOINT_URL` debe ser `http://minio:9000` (dentro de Docker), **no** `http://localhost:9000`
- Crea el bucket `misterticket` en http://localhost:9001 y configura política pública (sección 3.3 o `backend/MINIO_LOCAL.md`)
- Reinicia el backend tras cambiar `.env.docker`: `docker compose restart backend`

#### En producción AWS (S3)

- **No** levantes MinIO; usa `docker-compose.prod.aws.yml` y `.env.docker.aws`
- **No** incluyas `AWS_S3_ENDPOINT_URL` — debe estar vacío para S3 real
- Verifica bucket, Bucket Policy e IAM (sección **6.1**)
- Comprueba en consola S3 → **Objects** si llegan archivos (sección **6.6**)
- Error `AccessDenied`: revisa que `misterticket-s3-user` tenga `MisterTicketS3Policy` y que el bucket permita lectura pública
- Error `NoSuchBucket`: `AWS_STORAGE_BUCKET_NAME` debe coincidir exactamente con el nombre del bucket en S3
- Las URLs deben ser `https://...s3...amazonaws.com/...`, no `http://minio:9000/...`

### 5. `Failed to fetch` en el navegador
- Backend caído → `docker compose logs backend`
- CORS: en desarrollo `CORS_ALLOW_ALL_ORIGINS = True` en `core/settings.py` ya está activo
- IP incorrecta en `NEXT_PUBLIC_API_URL`

### 6. Cambios en Python no se reflejan
En desarrollo el volumen `./backend:/app` monta tu código local. Si no ves cambios, reinicia:
```powershell
docker compose restart backend
```

### 7. Cambios en el frontend no se reflejan
Next.js en modo dev recarga solo. Si no funciona:
```powershell
docker compose restart frontend
```

### 8. Puerto 5432, 8000 o 3000 ya en uso
Otro servicio (Postgres local, Django en venv, Next.js local) ocupa el puerto. Detén el proceso local o cambia el mapeo en `docker-compose.yml`:
```yaml
ports:
  - "8001:8000"   # Backend accesible en localhost:8001
```

### 9. Firebase / notificaciones push no funcionan
Coloca `firebase-credentials.json` en `backend/`. El volumen `./backend:/app` lo montará dentro del contenedor. Verifica:
```powershell
docker compose exec backend ls firebase-credentials.json
```

### 10. Resetear todo (borrar BD y volúmenes)

```powershell
docker compose down -v
docker compose up --build -d
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_admin
```

---

## ⚖️ Comparativa: raíz vs despliegues separados

| Aspecto | Desde la raíz (esta guía) | Backend + Frontend separados |
|---------|---------------------------|------------------------------|
| **Comandos** | Un solo `docker compose up` | Dos servidores, dos composes |
| **Costo AWS** | 1 EC2 (`t3.small`+) | 2 EC2 (o 1 grande) |
| **Complejidad** | Baja para desarrollo/equipo | Mayor, pero más escalable |
| **Ideal para** | Desarrollo local, demos, proyectos académicos | Producción con tráfico alto |
| **Storage local/Docker** | MinIO en el mismo compose | AWS S3 (consola AWS, sección 6.1) |
| **Storage producción AWS** | `docker-compose.prod.aws.yml` + bucket S3 | Mismo enfoque |

---

## Checklist rápido — primera vez (desarrollo local con MinIO)

- [ ] Docker Desktop instalado y corriendo
- [ ] Crear `backend/Dockerfile` y `backend/.dockerignore`
- [ ] Crear `frontend/Dockerfile` y `frontend/.dockerignore`
- [ ] Crear `backend/.env.docker` con `DB_HOST=db` y `AWS_S3_ENDPOINT_URL=http://minio:9000`
- [ ] Actualizar `docker-compose.yml` de la raíz (con MinIO y `env_file`)
- [ ] Desde `MisterTicket/`: `docker compose up --build -d`
- [ ] `docker compose exec backend python manage.py migrate`
- [ ] `docker compose exec backend python manage.py seed_admin`
- [ ] Crear bucket `misterticket` en MinIO (http://localhost:9001) y política pública
- [ ] Abrir http://localhost:3000 y probar login + subida de foto

## Checklist — despliegue AWS con S3 (producción)

- [ ] **Consola AWS:** crear bucket S3 `misterticket-prod` (sección 6.1 paso 1)
- [ ] **Consola AWS:** Bucket Policy lectura pública (paso 2)
- [ ] **Consola AWS:** usuario IAM + Access Keys (paso 3)
- [ ] **Consola AWS:** CORS en el bucket si aplica (paso 4)
- [ ] Crear EC2 + security group **sin** puertos 9000/9001 (sección 6.2)
- [ ] Instalar Docker en EC2 (sección 6.3)
- [ ] Crear `docker-compose.prod.aws.yml` y `backend/.env.docker.aws` (secciones 5.2 y 5.3)
- [ ] `git push` desde tu PC → `git pull` en el servidor
- [ ] `docker compose -f docker-compose.prod.aws.yml up --build -d`
- [ ] Verificar S3 con shell Django y subida de foto (sección 6.6)
- [ ] Confirmar objetos en S3 → **Objects** en la consola AWS
