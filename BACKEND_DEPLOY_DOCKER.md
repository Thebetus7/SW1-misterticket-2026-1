# Despliegue Backend MisterTicket (Django + PostgreSQL) en AWS - CON DOCKER 🐳

Este enfoque empaqueta tu backend Django y la base de datos PostgreSQL dentro de **contenedores Docker** que corren sobre una EC2 con **Amazon Linux 2023**. Es el método recomendado: el servidor solo necesita Docker, todo lo demás (Python, dependencias, Postgres) vive aislado en los contenedores.

> **Stack del backend:**
> - Django 5.0 + DRF + JWT + Gunicorn
> - PostgreSQL 15 (en su propio contenedor)
> - Carpeta del proyecto: `backend/` con `requirements.txt`, `manage.py`, `.env`, `core/settings.py`
> - El entorno virtual `venv/` **NO** se sube al servidor — Docker construye su propio entorno aislado.

> **Buena noticia:** ya existe un `docker-compose.yml` en la raíz del proyecto que orquesta backend + base de datos. Solo falta crear el `Dockerfile` del backend (no existe aún).

---

## 1. Crear el Servidor EC2 (Consola Web de AWS)

1. **Nombre y etiquetas:** `misterticket-backend-docker`.
2. **AMI:** **Amazon Linux 2023 AMI** (capa gratuita).
3. **Tipo de instancia:** `t3.small` recomendado (Docker + Django + Postgres exigen RAM). Si solo puedes `t2.micro`, agrega swap (más abajo).
4. **Par de claves (inicio de sesión):**
   * **"Crear un nuevo par de claves"**, llámalo `misterticket-backend-docker-key`.
   * **RSA**, formato **`.pem`**. Guárdalo en tu carpeta `.ssh/`.
5. **Configuraciones de red:**
   * **Asignación automática de IP pública:** Habilitar.
   * Crear un grupo de seguridad con:
     * Regla 1 — **SSH** (puerto 22) desde `0.0.0.0/0`.
     * Regla 2 — **TCP personalizado** puerto `8000`, origen `0.0.0.0/0`, descripción `Backend Django MisterTicket`.
6. **Almacenamiento:** Sube a **`20 GiB` gp3** (las imágenes Docker + Postgres consumen disco).
7. **Detalles avanzados:** No tocar nada. Datos de usuario **vacío**.
8. **Lanzar instancia**.

---

## 2. Conectarse vía SSH (En tu PC Local - Git Bash)

```bash
chmod 400 misterticket-backend-docker-key.pem
ssh -i misterticket-backend-docker-key.pem ec2-user@IP_AWS
```

Cuando veas `[ec2-user@ip-... ~]$`, estás dentro.

---

## 3. Instalar Docker, Docker Compose y Git (En el Servidor AWS)

```bash
# Actualizar paquetes
sudo dnf update -y

# Git
sudo dnf install -y git

# Docker
sudo dnf install -y docker

# Iniciar y habilitar Docker
sudo systemctl enable docker
sudo systemctl start docker

# Permitir a ec2-user usar docker sin sudo
sudo usermod -aG docker ec2-user

# Plugin de Compose (Docker Compose v2)
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64 \
     -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Verificar
docker --version
docker compose version
```

> **Importante:** Cierra la sesión SSH (`exit`) y vuelve a entrar para que el grupo `docker` surta efecto. Si no, `docker ps` pedirá `sudo`.

### (Solo si usas t2.micro) Agregar swap para evitar OOM

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 4. Clonar el Proyecto desde GitHub (En el Servidor AWS)

```bash
cd /home/ec2-user

git clone https://github.com/Thebetus7/SW1-misterticket-2026-1.git

cd SW1-misterticket-2026-1
```

---

## 5. Crear el `Dockerfile` del Backend (En el Servidor AWS o en tu PC y subir)

El proyecto ya tiene `docker-compose.yml` en la raíz que apunta a `./backend/Dockerfile`, pero ese archivo aún no existe. Hay que crearlo.

> **Opción recomendada:** créalo en tu PC local, súbelo con `git push`, y luego haces `git pull` en el servidor.

### Contenido de `backend/Dockerfile`

```dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Dependencias del sistema para psycopg2, Pillow, etc.
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar dependencias Python (capa cacheada)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt

# Copiar el resto del proyecto
COPY . .

EXPOSE 8000

# Comando por defecto (lo sobreescribe docker-compose.yml en dev con runserver)
CMD ["gunicorn", "--workers", "3", "--bind", "0.0.0.0:8000", "core.wsgi:application"]
```

