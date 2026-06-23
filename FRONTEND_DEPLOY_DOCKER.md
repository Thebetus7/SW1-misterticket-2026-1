# Despliegue Frontend MisterTicket (Next.js) en AWS - CON DOCKER 🐳

Este método empaqueta tu app Next.js dentro de un contenedor Docker que corre sobre una EC2 con **Amazon Linux 2023**. La EC2 solo necesita Docker — todo Node.js, dependencias y build viven aislados dentro de la imagen.

> **Stack del frontend:**
> - Next.js 14 + React 18 + TailwindCSS
> - Variable de entorno clave: `NEXT_PUBLIC_API_URL`
> - Carpeta del proyecto: `frontend/` (con `package.json`, `next.config.js`, `src/`).
> - `node_modules/` y `.next/` **NO** se suben a Git — Docker los reconstruye.

> El `docker-compose.yml` que ya existe en la raíz apunta a `./frontend/Dockerfile`, pero ese archivo aún no existe. Hay que crearlo (ver paso 5).

---

## 1. Crear el Servidor EC2 (Consola Web de AWS)

1. **Nombre y etiquetas:** `misterticket-frontend-docker`.
2. **AMI:** **Amazon Linux 2023 AMI**.
3. **Tipo de instancia:** `t3.small` recomendado (el `next build` consume RAM). `t2.micro` funciona si agregas swap (paso 3).
4. **Par de claves (inicio de sesión):**
   * **"Crear un nuevo par de claves"**, llámalo `misterticket-frontend-docker-key`.
   * **RSA**, **`.pem`**. Guárdalo en tu carpeta `.ssh/`.
5. **Configuraciones de red:**
   * **Asignación automática de IP pública:** Habilitar.
   * Grupo de seguridad con:
     * **SSH** (22) desde `0.0.0.0/0`.
     * **HTTP** (80) desde `0.0.0.0/0`.
     * **TCP personalizado** puerto `3000`, origen `0.0.0.0/0` *(opcional, para probar Next.js sin Nginx)*.
6. **Almacenamiento:** **`16 GiB` gp3** (imágenes Docker + build de Next.js).
7. **Detalles avanzados:** No tocar nada. Datos de usuario **vacío**.
8. **Lanzar instancia**.

---

## 2. Conectarse vía SSH (En tu PC Local - Git Bash)

```bash
chmod 400 misterticket-frontend-docker-key.pem
ssh -i misterticket-frontend-docker-key.pem ec2-user@IP_AWS
```

---

## 3. Instalar Docker, Compose y Git (En el Servidor AWS)

```bash
sudo dnf update -y
sudo dnf install -y git docker

sudo systemctl enable docker
sudo systemctl start docker

sudo usermod -aG docker ec2-user

# Docker Compose v2 (plugin)
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64 \
     -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

docker --version
docker compose version
```

> Sal con `exit` y vuelve a entrar por SSH para que el grupo `docker` surta efecto.

### (Solo en t2.micro) Swap para evitar OOM durante el build

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

## 5. Crear el `Dockerfile` del Frontend

Lo recomendable es crearlo en tu **PC local**, hacer commit + push, y luego `git pull` en el servidor.

### Contenido sugerido de `frontend/Dockerfile` (multi-stage, optimizado)

```dockerfile
# ---------- Etapa 1: deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- Etapa 2: build ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variable pública incrustada en el bundle al compilar
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

# ---------- Etapa 3: runner ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copiar solo lo necesario para correr
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js

EXPOSE 3000
CMD ["npm", "run", "start"]
```

> **¿Por qué multi-stage?** La imagen final no incluye los archivos de desarrollo ni el caché del build → más liviana y segura.

### Crear también `.dockerignore` en `frontend/`

```
node_modules
.next
.git
Dockerfile
.dockerignore
npm-debug.log
README.md
```

Esto evita copiar basura al contenedor.

---

## 6. Crear `docker-compose.prod.yml` para el Frontend

