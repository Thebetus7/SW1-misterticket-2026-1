# Despliegue Backend MisterTicket (Django + PostgreSQL) en AWS - SIN DOCKER (Vanilla)

Este enfoque instala todas las dependencias directamente en el sistema operativo del servidor AWS (EC2) usando **Amazon Linux 2023**. Es el método tradicional: instalas Python, PostgreSQL y todo lo demás a mano sobre la máquina.

> **Stack del backend:**
> - Django 5.0 + Django REST Framework + JWT (SimpleJWT)
> - PostgreSQL 15
> - Gunicorn (servidor WSGI de producción)
> - django-storages + boto3 (S3 para archivos)
> - Stripe + firebase-admin
> - Carpeta del proyecto: `backend/` (con `requirements.txt`, `manage.py`, `.env`, `core/settings.py`)
> - El entorno virtual `venv/` **NO** se sube al servidor (está en `.gitignore`).

---

## 1. Crear el Servidor EC2 (Consola Web de AWS)

Sigue esta configuración paso a paso en el asistente de creación de instancias de AWS:

1. **Nombre y etiquetas:** Ponle un nombre identificativo (ej. `misterticket-backend`).
2. **Aplicación e imagen de sistema operativo (AMI):** Selecciona **Amazon Linux 2023 AMI** (apta para la capa gratuita).
3. **Tipo de instancia:** Selecciona `t2.micro` o `t3.micro` (capa gratuita). Si tu base de datos crecerá rápido, considera `t3.small`.
4. **Par de claves (inicio de sesión):**
   * Haz clic en **"Crear un nuevo par de claves"** (si no tienes una).
   * Llámalo `misterticket-backend-key`.
   * Tipo de clave: **RSA**. Formato: **`.pem`**.
   * Presiona **Crear**. El navegador descargará `misterticket-backend-key.pem`. **¡Guárdalo en tu carpeta `.ssh/`!** Es el único momento donde AWS te lo dará.
5. **Configuraciones de red:**
   * Deja la red por defecto.
   * **Asignación automática de IP pública:** debe estar en **"Habilitar"**.
   * **Firewall (grupos de seguridad):** selecciona **"Crear un grupo de seguridad"**.
   * Marca **"Permitir el tráfico de SSH desde"** y selecciona **"Cualquier lugar (0.0.0.0/0)"**.
   * Haz clic en **"Editar"** arriba a la derecha de la sección de red y agrega esta regla extra:
     * **Tipo:** TCP personalizado
     * **Intervalo de puertos:** `8000`
     * **Origen:** Cualquier lugar (`0.0.0.0/0`)
     * **Descripción:** `Backend Django MisterTicket`
6. **Configurar almacenamiento:** Sube el disco a **`16 GiB` gp3** (Django + PostgreSQL + media se quedan cortos con 8 GiB).
7. **Detalles avanzados:** **No toques nada.** El cuadro **"Datos de usuario - opcional"** debe quedar **vacío**.
8. Haz clic en el botón naranja **"Lanzar instancia"**.

---

## 2. Conectarse al Servidor vía SSH (En tu PC Local - Git Bash)

> **Suposición:** Ya tienes `misterticket-backend-key.pem` en tu carpeta `.ssh/` y abriste **Git Bash dentro de esa carpeta** (clic derecho → *Open Git Bash here*). Tu prompt mostrará:
> ```
> USUARIO@TU-PC MINGW64 ~/.ssh
> $
> ```

1. Protege la llave (solo la primera vez):
   ```bash
   chmod 400 misterticket-backend-key.pem
   ```
2. Conéctate (reemplaza `IP_AWS` por la IP pública de tu EC2):
   ```bash
   ssh -i misterticket-backend-key.pem ec2-user@IP_AWS
   ```
3. Cuando pregunte `Are you sure you want to continue connecting (yes/no)?`, escribe **`yes`**.
4. Si todo salió bien verás:
   ```
   [ec2-user@ip-xxx-xxx-xxx-xxx ~]$
   ```
   Ya estás dentro del servidor.

---

## 3. Instalar Python, PostgreSQL y Git (En el Servidor AWS)

