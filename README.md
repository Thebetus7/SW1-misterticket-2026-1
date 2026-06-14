# MisterTicket

Plataforma premium para la gestión y venta segura de boletos de conciertos con prevención de fraudes.

---

## 🚀 Cómo Levantar el Proyecto

Para evitar errores de conexión (`Failed to fetch`), se recomienda utilizar **terminales separadas** para cada servicio.

### 1. Servidor Backend (Django)

1. Ve al directorio del backend:
   ```bash
   cd backend
   ```
2. Activa tu entorno virtual (si aplica):
   ```bash
   .\venv\Scripts\activate
   ```
3. Ejecuta las migraciones (solo si hay cambios de base de datos):
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```
4. **Poblar la base de datos (Semillas / Seeds):**
   *Ejecuta estos comandos en orden si estás reiniciando el sistema:*
   ```bash
   python manage.py seed_admin
   python manage.py seed_departamentos_lugares
   ```
5. **Iniciar el servidor de desarrollo:**
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```

### 2. Servidor Frontend (Next.js)

1. Ve al directorio del frontend:
   ```bash
   cd frontend
   ```
2. Inicia el servidor Next.js en modo desarrollo:
   ```bash
   npm run dev
   ```
3. Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 📌 Nota de Contexto e Importancia de los Comandos

> [!IMPORTANT]
> **¿Por qué usamos `python manage.py runserver 0.0.0.0:8000`?**
>
> 1. **Acceso Multi-dispositivo (Flutter / Móvil):** Al usar `0.0.0.0` en lugar del valor por defecto `127.0.0.1`, el servidor de Django escucha en **todas las interfaces de red de tu computadora**. Esto es indispensable para que tu aplicación móvil de Flutter en desarrollo pueda conectarse a la API del backend usando la IP de tu red local.
> 2. **Evitar el error "Failed to fetch":** 
>    * Al ejecutar comandos administrativos como `seed_admin` o `seed_departamentos_lugares`, debes hacerlo deteniendo temporalmente el servidor o abriendo una **segunda terminal**.
>    * Si detienes el servidor para correr una semilla y olvidas volver a iniciarlo con `runserver`, el frontend de Next.js no podrá comunicarse con el backend, lanzando inmediatamente el error de consola `TypeError: Failed to fetch` (conexión rechazada).
>    * **Recomendación:** Deja siempre una consola ejecutando permanentemente el comando `runserver 0.0.0.0:8000` y abre otra consola adicional para correr migraciones, semillas o cualquier otra tarea administrativa de Django.
