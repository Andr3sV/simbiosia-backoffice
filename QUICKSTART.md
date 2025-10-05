# ⚡ Quick Start (5 minutos)

La forma más rápida de tener tu backoffice funcionando.

## 📋 Pre-requisitos

- ✅ Node.js 18+ instalado
- ✅ Cuenta de Supabase creada
- ✅ Credenciales de Twilio y ElevenLabs

## 🚀 Pasos

### 1. Instala dependencias

```bash
npm install
```

### 2. Configura Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a SQL Editor y ejecuta el archivo `supabase/schema.sql`
3. Copia tus credenciales de Settings → API

### 3. Crea tu .env.local

```bash
cp .env.example .env.local
```

Edita `.env.local` y completa:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Twilio (ya proporcionado)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here

# ElevenLabs (ya proporcionado)
ELEVENLABS_API_KEY=sk_a2b6e254c1d8435bd52aae1a06ed5f07a70213a211d155b5

# Cron Secret
CRON_SECRET=genera-un-secreto-aleatorio-aqui
NEXT_PUBLIC_CRON_SECRET=genera-un-secreto-aleatorio-aqui
```

### 4. Inicia el servidor

```bash
npm run dev
```

### 5. Sincroniza datos

Abre [http://localhost:3000](http://localhost:3000) y haz clic en **"Sync Now"**

## ✅ ¡Listo!

Deberías ver:

- 📊 Estadísticas de llamadas
- 💰 Costos totales
- 📈 Gráfico de tendencias
- 📱 Card del workspace con el número +34930340228

## 🌐 Deploy en Vercel

```bash
# 1. Sube a GitHub
git init
git add .
git commit -m "Initial commit"
git push

# 2. Conecta con Vercel
# Ve a vercel.com → New Project → Import tu repo

# 3. Agrega las mismas variables de entorno de .env.local

# 4. Deploy!
```

## 🆘 Problemas?

### No veo datos

1. Verifica que ejecutaste el SQL en Supabase
2. Haz clic en "Sync Now" en el dashboard
3. Revisa la consola del navegador por errores

### Error de autenticación

- Verifica que las credenciales en `.env.local` sean correctas
- Asegúrate de que no haya espacios al copiar las claves

### El cron job no funciona en Vercel

- El plan gratuito de Vercel **NO** soporta cron jobs
- Necesitas el plan Pro ($20/mes)
- Alternativa: Usa [cron-job.org](https://cron-job.org) gratis

## 📚 Más información

- Ver [SETUP_GUIDE.md](SETUP_GUIDE.md) para instrucciones detalladas
- Ver [API_DOCUMENTATION.md](API_DOCUMENTATION.md) para referencia de la API
- Ver [README.md](README.md) para documentación completa

## 🎯 Próximos pasos

1. ✅ Agrega más workspaces en Supabase
2. ✅ Personaliza los costos de ElevenLabs en `lib/services/elevenlabs.ts`
3. ✅ Configura alertas (próximamente)
4. ✅ Exporta reportes (próximamente)

---

**¿Algo no funciona?** Abre un issue en GitHub o contacta al equipo de desarrollo.
