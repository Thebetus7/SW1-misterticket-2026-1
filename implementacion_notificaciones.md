# Implementación del Sistema de Notificaciones: Tecnologías, Cambios y Consideraciones

Este documento detalla qué se hizo, las herramientas/librerías utilizadas y los aspectos a considerar de la implementación del sistema de notificaciones en las tres capas del proyecto: Backend, Frontend Web y Móvil Flutter.

---

## 1. Backend (Django)

Se implementó la persistencia en base de datos para el historial de notificaciones, las relaciones de seguidores, los tokens FCM y el envío automático de notificaciones push a través de Firebase.

### Herramientas y Librerías Utilizadas
*   `firebase-admin` (v7.4.0): SDK oficial de Firebase para Python, encargado de conectarse con la nube de Firebase y enviar las notificaciones push (FCM) de forma directa a los dispositivos móviles.
*   `django.db.models.signals.post_save`: Señales integradas en Django para ejecutar código automáticamente cuando se guarde un modelo `Evento` con estado `publicado`.

### Cambios Realizados
1.  **Nuevos Modelos de Datos** (`backend/apps/usuarios/models/`):
    *   `Usuario` (`usuario.py`): Añadido el campo `recibir_notificaciones` (Boolean).
    *   `SeguidorPromotor` (`seguidor.py`): Tabla de relación de seguidores de promotores.
    *   `Notificacion` (`notificacion.py`): Tabla de historial de alertas enviadas a fans y artistas.
    *   `DispositivoUsuario` (`dispositivo.py`): Tabla para asociar tokens FCM a los usuarios.
2.  **Helper de Firebase** (`backend/apps/usuarios/utils/firebase_helper.py`):
    *   Función `enviar_push_fcm()` que inicializa Firebase de forma segura mediante un archivo `firebase-credentials.json` y realiza el ruteo de notificaciones push de forma tolerante a fallos.
3.  **Señales Automatizadas** (`backend/apps/eventos/signals.py`):
    *   Gatillador `notificar_publicacion_evento()` que intercepta cuando un evento cambia de estado a `publicado` y crea los registros de notificación en la BD e inicia el envío push para fans seguidores y artistas del elenco sin enviar duplicados.
4.  **Endpoints y Rutas** (`backend/apps/usuarios/views/` y `urls.py`):
    *   `NotificacionViewSet`: Endpoints para listar notificaciones, marcarlas como leídas y eliminarlas físicamente de la base de datos.
    *   `DispositivoViewSet`: Endpoint para registrar el token FCM del celular de un usuario.
    *   `PromotorViewSet`: Endpoints personalizados para seguir/dejar de seguir a un promotor.
5.  **Migraciones de BD**:
    *   Se crearon y aplicaron las migraciones correspondientes en el backend.

---

## 2. Frontend Web (Next.js)

Se mantiene el modal de gestión de eventos tal cual, ya que las notificaciones son automatizadas en el backend.

### Herramientas y Librerías Utilizadas
*   `Axios` / `Fetch API` (Integrado en el código Next.js existente).

### Cambios Realizados
*   Al guardar un evento en el modal `EventoModal.js` en estado "publicado", Next.js realiza la llamada regular `POST /api/eventos/eventos/`. El backend intercepta esta llamada y de manera transparente se encarga de crear las notificaciones en segundo plano sin requerir lógica de frontend adicional.

---

## 3. Móvil (Flutter)

Se programó la recepción de notificaciones push (FCM) e internas, así como la visualización y gestión en el dispositivo.

### Herramientas y Librerías Utilizadas
*   `firebase_core` (v2.32.0): Habilita la inicialización y el contexto de Firebase.
*   `firebase_messaging` (v14.9.4): Módulo encargado de conectarse con el servicio push FCM en la nube para recibir las notificaciones en segundo plano y primer plano.
*   `flutter_local_notifications` (v16.3.3): Modulo para generar el banner visual flotante superior cuando la app está abierta (foreground) en el celular.
*   `provider` (v6.1.5): Manejador de estado reactivo global para las alertas.

### Cambios Realizados
1.  **Modelo de Datos** (`lib/data/models/notificacion.dart`):
    *   Clase `NotificacionModel` para deserializar el JSON de la API.
2.  **Cliente API, Servicio y Repositorio**:
    *   Endpoints de notificaciones y seguimiento de promotores añadidos en `api_constants.dart`.
    *   `NotificacionApi`, `NotificacionService` y `NotificacionRepository` para llamadas de obtención, lectura, registro de token, eliminación física y seguimiento.
3.  **Estado Global** (`lib/presentation/state/notificacion_provider.dart`):
    *   Petición de permisos de notificaciones al SO.
    *   Envío de FCM Token al backend al iniciar sesión.
    *   Control del stream de mensajes en primer plano (onMessage) y segundo plano (onMessageOpenedApp) para redirección.
4.  **Buzón de Notificaciones** (`lib/presentation/pages/notificaciones/`):
    *   Pantalla principal `notificaciones_page.dart` modificada a dinámica.
    *   Implementación de **`Dismissible`** para eliminar las alertas de la base de datos al deslizar a la izquierda.
    *   `NotificacionListItem` widget premium que renderiza la tarjeta con iconos y colores dinámicos por tipo de alerta.
5.  **Pantalla de Detalle de Alerta** (`lib/presentation/pages/notificaciones/pages/detalle_evento_notificacion_page.dart`):
    *   Nueva interfaz premium con cabecera de degradado.
    *   Filtro inteligente por roles:
        *   **Fan**: Visualiza el botón flotante **"Comprar Boletos"**.
        *   **Artista**: **No ve el botón de compra** y muestra una tarjeta destacada con su orden de escenario y hora de salida.
6.  **Sección Configuraciones & Perfil** (`lib/presentation/pages/perfil/perfil_page.dart`):
    *   Tarjeta "Configuraciones" añadida debajo de "Información de cuenta" con el Switch "Recibir notificaciones" para persistir el valor en la base de datos del backend.
7.  **Botón de Seguimiento** (`lib/presentation/pages/home/widgets/evento_interacciones_bar.dart`):
    *   Añadido el botón de **"Seguir"** al promotor (icono estrella) en la barra de interacciones del feed móvil, permitiendo un toggle interactivo con el servidor.

---

## 4. Aspectos Clave a Considerar (Desarrollo y Producción)

1.  **Credenciales de Firebase (credentials.json)**:
    *   El archivo de credenciales de la cuenta de servicio de Firebase debe ubicarse en la raíz del backend (`MisterTicket/backend/firebase-credentials.json`). Si este archivo falta en el entorno local, se emitirá una alerta (`Warning`) en consola, pero el backend continuará funcionando (las notificaciones se guardarán en la base de datos local pero no se transmitirán como push externas).
2.  **Configuración del Token en Emuladores**:
    *   Para probar las notificaciones push en el emulador Android, este debe contar con **Google Play Services**. En emuladores sin Play Services, Firebase no podrá generar un token de registro FCM.
3.  **Permisos en Android 13+ / iOS**:
    *   La app móvil de Flutter solicitará automáticamente los permisos de notificación al arrancar en el Dashboard. Es necesario aceptarlos para que el sistema operativo permita pintar los banners nativos en el dispositivo.