En la raíz del proyecto (junto al `docker-compose.yml` existente), crea **`docker-compose.frontend.prod.yml`**:

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    container_name: misterticket_frontend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
    restart: unless-stopped
```

> **Importante:** `NEXT_PUBLIC_API_URL` se pasa como `build arg` para que se incruste en el bundle al hacer `npm run build` dentro de la imagen. Si solo la pasas como `environment`, Next.js **no la leerá** en componentes cliente.

---

## 7. Crear el `.env` del Frontend (En el Servidor AWS)

En la raíz del proyecto en la EC2:

```bash
cd /home/ec2-user/SW1-misterticket-2026-1
nano .env
```

Pega esto (reemplaza con la IP pública real de tu **backend EC2**):

```env
NEXT_PUBLIC_API_URL=http://IP_AWS_BACKEND:8000/api
```

> Si más adelante apagas/enciendes la EC2 del backend, su IP cambia y debes editar este archivo y **reconstruir** la imagen del frontend.

---

## 8. Construir y Levantar el Contenedor (En el Servidor AWS)

```bash
cd /home/ec2-user/SW1-misterticket-2026-1

# Construir la imagen (la primera vez tarda varios minutos)
docker compose -f docker-compose.frontend.prod.yml build

# Levantar en segundo plano
docker compose -f docker-compose.frontend.prod.yml up -d

# Ver estado
docker compose -f docker-compose.frontend.prod.yml ps

# Ver logs
docker compose -f docker-compose.frontend.prod.yml logs -f frontend
```

Tu frontend ya responde en `http://IP_AWS:3000`.

---

## 9. (Opcional) Nginx como Reverse Proxy en el puerto 80

Para que los usuarios entren a `http://IP_AWS` sin escribir `:3000`, levanta Nginx **también como contenedor** o instalado en el host.

### Opción rápida: Nginx en el host (sin Docker)

```bash
sudo dnf install -y nginx
sudo nano /etc/nginx/conf.d/misterticket.conf
```

Pega:

```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl start nginx
```

Ahora `http://IP_AWS` muestra la web sin puerto.

---

## 🔄 ¿Cómo subir actualizaciones (cuando cambies código)?

Flujo: empujas con Git desde tu PC, bajas en el servidor con `git pull`, reconstruyes la imagen.

### Paso A: Desde tu PC Local (PowerShell o Git Bash)

```bash
cd "c:/EDBERTO/ULT SEMESTRE/SW1/FINAL/MisterTicket"

git status
git add .
git commit -m "feat: cambios del frontend"

# En tu rama:
git push origin branch-edberto
# Luego Pull Request en GitHub: branch-edberto → master → Merge.

# O directo a master:
git push origin master
```

### Paso B: En el Servidor AWS (SSH)

```bash
# Entrar por SSH
ssh -i ~/.ssh/misterticket-frontend-docker-key.pem ec2-user@IP_AWS

cd /home/ec2-user/SW1-misterticket-2026-1

# Traer cambios
git pull origin master

# Reconstruir la imagen (necesario porque el build de Next.js se hace dentro del Dockerfile)
docker compose -f docker-compose.frontend.prod.yml build frontend

# Reiniciar el contenedor con la nueva imagen
docker compose -f docker-compose.frontend.prod.yml up -d frontend

# Ver logs para confirmar
docker compose -f docker-compose.frontend.prod.yml logs -f frontend
```

> Si cambiaste la IP del backend, antes de reconstruir edita el `.env` de la raíz con la nueva `NEXT_PUBLIC_API_URL`. La variable se "incrusta" en el build, por eso es obligatorio reconstruir cada vez.

---

## ⚖️ Diferencias / Comparativa

* **Ventajas:**
  * **Reproducible:** la misma imagen sirve en cualquier servidor con Docker.
  * El host no necesita Node.js instalado.
  * Multi-stage builds → imagen final pequeña, sin dependencias de desarrollo.
  * `restart: unless-stopped` resuelve los reinicios automáticos sin PM2.
