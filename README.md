# MisterTicket

MisterTicket es una plataforma estilo red social para conciertos, enfocada principalmente en la venta de boletos con el objetivo de prevenir el fraude y estandarizar el uso de billeteras móviles.

## Arquitectura
Este proyecto está dividido en dos partes principales:
1. **Backend**: API REST creada con Django y Django Rest Framework (DRF), utilizando Simple JWT para autenticación segura mediante tokens. Implementa un sistema de gestión de usuarios y roles similar a *Spatie* en *Laravel* a través del sistema de permisos integrado de Django (o django-role-permissions).
2. **Frontend**: Aplicación en Next.js (App Router), enfocada en un diseño asombroso y seguro, consumiendo la API de Django pasando las credenciales autorizadas en los headers de Fetch.

## Cómo Iniciar (Guía Rápida)
La forma más fácil de iniciar todo el proyecto (si tienes Docker instalado) es ejecutar:
```bash
docker-compose up --build
```
Si prefieres inicializar y probar localmente, sigue las siguientes guías paso a paso.

---

## 1. Configuración del Backend (Django)

### Creación del Entorno
Ve al directorio del backend:
```bash
cd backend
```
Crea un entorno virtual e instala las dependencias (asegúrate de tener Python 3 instalado):
```bash
python -m venv venv
.\venv\Scripts\activate
# En Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
pip install psycopg2-binary # Vital para la conexión con PostgreSQL
```

### Comandos Clave en Django
Para levantar el proyecto y crear las tablas de base de datos base y usuarios, corre lo siguiente por primera vez.

1. **Migraciones:**
```bash
python manage.py makemigrations
python manage.py makemigrations usuarios    # para generar las tablas de usuario/roles
python manage.py makemigrations productos   # para generar el módulo base
python manage.py migrate
```

2. **Crear usuario administrador:**
```bash
python manage.py createsuperuser
```

3. **Arrancar el servidor de desarrollo:**
```bash
python manage.py runserver
```
El backend estará disponible en `http://localhost:8000` o `http://127.0.0.1:8000`.

### Autenticación y Roles (Estilo Laravel Sanctum / Spatie)
- Utilizamos **Simple JWT**: Similar a Sanctum para SPAs. Provee temporalidad, seguridad y fácil anexo a Next.js (enviando el `Bearer Token`).
- En Django, se utiliza su propio motor de grupos y permisos que actúa casi igual que *Spatie* en Laravel. 
  - Para asignar el rol: Al grupo se le asignan los permisos, y al usuario se le asigna el grupo correspondiente.
  - En `backend/apps/usuarios/`, encontrarás la implementación.

---

## 2. Configuración del Frontend (Next.js)

### Instrucciones y Creación
Ve al directorio del frontend:
```bash
cd frontend
```
Instala los paquetes de `package.json` utilizando npm:
```bash
npm install
```

### Ejecutar el Servidor
Inicia la versión de desarrollo de Next.js:
```bash
npm run dev
```
La aplicación correrá en `http://localhost:3000`.

### Estructura y Funcionamiento con el Backend
- **App Router:** `src/app/`. Aquí residen las páginas (login, dashboard, productos).
- **Componentes:** `src/components/`. Todo bloque visual re-utilizable va aquí.
- **Llamadas API (`src/lib/api.js`):** Next.js tiene configurada la Fetch API genérica para automáticamente leer el token de las cookies (si existe) y ponerlo en el header de las peticiones protegidas.
- Cuando inicies sesión en la página `/login`, recibirás un  `access_token` de Django y Next lo guardará en las cookies.
- Al acceder al `/dashboard` o `/productos`, se valida el token localmente y hacia al servidor si se requieren datos.

---

## Comandos Generados y Útiles

### Django
- `django-admin startproject core .`: Inicializó el proyecto dentro de backend.
- `python manage.py startapp <nombre_app>`: Crea nuevas apps como usuarios o productos.
- `python manage.py shell`: Abre consola interactiva de la base de datos de Django para consultas rápidas.

### Next.js
- `npx create-next-app@latest .`: Comando originario para estructurar Next.js.
- `npm run build`: Compila para producción.
- `npm run start`: Arranca el servidor de producción (necesitas hacer build primero).

El proyecto continuará expandiéndose aquí. ¡Bienvenido a MisterTicket!