---

## 6. Ajustar `docker-compose.yml` para Producción

El `docker-compose.yml` que ya existe está pensado para **desarrollo** (usa `runserver` y monta el código como volumen). Para producción conviene un override más limpio. Crea un archivo nuevo en la raíz del proyecto:

### `docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    container_name: misterticket_db
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
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
      - ./backend/.env
    environment:
      - DB_HOST=db
      - DB_PORT=5432
    ports:
      - "8000:8000"
    volumes:
      - static_volume:/app/staticfiles
      - media_volume:/app/media
    depends_on:
      - db
    restart: unless-stopped

volumes:
  postgres_data:
  static_volume:
  media_volume:
```

> Este archivo levanta Postgres y el backend con Gunicorn, aplica migraciones automáticamente al arrancar y persiste la BD en un volumen Docker.

---

## 7. Crear el `.env` del Backend (En el Servidor AWS)

Recuerda que `backend/.env` **no se sube a Git**. Hay que crearlo a mano en el servidor:

```bash
cd /home/ec2-user/SW1-misterticket-2026-1/backend
nano .env
```

Pega esto y cambia las contraseñas/claves reales:

```env
SECRET_KEY=cambia-esta-clave-por-una-larga-y-aleatoria
DEBUG=False

# Postgres dentro de Docker → host es el nombre del servicio "db"
DB_NAME=misterticket
DB_USER=mt_user
DB_PASSWORD=mt_password_seguro
DB_HOST=db
DB_PORT=5432

# Storage (False = local dentro del contenedor; True = AWS S3)
USE_S3=False

# Stripe (modo test)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

Guarda con `Ctrl+O`, `Enter`, `Ctrl+X`.

> El `docker-compose.prod.yml` también lee `DB_NAME`, `DB_USER`, `DB_PASSWORD` para el contenedor de Postgres. Asegúrate de que coincidan.

---

## 8. Construir y Levantar los Contenedores (En el Servidor AWS)

Desde la raíz del proyecto (`/home/ec2-user/SW1-misterticket-2026-1`):

```bash
# Construir las imágenes (la primera vez tarda varios minutos)
docker compose -f docker-compose.prod.yml build

# Levantar en segundo plano (-d = detached)
docker compose -f docker-compose.prod.yml up -d

# Ver contenedores corriendo
docker compose -f docker-compose.prod.yml ps

# Ver logs en vivo (Ctrl+C para salir, los contenedores siguen corriendo)
docker compose -f docker-compose.prod.yml logs -f backend
```

---

## 9. Ejecutar Seeders y Superusuario (Dentro del contenedor)

```bash
# Entrar al contenedor del backend
docker compose -f docker-compose.prod.yml exec backend bash

# Dentro del contenedor:
python manage.py seed_admin
python manage.py seeder_add_artistas
python manage.py seeder_eventos
exit
```

> Alternativamente, sin entrar al contenedor:
> ```bash
> docker compose -f docker-compose.prod.yml exec backend python manage.py seed_admin
> ```

En este punto, tu API responde en `http://IP_AWS:8000/api/...` y el admin en `http://IP_AWS:8000/admin/`.

---

## 🔄 ¿Cómo subir actualizaciones (cuando cambies código)?

El flujo es exactamente igual: empujas con Git desde tu PC, bajas en el servidor con `git pull` y reconstruyes contenedores.

### Paso A: Desde tu PC Local (PowerShell o Git Bash)

```bash
cd "c:/EDBERTO/ULT SEMESTRE/SW1/FINAL/MisterTicket"

git status
git add .
git commit -m "feat: cambios del backend"

# Si trabajas en una rama propia:
git push origin branch-edberto
# Luego haces Pull Request en GitHub: branch-edberto → master → Merge.

# Si trabajas directo en master:
git push origin master
```

### Paso B: En el Servidor AWS (SSH)

```bash
# Conectarte
ssh -i ~/.ssh/misterticket-backend-docker-key.pem ec2-user@IP_AWS

# Ir al proyecto
cd /home/ec2-user/SW1-misterticket-2026-1

# Bajar cambios
git pull origin master

# Reconstruir las imágenes (necesario si cambió requirements.txt o el Dockerfile)
docker compose -f docker-compose.prod.yml build backend

# Reiniciar el contenedor con la nueva imagen
docker compose -f docker-compose.prod.yml up -d backend

# Si solo cambió código Python (no dependencias), basta con restart:
# docker compose -f docker-compose.prod.yml restart backend

# Ver logs para confirmar que arrancó bien
docker compose -f docker-compose.prod.yml logs -f backend
```