Todos estos comandos se ejecutan **dentro de la EC2** (después del SSH). En Amazon Linux 2023 se usa `dnf`:

```bash
# Actualizar paquetes
sudo dnf update -y

# Python 3.11 + herramientas para compilar paquetes nativos (psycopg2, Pillow, etc.)
sudo dnf install -y python3.11 python3.11-pip python3.11-devel gcc git libjpeg-devel zlib-devel

# PostgreSQL 15
sudo dnf install -y postgresql15 postgresql15-server postgresql15-contrib

# Inicializar el clúster de Postgres (solo la primera vez)
sudo postgresql-setup --initdb

# Activar y arrancar PostgreSQL
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### Crear base de datos y usuario en PostgreSQL

```bash
# Entrar como usuario postgres
sudo -u postgres psql
```

Dentro del prompt `postgres=#` ejecuta (las credenciales deben coincidir con las del `.env` que pondrás luego):

```sql
CREATE DATABASE mister_ticket;
CREATE USER mt_user WITH ENCRYPTED PASSWORD 'mt_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE mister_ticket TO mt_user;
ALTER DATABASE mister_ticket OWNER TO mt_user;
\q
```

### Permitir login por contraseña a Postgres

```bash
# Editar el archivo de autenticación (Amazon Linux usa esta ruta)
sudo nano /var/lib/pgsql/data/pg_hba.conf
```

Busca las líneas que dicen `ident` y cámbialas por `md5` (para `local` e `IPv4 local connections`). Guarda con `Ctrl+O`, `Enter`, `Ctrl+X`.

```bash
sudo systemctl restart postgresql
```

---

## 4. Clonar el Proyecto desde GitHub (En el Servidor AWS)

```bash
# Ir al home del usuario
cd /home/ec2-user

# Clonar el repositorio
git clone https://github.com/Thebetus7/SW1-misterticket-2026-1.git

# Entrar al proyecto y luego al backend
cd SW1-misterticket-2026-1/backend
```

> **Nota:** Como `venv/` está en `.gitignore`, **no** se descargará ningún entorno virtual. Vamos a crear uno limpio en el servidor en el siguiente paso.

---

## 5. Crear el Entorno Virtual e Instalar Dependencias (En el Servidor AWS)

Dentro de la carpeta `backend/`:

```bash
# Crear venv con Python 3.11
python3.11 -m venv venv

# Activarlo
source venv/bin/activate

# Actualizar pip e instalar dependencias del proyecto
pip install --upgrade pip
pip install -r requirements.txt
```

> Si `Pillow` o `psycopg2-binary` fallan al instalar, asegúrate de haber instalado `gcc`, `python3.11-devel`, `libjpeg-devel` y `zlib-devel` del paso 3.

---

## 6. Crear el archivo `.env` en el Servidor (En el Servidor AWS)

Como el `.env` **no se sube a Git**, hay que crearlo a mano en el servidor:

```bash
# Estando en /home/ec2-user/SW1-misterticket-2026-1/backend
nano .env
```

Pega el siguiente contenido (cambia las contraseñas y las claves por las reales):

```env
SECRET_KEY=cambia-esta-clave-por-una-larga-y-aleatoria-en-produccion
DEBUG=False

# Base de datos PostgreSQL local del servidor
DB_NAME=mister_ticket
DB_USER=mt_user
DB_PASSWORD=mt_password_seguro
DB_HOST=localhost
DB_PORT=5432

# Almacenamiento: pon True solo si ya tienes el bucket de AWS S3 listo (ver S3_PRODUCCION.md)
USE_S3=False
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_STORAGE_BUCKET_NAME=
AWS_S3_REGION_NAME=us-east-1

# Stripe (modo test mientras desarrollas)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

Guarda con `Ctrl+O`, `Enter`, `Ctrl+X`.

⚠️ **Importante:** En `core/settings.py` ya está `ALLOWED_HOSTS = ['*']` y `CORS_ALLOW_ALL_ORIGINS = True`. Eso te facilita la vida en pruebas, pero **antes de un despliegue real** deberías limitar `ALLOWED_HOSTS` a tu IP/dominio y `CORS_ALLOWED_ORIGINS` a la URL del frontend.

---

## 7. Migraciones y Seeders (En el Servidor AWS)

Con el venv activado (`(venv)` debe aparecer en tu prompt):

```bash
# Aplicar migraciones
python manage.py migrate

