# Despliegue Frontend MisterTicket (Next.js) en AWS - SIN DOCKER (Vanilla)

Este método compila e instala tu app de Next.js directamente sobre **Amazon Linux 2023** y la sirve permanentemente con **PM2** y, opcionalmente, **Nginx** como reverse proxy en el puerto 80.

> **Stack del frontend:**
> - Next.js 14 + React 18 + TailwindCSS
> - Cliente fetch con JWT en cookies (`src/lib/api.js`)
> - Variable de entorno clave: `NEXT_PUBLIC_API_URL`
> - Carpeta del proyecto: `frontend/` (con `package.json`, `next.config.js`, `src/`, etc.)
> - `node_modules/` y `.next/` **NO** se suben a Git (están en `.gitignore`).

> **Importante:** Next.js (al usar `getServerSideProps`, `app router`, rutas dinámicas, etc.) **NO** es un sitio 100% estático. **No basta con copiar archivos a Nginx**: necesitas un proceso Node corriendo (`npm run start`). Por eso usaremos PM2 y opcionalmente Nginx como proxy.

---

## 1. Crear el Servidor EC2 (Consola Web de AWS)

1. **Nombre y etiquetas:** Ponle `misterticket-frontend`.
2. **AMI:** **Amazon Linux 2023 AMI** (capa gratuita).
3. **Tipo de instancia:** `t2.micro` o `t3.micro`.
4. **Par de claves (inicio de sesión):**
   * **"Crear un nuevo par de claves"**, llámalo `misterticket-frontend-key`.
   * **RSA**, formato **`.pem`**.
   * Presiona **Crear** y guarda `misterticket-frontend-key.pem` en tu carpeta `.ssh/`.
   > **Buena práctica:** la llave del frontend es distinta a la del backend. Si una se compromete, el otro servidor sigue seguro.
5. **Configuraciones de red:**
   * **Asignación automática de IP pública:** **Habilitar**.
   * **Crear un grupo de seguridad** con:
     * Regla 1 — **SSH** (puerto 22), origen `0.0.0.0/0` (ya viene por defecto).
     * Regla 2 — **HTTP** (puerto 80), origen `0.0.0.0/0` *(para que cualquiera vea tu web)*.
     * Regla 3 — **TCP personalizado**, puerto `3000`, origen `0.0.0.0/0` *(solo si quieres probar Next.js sin Nginx)*.
6. **Almacenamiento:** Sube a **`12 GiB` gp3** (Node y `node_modules` ocupan harto).
7. **Detalles avanzados:** No tocar nada. Datos de usuario **vacío**.
8. **Lanzar instancia**.

---

## 2. Conectarse vía SSH (En tu PC Local - Git Bash)

> Suposición: `misterticket-frontend-key.pem` ya está en tu carpeta `.ssh/` y abriste Git Bash dentro de esa carpeta.

```bash
# Solo la primera vez
chmod 400 misterticket-frontend-key.pem

# Conectarte (reemplaza IP_AWS por la IP pública real)
ssh -i misterticket-frontend-key.pem ec2-user@IP_AWS
```

La primera vez te pedirá confirmación: escribe `yes` y Enter. Cuando veas `[ec2-user@ip-... ~]$` ya estás dentro.

---

## 3. Instalar Node.js, Git y PM2 (En el Servidor AWS)

```bash
# Actualizar paquetes
sudo dnf update -y

# Git
sudo dnf install -y git

# Node.js 20 (LTS) usando NodeSource
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Verificar
node -v   # Debe mostrar v20.x.x
npm -v

# PM2: administrador de procesos Node para mantener Next.js corriendo
sudo npm install -g pm2
```

---

## 4. Clonar el Proyecto desde GitHub (En el Servidor AWS)

```bash
cd /home/ec2-user

git clone https://github.com/Thebetus7/SW1-misterticket-2026-1.git

cd SW1-misterticket-2026-1/frontend
```

