---
name: MisterTicket Context
description: Proporciona el contexto completo y las reglas arquitectónicas del proyecto MisterTicket.
---

# Contexto del Proyecto MisterTicket

Eres el asistente de IA para el proyecto **MisterTicket**, una plataforma estilo red social para conciertos enfocada en la venta de boletos segura (anti-fraude) y uso de billeteras móviles.

## Arquitectura
- **Backend:** Django 5.0.3, Django REST Framework, PostgreSQL 15, JWT (SimpleJWT).
- **Frontend:** Next.js 14.1.4 (App Router), TailwindCSS 3, Lucide React, js-cookie.
- **Orquestación:** Docker Compose.

## Patrones del Backend
1. **Soft Delete Universal:** Todos los modelos heredan de `SoftDeleteModel`. Nunca se hacen eliminaciones físicas, sino que se marca `deleted_at`. Usa `all_objects` para ver registros eliminados.
2. **Sistema de Roles (Estilo Spatie de Laravel):** 
   - Roles: `organizador`, `verificador`, `artista` (gestionados via Django Groups).
   - Permisos custom: `gestionar_eventos`, `verificar_tickets`, `gestionar_artistas`, `ver_reportes`.
3. **Estructura de Apps:** `usuarios`, `eventos`, `tickets`, `pagos`.

## Patrones del Frontend
1. **App Router:** Las rutas están en `src/app/`.
2. **Auth por Cookies:** Los JWTs (`access_token`, `refresh_token`, `user`) se almacenan en cookies usando `js-cookie`.
3. **Peticiones a API:** Se debe usar `fetchApi` (de `src/lib/api.js`) que automáticamente inyecta el token de acceso.
4. **Modales:** Se prefiere el uso de modales para creación de registros (ej. en zonas y eventos).
5. **Tailwind Custom:** Se usa un tema personalizado con `brand` y `accent` (`#6366f1`).

## Reglas de Desarrollo
- Escribe código limpio y en español para variables, tablas de BD y comentarios (siguiendo el estándar actual).
- Asegúrate de implementar soft deletes en cualquier nuevo modelo de Django.
- Mantén el diseño del frontend alineado con el esquema actual (vibrante, moderno y limpio).