# Crear superusuario y usuarios de prueba (admin, fan, artista, verificador)
python manage.py seed_admin

# Cargar artistas y eventos demo (opcional)
python manage.py seeder_add_artistas
python manage.py seeder_eventos

# Recolectar estáticos del admin (necesarios cuando DEBUG=False)
python manage.py collectstatic --noinput
```

> Si el comando `collectstatic` falla por permisos, asegúrate de que la carpeta `staticfiles/` se pueda crear dentro de `backend/`.

---

## 8. Probar Rápidamente con `runserver` (Opcional)

Antes de poner Gunicorn, valida que todo funcione:

```bash
python manage.py runserver 0.0.0.0:8000
```

Abre en tu navegador: `http://IP_AWS:8000/admin/` y entra con el superusuario que creó `seed_admin`. Si carga, todo está OK. Detén el servidor con `Ctrl+C`.

---

## 9. Arrancar Gunicorn como Servicio (En el Servidor AWS)

`runserver` no es para producción. Vamos a usar **Gunicorn** corriendo permanentemente con **systemd**:

```bash
# Aún dentro de backend/, crear el archivo de servicio
sudo nano /etc/systemd/system/misterticket.service
```

Pega esto (revisa que las rutas coincidan exactamente):

```ini
[Unit]
Description=Gunicorn para MisterTicket (Django)
After=network.target postgresql.service

[Service]
User=ec2-user
Group=ec2-user
WorkingDirectory=/home/ec2-user/SW1-misterticket-2026-1/backend
EnvironmentFile=/home/ec2-user/SW1-misterticket-2026-1/backend/.env
ExecStart=/home/ec2-user/SW1-misterticket-2026-1/backend/venv/bin/gunicorn \
    --workers 3 \
    --bind 0.0.0.0:8000 \
    core.wsgi:application
Restart=always

[Install]
WantedBy=multi-user.target
```

Guarda y ejecuta:

```bash
sudo systemctl daemon-reload
sudo systemctl enable misterticket
sudo systemctl start misterticket

# Ver estado
sudo systemctl status misterticket

# Ver logs en vivo
sudo journalctl -u misterticket -f
```

Si todo está bien, tu backend ya responde permanentemente en `http://IP_AWS:8000/api/...`.

---

## 🔄 ¿Cómo subir actualizaciones (cuando cambies código)?

El flujo correcto **es por Git**: empujas desde tu PC y bajas en el servidor. Nunca edites el código a mano dentro de AWS.

### Paso A: Desde tu PC Local (PowerShell o Git Bash)

Desde la carpeta del proyecto local:

```bash
cd "c:/EDBERTO/ULT SEMESTRE/SW1/FINAL/MisterTicket"

# Verificar estado
git status

# Agregar y subir tus cambios
git add .
git commit -m "feat: cambios del backend"

# Si estás en una rama propia (ej. branch-edberto):
git push origin branch-edberto
# Luego en GitHub, hacer Pull Request a master y mergearlo.

# O si trabajas directo en master:
git push origin master
```

### Paso B: En el Servidor AWS (SSH)

```bash
# Conectarte por SSH
ssh -i ~/.ssh/misterticket-backend-key.pem ec2-user@IP_AWS

# Ir al proyecto
cd /home/ec2-user/SW1-misterticket-2026-1

# Traer los cambios desde GitHub
git pull origin master

# Entrar al backend y activar el venv
cd backend
source venv/bin/activate

# Instalar dependencias nuevas (solo si cambió requirements.txt)
pip install -r requirements.txt

# Aplicar migraciones si modificaste models.py
python manage.py migrate

# Recolectar estáticos si cambiaron
python manage.py collectstatic --noinput

# Reiniciar Gunicorn para tomar los cambios
sudo systemctl restart misterticket

# Verificar que reinició bien
sudo systemctl status misterticket
```