---

## 5. Configurar la URL del Backend (En el Servidor AWS)

El cliente HTTP del proyecto lee `NEXT_PUBLIC_API_URL`:

```javascript
// frontend/src/lib/api.js
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
```

Por lo tanto, debes definir esa variable **antes de compilar** porque las `NEXT_PUBLIC_*` se incrustan en el bundle al hacer `npm run build`.

Crea el archivo `.env.production` dentro de `frontend/`:

```bash
nano .env.production
```

Pega esto y reemplaza con la IP pública de tu **backend** EC2 (la del otro servidor):

```env
NEXT_PUBLIC_API_URL=http://IP_AWS_BACKEND:8000/api
```

Guarda con `Ctrl+O`, `Enter`, `Ctrl+X`.

> **Importante:** Si más adelante apagas y enciendes la EC2 del backend, su IP pública cambia y tendrás que volver a editar este archivo y recompilar (paso 6).

---

## 6. Instalar Dependencias y Compilar (En el Servidor AWS)

Dentro de `frontend/`:

```bash
# Instalar todas las dependencias
npm install

# Build de producción optimizado (lee .env.production automáticamente)
npm run build
```

Esto crea la carpeta `.next/` con todo lo necesario para servir la app en modo producción.

---

## 7. Levantar Next.js con PM2 (En el Servidor AWS)

```bash
# Lanzar Next.js en modo producción con PM2
pm2 start npm --name "misterticket-frontend" -- start

# Que PM2 arranque solo al reiniciar la EC2
pm2 startup
# (PM2 te dará un comando "sudo env PATH=... pm2 startup systemd ..." — cópialo y ejecútalo)

# Guardar el estado actual
pm2 save

# Ver estado
pm2 status

# Ver logs en vivo
pm2 logs misterticket-frontend
```

En este punto, tu frontend ya responde en `http://IP_AWS:3000`.

---

## 8. (Opcional pero recomendado) Nginx como Reverse Proxy en el puerto 80

Si quieres que tus usuarios entren a `http://IP_AWS` sin escribir `:3000`, pon Nginx adelante.

```bash
# Instalar Nginx
sudo dnf install -y nginx

# Crear archivo de configuración
sudo nano /etc/nginx/conf.d/misterticket.conf
```

Pega esto:

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
        proxy_cache_bypass $http_upgrade;
    }
}
```

Guarda y activa:

```bash
# Validar configuración
sudo nginx -t

# Habilitar y arrancar
sudo systemctl enable nginx
sudo systemctl start nginx
```

Ahora puedes abrir el navegador en `http://IP_AWS` y verás tu frontend de MisterTicket.

---

## 🔄 ¿Cómo subir actualizaciones (cuando cambies código)?

El flujo es: empujas con Git desde tu PC y bajas con `git pull` en el servidor.

### Paso A: Desde tu PC Local (PowerShell o Git Bash)

```bash
cd "c:/EDBERTO/ULT SEMESTRE/SW1/FINAL/MisterTicket"

git status
git add .
git commit -m "feat: cambios del frontend"

# Si trabajas en una rama propia:
git push origin branch-edberto
# Luego en GitHub haces Pull Request → master → Merge.

# Si trabajas directo en master:
git push origin master
```

### Paso B: En el Servidor AWS (SSH)

```bash
# Entrar por SSH
ssh -i ~/.ssh/misterticket-frontend-key.pem ec2-user@IP_AWS

# Ir al proyecto
cd /home/ec2-user/SW1-misterticket-2026-1

# Traer los cambios
git pull origin master

# Entrar al frontend
cd frontend

# Reinstalar dependencias solo si cambió package.json o package-lock.json
npm install

# Volver a compilar (siempre que cambies código JS/JSX/CSS)
npm run build

# Reiniciar Next.js con PM2
pm2 restart misterticket-frontend

# Verificar
pm2 status
pm2 logs misterticket-frontend --lines 50
```

