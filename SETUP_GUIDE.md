# Guía de Configuración Paso a Paso 🚀

Esta guía te llevará a través de todo el proceso de configuración desde cero.

## 1️⃣ Configurar Supabase (10 minutos)

### Crear Proyecto

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Haz clic en "New Project"
3. Elige un nombre (ej: "simbiosia-backoffice")
4. Crea una contraseña segura para la base de datos
5. Selecciona la región más cercana
6. Espera 2-3 minutos mientras se crea el proyecto

### Ejecutar el Schema SQL

1. En tu proyecto de Supabase, ve a "SQL Editor" en el menú lateral
2. Haz clic en "New Query"
3. Copia y pega todo el contenido de `supabase/schema.sql`
4. Haz clic en "Run" (▶️)
5. Deberías ver un mensaje de éxito

### Obtener Credenciales

1. Ve a "Settings" → "API"
2. Copia los siguientes valores:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: Una clave larga que empieza con `eyJ...`
   - **service_role key**: Otra clave larga (¡mantén esta privada!)

## 2️⃣ Configurar el Proyecto Local (5 minutos)

### Instalar Dependencias

```bash
npm install
```

### Crear Archivo .env.local

Crea un archivo `.env.local` en la raíz del proyecto con este contenido:

```env
# Supabase (pega tus credenciales aquí)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Twilio (ya proporcionado)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here

# ElevenLabs (ya proporcionado)
ELEVENLABS_API_KEY=sk_a2b6e254c1d8435bd52aae1a06ed5f07a70213a211d155b5

# Cron Secret (genera uno aleatorio)
CRON_SECRET=mi-secreto-super-seguro-12345
NEXT_PUBLIC_CRON_SECRET=mi-secreto-super-seguro-12345
```

> 💡 **Tip**: Para generar un CRON_SECRET seguro, puedes usar:
>
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) - ¡Deberías ver el dashboard!

## 3️⃣ Probar la Sincronización (2 minutos)

### Opción A: Desde el Dashboard

1. En el dashboard, haz clic en el botón "Sync Now"
2. Espera unos segundos mientras se obtienen los datos
3. ¡Deberías ver las estadísticas actualizadas!

### Opción B: Desde la Terminal

```bash
curl -X POST http://localhost:3000/api/sync \
  -H "Authorization: Bearer mi-secreto-super-seguro-12345"
```

## 4️⃣ Verificar los Datos en Supabase (1 minuto)

1. Ve a tu proyecto de Supabase
2. Haz clic en "Table Editor"
3. Verifica que las tablas tengan datos:
   - `workspaces`: Debería tener el workspace de prueba
   - `call_snapshots`: Debería tener al menos un snapshot
   - `calls`: Debería tener las llamadas individuales

## 5️⃣ Desplegar en Vercel (10 minutos)

### Subir a GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/tu-usuario/simbiosia-backoffice.git
git push -u origin main
```

### Conectar con Vercel

1. Ve a [vercel.com](https://vercel.com) y crea una cuenta
2. Haz clic en "New Project"
3. Importa tu repositorio de GitHub
4. Vercel detectará automáticamente que es Next.js

### Configurar Variables de Entorno

En la sección "Environment Variables", agrega todas las variables de tu `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
ELEVENLABS_API_KEY=sk_a2b6e254c1d8435bd52aae1a06ed5f07a70213a211d155b5
CRON_SECRET=mi-secreto-super-seguro-12345
NEXT_PUBLIC_CRON_SECRET=mi-secreto-super-seguro-12345
```

### Desplegar

1. Haz clic en "Deploy"
2. Espera 2-3 minutos
3. ¡Tu app estará en vivo! 🎉

### Verificar el Cron Job

1. Ve a tu proyecto en Vercel
2. Haz clic en "Cron Jobs" en el menú lateral
3. Deberías ver un job configurado para ejecutarse cada 12 horas
4. Puedes ejecutarlo manualmente para probarlo

## 6️⃣ Agregar Más Workspaces (Opcional)

Si quieres agregar más números de teléfono/workspaces:

### Opción A: Desde Supabase

1. Ve a Table Editor → `workspaces`
2. Haz clic en "Insert" → "Insert row"
3. Completa:
   - `name`: Nombre descriptivo
   - `phone_number`: Número en formato internacional (+34...)
4. Guarda

### Opción B: Desde SQL

```sql
INSERT INTO workspaces (name, phone_number)
VALUES ('Mi Workspace', '+34912345678');
```

## 🎯 Próximos Pasos

- ✅ El cron job sincronizará datos automáticamente cada 12 horas
- ✅ Puedes sincronizar manualmente cuando quieras
- ✅ Los datos históricos se acumularán en `call_snapshots`
- ✅ El dashboard mostrará tendencias y estadísticas

## 🐛 Problemas Comunes

### "No workspaces found"

**Solución**: Ejecuta el script SQL de nuevo en Supabase para crear el workspace de ejemplo.

### "Failed to fetch workspaces"

**Solución**: Verifica que las credenciales de Supabase en `.env.local` sean correctas.

### "Unauthorized" al sincronizar

**Solución**: Asegúrate de que el `CRON_SECRET` sea el mismo en el archivo de entorno y en la petición.

### El cron job no se ejecuta

**Solución**:

1. Verifica que estés en un plan de Vercel que soporte cron jobs
2. El plan gratuito de Vercel NO soporta cron jobs - necesitas el plan Pro
3. Alternativa: Usa un servicio como [cron-job.org](https://cron-job.org) para llamar a tu endpoint cada 12 horas

## 📞 Soporte

Si algo no funciona, revisa los logs:

- **Local**: Revisa la consola donde ejecutaste `npm run dev`
- **Vercel**: Ve a tu proyecto → Logs → Functions

## 🎉 ¡Listo!

Ahora tienes un backoffice completamente funcional para monitorear tus llamadas de AI.

---

¿Algo no funcionó? Abre un issue en GitHub o contacta al equipo de desarrollo.
