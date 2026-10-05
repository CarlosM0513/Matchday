# MATCHDAY

Aplicación web para organizar partidos casuales de fútbol, buscar jugadores y registrar estadísticas según la posición.

## Tecnologías y justificación

- React construye la interfaz mediante componentes reutilizables y actualiza las vistas cuando cambian los datos.
- Supabase Auth gestiona registro, inicio de sesión y sesiones.
- Supabase PostgreSQL y Row Level Security (RLS) almacenan datos compartidos y aplican permisos en la base de datos.
- La API REST de Supabase (PostgREST) expone recursos HTTP. El cliente está en js/api.js y adjunta el JWT de la sesión.
- Supabase Realtime sincroniza perfiles y partidos entre usuarios.

React se carga por CDN/Babel para conservar una publicación estática sencilla en GitHub Pages. Para producción se recomienda empaquetar React con Vite.

## Recursos REST principales

Base: https://owqvdjjfznrwuonatqbd.supabase.co/rest/v1

- GET /profiles: consultar perfiles.
- POST /profiles: crear el perfil propio.
- PATCH /profiles?id=eq.<id>: editar el perfil propio.
- GET /matches: consultar partidos visibles.
- POST /matches: crear un partido.
- PATCH /matches?id=eq.<id>: editar un partido propio.
- DELETE /matches?id=eq.<id>: eliminar un partido propio.
- GET /match_requests: consultar solicitudes autorizadas.
- POST /match_requests: solicitar unirse a un partido.

## Seguridad

Cada perfil usa el mismo UUID de su cuenta (profiles.id = auth.users.id). Las políticas RLS de supabase/schema.sql permiten modificar el perfil propio y los partidos cuyo owner_id coincide con la cuenta autenticada. Ocultar botones no basta por sí solo: la seguridad efectiva se aplica en la base de datos.

## Configuración

1. En Supabase, abre SQL Editor y ejecuta supabase/schema.sql.
2. En Authentication > URL Configuration, agrega https://carlosm0513.github.io como Site URL y https://carlosm0513.github.io/Matchday/ como URL de redirección permitida.
3. Publica GitHub Pages desde la rama main.
4. Usa una clave publishable en js/supabase.js. Nunca publiques una clave service_role o secret.
5. Confirma el correo si Supabase tiene esa opción activa y luego inicia sesión.

No se crean perfiles ni partidos de demostración automáticamente. Los datos se comparten en Supabase, no en el almacenamiento local del navegador.