> Las migraciones se ejecutan automáticamente al arrancar el contenedor (porque está en el `command:` del `docker-compose.prod.yml`).

---

## ⚖️ Diferencias / Comparativa

* **Ventajas:**
  * **Reproducible:** la misma imagen funciona en cualquier servidor con Docker.
  * **Sin instalar Python/Postgres en el host:** la EC2 solo tiene Docker.
  * **Aislado:** si rompes el contenedor, no afectas al sistema operativo.
  * **Más fácil de actualizar:** un `docker compose up -d --build` y listo.
* **Desventajas:**
  * Consume más RAM y disco (las imágenes pesan).
  * Curva de aprendizaje de Docker.
  * En `t2.micro` puede ir justo de memoria si no hay swap.

---

## 🛑 ¿Cómo apagar servicios para ahorrar facturación?

### Opción A: Detener solo los contenedores (la EC2 sigue encendida)

```bash
cd /home/ec2-user/SW1-misterticket-2026-1

# Detener sin borrar los contenedores (más rápido para volver a arrancar)
docker compose -f docker-compose.prod.yml stop

# O detener Y borrar contenedores (los volúmenes con datos se conservan)
docker compose -f docker-compose.prod.yml down
```

> AWS seguirá cobrando las horas de la EC2.

### Opción B: Detener la Instancia EC2 completa (Recomendado para ahorrar)

1. **Consola AWS** → **EC2** → **Instancias**.
2. Selecciona `misterticket-backend-docker`.
3. **Estado de la instancia** → **Detener instancia**.
4. ⚠️ **NUNCA** uses **Terminar instancia**: borraría todo, incluidos los volúmenes de Postgres.

---

## 🚀 ¿Cómo volver a encender los servicios?

### Si detuviste la Instancia EC2 completa (Opción B)

1. **Consola AWS** → **EC2** → **Instancias** → **Iniciar instancia**.
2. ⚠️ **La IP pública cambia.** Actualiza:
   * `NEXT_PUBLIC_API_URL` en el frontend.
   * URL del backend en la app móvil Flutter.
3. Conéctate:
   ```bash
   ssh -i misterticket-backend-docker-key.pem ec2-user@NUEVA_IP_AWS
   ```
4. Docker está con `enable`, así que arranca solo. Si no:
   ```bash
   sudo systemctl start docker
   ```
5. Levantar contenedores otra vez (si pusiste `restart: unless-stopped` en el compose, deberían levantar solos):
   ```bash
   cd /home/ec2-user/SW1-misterticket-2026-1
   docker compose -f docker-compose.prod.yml up -d
   docker compose -f docker-compose.prod.yml ps
   ```

### Si solo detuviste los contenedores (Opción A)

```bash
cd /home/ec2-user/SW1-misterticket-2026-1

# Si usaste "stop":
docker compose -f docker-compose.prod.yml start

# Si usaste "down":
docker compose -f docker-compose.prod.yml up -d
```

---

## ⚠️ Solución de Problemas Comunes (Troubleshooting)

### 1. `docker compose: command not found`
Falta instalar el plugin v2 (mira el paso 3). En Amazon Linux 2023 ya no viene el viejo `docker-compose` con guion.

### 2. `permission denied while trying to connect to the Docker daemon socket`
Falta cerrar y volver a abrir la sesión SSH después de `usermod -aG docker ec2-user`. O usa `sudo docker ...`.

### 3. El backend no arranca: `could not connect to server: Connection refused`
El contenedor `backend` arrancó antes que `db`. Espera unos segundos y revisa:
```bash
docker compose -f docker-compose.prod.yml logs db
docker compose -f docker-compose.prod.yml restart backend
```

### 4. `ALLOWED_HOSTS` rechaza peticiones
Tu `core/settings.py` ya tiene `ALLOWED_HOSTS = ['*']`, así que no debería pasar. Si lo restringes en producción, agrega la IP/dominio del servidor.

### 5. Cambios en el código no se ven reflejados
En el `docker-compose.prod.yml` no estás montando el código como volumen (a diferencia del de desarrollo). Tras un `git pull` debes reconstruir o reiniciar:
```bash
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml up -d backend
```

### 6. Quiero entrar a la base de datos manualmente
```bash
docker compose -f docker-compose.prod.yml exec db psql -U mt_user -d misterticket
```

### 7. Quiero ver cuánto disco usan los contenedores
```bash
docker system df
# Limpiar imágenes y volúmenes huérfanos (cuidado con los datos)
docker system prune
```