* **Desventajas:**
  * El `npm run build` corre cada vez que reconstruyes → tarda más que un `git pull` + `npm run build` en vanilla.
  * Más uso de RAM/disco que la versión vanilla.
  * Requiere reconstruir la imagen cuando cambia `NEXT_PUBLIC_API_URL` (no basta con reiniciar).

---

## 🛑 ¿Cómo apagar servicios para ahorrar facturación?

### Opción A: Detener solo el contenedor (la EC2 sigue encendida)

```bash
cd /home/ec2-user/SW1-misterticket-2026-1

# Detener sin borrar (rápido para volver)
docker compose -f docker-compose.frontend.prod.yml stop

# O detener Y borrar contenedor (más limpio)
docker compose -f docker-compose.frontend.prod.yml down
```

> AWS seguirá cobrando las horas de la EC2.

### Opción B: Detener la Instancia EC2 completa (Recomendado)

1. **Consola AWS** → **EC2** → **Instancias**.
2. Selecciona `misterticket-frontend-docker`.
3. **Estado de la instancia** → **Detener instancia**.
4. ⚠️ **NUNCA** uses **Terminar instancia**.

---

## 🚀 ¿Cómo volver a encender los servicios?

### Si detuviste la Instancia EC2 completa (Opción B)

1. **Consola AWS** → **Iniciar instancia**.
2. ⚠️ **La IP pública cambia.** Comparte la nueva IP con tus usuarios o actualiza el DNS.
3. Conéctate:
   ```bash
   ssh -i misterticket-frontend-docker-key.pem ec2-user@NUEVA_IP_AWS
   ```
4. Docker está con `enable` y los contenedores con `restart: unless-stopped`, así que se levantan solos. Verifica:
   ```bash
   cd /home/ec2-user/SW1-misterticket-2026-1
   docker compose -f docker-compose.frontend.prod.yml ps
   ```
5. Si el backend también cambió de IP, edita `.env` y reconstruye:
   ```bash
   nano .env
   docker compose -f docker-compose.frontend.prod.yml build frontend
   docker compose -f docker-compose.frontend.prod.yml up -d frontend
   ```

### Si solo detuviste los contenedores (Opción A)

```bash
cd /home/ec2-user/SW1-misterticket-2026-1

# Si usaste "stop":
docker compose -f docker-compose.frontend.prod.yml start

# Si usaste "down":
docker compose -f docker-compose.frontend.prod.yml up -d
```

---

## ⚠️ Solución de Problemas Comunes (Troubleshooting)

### 1. La página carga pero `Failed to fetch` al hacer login
La variable `NEXT_PUBLIC_API_URL` no se incrustó correctamente. Verifica:
```bash
# Entrar al contenedor y revisar
docker compose -f docker-compose.frontend.prod.yml exec frontend sh
grep -r "8000/api" .next/ | head -3
```
Si ves la IP correcta, el problema es el backend. Si ves `localhost:8000/api`, no pasaste el build arg → reconstruye con el `.env` corregido.

### 2. `Killed` durante el `npm run build` (OOM)
Se te acabó la RAM. Agrega swap (ver paso 3) o sube la instancia a `t3.small`.

### 3. `docker compose: command not found`
Falta instalar el plugin v2 (paso 3).

### 4. `permission denied ... /var/run/docker.sock`
Falta cerrar y reabrir la sesión SSH después de `usermod -aG docker ec2-user`.

### 5. Cambios en el código no aparecen
Hiciste `git pull` pero no reconstruiste la imagen. Para Next.js en producción **siempre** hay que reconstruir:
```bash
docker compose -f docker-compose.frontend.prod.yml build frontend
docker compose -f docker-compose.frontend.prod.yml up -d frontend
```

### 6. Quiero ver el HTML generado para depurar
```bash
docker compose -f docker-compose.frontend.prod.yml exec frontend sh
ls .next/server/app/
```

### 7. Liberar espacio en disco
```bash
docker system df            # ver uso
docker image prune          # borrar imágenes huérfanas
docker builder prune        # borrar caché de builds
```