> Si cambiaste la IP del backend, antes de `npm run build` edita `.env.production` con la nueva IP.

---

## ⚖️ Diferencias / Comparativa

* **Ventajas:** Control total, sin Docker, fácil de depurar leyendo logs con `pm2 logs`.
* **Desventajas:** Hay que instalar Node, PM2 y opcionalmente Nginx a mano. Si migras a otro servidor o quieres replicar, hay que repetir todo.

---

## 🛑 ¿Cómo apagar servicios para ahorrar facturación?

### Opción A: Apagar solo Next.js y Nginx (la EC2 sigue encendida)

```bash
# Detener Next.js
pm2 stop misterticket-frontend

# Detener Nginx (si lo configuraste)
sudo systemctl stop nginx
```

### Opción B: Detener la Instancia EC2 completa (Recomendado)

1. **Consola AWS** → **EC2** → **Instancias**.
2. Selecciona `misterticket-frontend`.
3. **Estado de la instancia** → **Detener instancia**.
4. ⚠️ **NUNCA** uses **Terminar instancia** (eso borra todo).

---

## 🚀 ¿Cómo volver a encender los servicios?

### Si detuviste la Instancia EC2 completa (Opción B)

1. **Consola AWS** → **EC2** → **Instancias** → **Iniciar instancia**.
2. ⚠️ **La IP pública cambia** al detener/iniciar. Si tienes un dominio, actualiza el DNS; si no, comparte la nueva IP con los usuarios.
3. Conéctate:
   ```bash
   ssh -i misterticket-frontend-key.pem ec2-user@NUEVA_IP_AWS
   ```
4. Si el backend también cambió de IP, edita `.env.production` con la nueva URL y vuelve a compilar:
   ```bash
   cd /home/ec2-user/SW1-misterticket-2026-1/frontend
   nano .env.production
   npm run build
   pm2 restart misterticket-frontend
   ```
5. Nginx y PM2 quedaron con `enable`/`startup`, deberían levantar solos. Verifica:
   ```bash
   pm2 status
   sudo systemctl status nginx
   ```

### Si solo detuviste los procesos (Opción A)

La IP es la misma:

```bash
pm2 start misterticket-frontend
sudo systemctl start nginx
```

---

## ⚠️ Solución de Problemas Comunes (Troubleshooting)

### 1. `Failed to fetch` o `Network Error` al hacer login
El frontend no puede llegar al backend. Verifica:
* El backend está corriendo (`sudo systemctl status misterticket` en su EC2).
* `NEXT_PUBLIC_API_URL` en `.env.production` apunta a la **IP correcta** del backend con `:8000/api`.
* Recuerda recompilar (`npm run build`) y reiniciar (`pm2 restart`) cada vez que cambias esa variable.

### 2. CORS bloqueado en el navegador
El proyecto ya viene con `CORS_ALLOW_ALL_ORIGINS = True` en `backend/core/settings.py`, así que en pruebas no debería pasar. Si en producción restringes CORS, agrega la URL de tu frontend a `CORS_ALLOWED_ORIGINS` en el backend.

### 3. PM2 se cae al reiniciar la EC2
Olvidaste ejecutar `pm2 startup` y luego `pm2 save`. Hazlo una vez para que arranque solo.

### 4. `Permission denied (publickey)` al hacer SSH o SCP
Estás ejecutando el comando **dentro de la EC2** en vez de tu PC local. Sal con `exit` y vuelve a abrir Git Bash en tu carpeta `.ssh/`.

### 5. `Module not found` o errores raros al compilar
Borra todo y vuelve a instalar:
```bash
rm -rf node_modules .next
npm install
npm run build
```

### 6. Cookies de login no se mantienen
El backend está sirviendo en `http://` y el frontend también: revisa que **no** estén mezclados `http` con `https`. En producción real, deberías poner ambos detrás de HTTPS con un certificado (Let's Encrypt + Nginx).