> **Regla de oro:** El código se cambia local → se sube con Git → se baja con `git pull` en el servidor → se reinicia el servicio. **Nunca** edites archivos directamente en producción.

---

## ⚖️ Diferencias / Comparativa

* **Ventajas:** Acceso directo al sistema, menos capas, ideal para máquinas con poca RAM (`t2.micro`).
* **Desventajas:** Si cambias de servidor o vuelves a desplegar, hay que reinstalar Python, PostgreSQL, configurar `systemd`, etc., todo a mano. Si subes a Python 3.12 tienes que recompilar.

---

## 🛑 ¿Cómo apagar servicios para ahorrar facturación?

### Opción A: Apagar solo los procesos internos (la EC2 sigue encendida)

> AWS te seguirá cobrando las horas de cómputo, pero ahorras energía y procesos en background.

```bash
# Detener Django
sudo systemctl stop misterticket

# Detener PostgreSQL (solo si no lo usa nadie más)
sudo systemctl stop postgresql
```

### Opción B: Detener la Instancia EC2 completa (Recomendado para ahorrar dinero)

1. **Consola AWS** → **EC2** → **Instancias**.
2. Selecciona `misterticket-backend`.
3. **Estado de la instancia** → **Detener instancia** (Stop instance).
4. ⚠️ **NUNCA** uses **Terminar instancia** (Terminate): eso borra todo el servidor y la BD.

---

## 🚀 ¿Cómo volver a encender los servicios?

### Si detuviste la Instancia EC2 completa (Opción B)

1. **Consola AWS** → **EC2** → **Instancias** → **Iniciar instancia**.
2. ⚠️ Al apagar/encender una EC2 **cambia la IP pública**. Tienes que:
   * Actualizar `NEXT_PUBLIC_API_URL` en el frontend (Next.js).
   * Actualizar la URL del backend en la app móvil Flutter (`api_constants.dart`).
3. Conéctate de nuevo:
   ```bash
   ssh -i misterticket-backend-key.pem ec2-user@NUEVA_IP_AWS
   ```
4. PostgreSQL y `misterticket.service` están con `enable`, así que se levantan solos al reiniciar la EC2. Verifica:
   ```bash
   sudo systemctl status postgresql
   sudo systemctl status misterticket
   ```
5. Si alguno está caído:
   ```bash
   sudo systemctl start postgresql
   sudo systemctl start misterticket
   ```

### Si solo detuviste los procesos (Opción A)

La IP sigue siendo la misma:

```bash
ssh -i misterticket-backend-key.pem ec2-user@IP_AWS
sudo systemctl start postgresql
sudo systemctl start misterticket
```

---

## ⚠️ Solución de Problemas Comunes (Troubleshooting)

### 1. `psycopg2.OperationalError: could not connect to server`
Tu Django no puede conectarse a Postgres. Verifica:
```bash
sudo systemctl status postgresql      # Debe estar "active (running)"
sudo cat /var/lib/pgsql/data/pg_hba.conf  # Las líneas locales deben decir md5, no ident
```

### 2. `502 Bad Gateway` o no responde el puerto 8000
```bash
sudo systemctl status misterticket
sudo journalctl -u misterticket -n 100   # Ver últimas 100 líneas de log
```
Lo más común: error en `.env`, falta una migración o `collectstatic`.

### 3. CORS bloqueado desde el frontend
En desarrollo está `CORS_ALLOW_ALL_ORIGINS = True`, así que no debería pasar. Si lo restringes en producción, abre `core/settings.py` y agrega tu dominio del frontend a `CORS_ALLOWED_ORIGINS`.

### 4. `Permission denied (publickey)` al hacer `ssh` o `scp`
Estás ejecutando el comando dentro de la EC2 en vez de tu PC local. Sal con `exit` y vuelve a abrir Git Bash en tu carpeta `.ssh/`.

### 5. Las imágenes no se ven después de subir
Estás con `USE_S3=False` y archivos locales. Para producción real configura S3 siguiendo `backend/S3_PRODUCCION.md` y cambia `USE_S3=True` en el `.env` del servidor, luego `sudo systemctl restart misterticket`.
