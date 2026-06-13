# MisterTicket - Frontend

Este es el proyecto frontend para **MisterTicket**, desarrollado utilizando **Next.js**, **React** y **Tailwind CSS**.

## Requisitos Previos

Asegúrate de tener instalado:
*   [Node.js](https://nodejs.org/) (versión 18 o superior recomendada)
*   [npm](https://www.npmjs.com/) (generalmente viene incluido con Node.js)

---

## Cómo Levantar el Proyecto

Sigue estos pasos para instalar las dependencias y ejecutar el proyecto en tu entorno local:

### 1. Instalar las dependencias
Antes de correr el proyecto por primera vez, necesitas instalar los paquetes de Node:

```bash
npm install
```

### 2. Ejecutar en Entorno de Desarrollo (Development)
Para levantar el servidor de desarrollo local con recarga en vivo (hot reload), ejecuta:

```bash
npm run dev
```

Una vez que el comando se complete, abre tu navegador y accede a:
👉 [http://localhost:3000](http://localhost:3000)

### 3. Construir y Levantar para Producción (Production Build)
Si deseas generar la versión optimizada para producción y levantarla localmente, utiliza los siguientes comandos:

```bash
# Crear el build de producción
npm run build

# Iniciar el servidor con el build de producción
npm run start
```

---

## Scripts Disponibles

En este proyecto puedes ejecutar los siguientes scripts definidos en el `package.json`:

*   `npm run dev`: Inicia el servidor de desarrollo en `http://localhost:3000`.
*   `npm run build`: Compila la aplicación Next.js y genera la build lista para producción.
*   `npm run start`: Inicia el servidor de Next.js en modo producción (requiere haber ejecutado `npm run build` previamente).
*   `npm run lint`: Ejecuta ESLint para analizar el código en busca de posibles errores y advertencias de estilo.
