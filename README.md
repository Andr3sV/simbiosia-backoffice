# Simbiosia Backoffice 📞

Backoffice para monitorear llamadas y costos de agentes AI de ElevenLabs realizadas a través de Twilio.

## 🎯 Características

- ✅ **Sincronización automática cada 12 horas** de datos de Twilio y ElevenLabs
- 📊 **Dashboard interactivo** con estadísticas en tiempo real
- 💰 **Análisis de costos** desglosado por plataforma y workspace
- 📈 **Gráficos de tendencias** para visualizar el uso a lo largo del tiempo
- 🔍 **Tablas detalladas** de todas las llamadas individuales
- 🎨 **UI moderna y responsiva** con tema oscuro

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 14 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **Base de Datos**: Supabase (PostgreSQL)
- **APIs**: Twilio, ElevenLabs
- **Despliegue**: Vercel
- **Gráficos**: Recharts

## 📋 Requisitos Previos

- Node.js 18+
- Cuenta de Supabase
- Cuenta de Twilio (con Account SID y Auth Token)
- Cuenta de ElevenLabs (con API Key)
- Cuenta de Vercel (para despliegue)

## 🚀 Configuración

### 1. Clonar el repositorio

\`\`\`bash
git clone <your-repo-url>
cd simbiosia-backoffice
\`\`\`

### 2. Instalar dependencias

\`\`\`bash
npm install
\`\`\`

### 3. Configurar Supabase

1. Crea un nuevo proyecto en [Supabase](https://supabase.com)
2. Ve a SQL Editor y ejecuta el script `supabase/schema.sql`
3. Copia tus credenciales:
   - URL del proyecto
   - Anon key
   - Service role key

### 4. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

\`\`\`env

# Supabase

NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Twilio

TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here

# ElevenLabs

ELEVENLABS_API_KEY=sk_a2b6e254c1d8435bd52aae1a06ed5f07a70213a211d155b5

# Cron Secret (genera una clave aleatoria segura)

CRON_SECRET=tu_secreto_aleatorio_aqui
NEXT_PUBLIC_CRON_SECRET=tu_secreto_aleatorio_aqui
\`\`\`

### 5. Ejecutar en desarrollo

\`\`\`bash
npm run dev
\`\`\`

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🌐 Despliegue en Vercel

### 1. Conectar repositorio

1. Ve a [Vercel](https://vercel.com)
2. Importa tu repositorio de GitHub
3. Vercel detectará automáticamente que es un proyecto Next.js

### 2. Configurar variables de entorno

En el panel de Vercel, agrega todas las variables de entorno de tu archivo `.env.local`.

### 3. Desplegar

Vercel desplegará automáticamente tu aplicación. El cron job configurado en `vercel.json` se ejecutará cada 12 horas.

### 4. Verificar el cron job

Una vez desplegado, puedes verificar que el cron job esté funcionando en:

- Vercel Dashboard → Tu proyecto → Cron Jobs

## 📊 Uso

### Dashboard Principal

- **Estadísticas globales**: Total de llamadas, costos, desglose por plataforma
- **Gráfico de tendencias**: Visualización de costos a lo largo del tiempo
- **Cards de workspaces**: Información resumida de cada workspace con su número asociado

### Sincronización Manual

Puedes sincronizar datos manualmente haciendo clic en el botón "Sync Now" en el dashboard.

### Ver Detalles de Workspace

Haz clic en cualquier workspace card para ver:

- Estadísticas detalladas
- Histórico de snapshots
- Gráficos de tendencias específicos del workspace
- Desglose por plataforma

## 🔄 Cómo Funciona

1. **Cron Job**: Cada 12 horas, Vercel ejecuta `/api/sync`
2. **Recolección de datos**: El endpoint consulta las APIs de Twilio y ElevenLabs
3. **Almacenamiento**: Los datos se guardan en Supabase como "snapshots"
4. **Visualización**: El dashboard muestra los datos más recientes y el histórico

## 📁 Estructura del Proyecto

\`\`\`
simbiosia-backoffice/
├── app/
│ ├── api/
│ │ ├── sync/route.ts # Endpoint de sincronización
│ │ └── workspaces/
│ │ ├── route.ts # Lista de workspaces
│ │ └── [id]/history/route.ts # Histórico por workspace
│ ├── workspace/[id]/page.tsx # Página de detalles
│ ├── layout.tsx
│ ├── page.tsx # Dashboard principal
│ └── globals.css
├── components/
│ ├── StatCard.tsx # Tarjeta de estadística
│ ├── WorkspaceCard.tsx # Tarjeta de workspace
│ ├── CallsTable.tsx # Tabla de llamadas
│ └── CostChart.tsx # Gráfico de costos
├── lib/
│ ├── supabase.ts # Cliente de Supabase
│ └── services/
│ ├── twilio.ts # Servicio de Twilio
│ └── elevenlabs.ts # Servicio de ElevenLabs
├── types/
│ ├── database.ts # Tipos de Supabase
│ └── index.ts # Tipos generales
├── supabase/
│ └── schema.sql # Esquema de base de datos
├── vercel.json # Configuración de cron job
└── package.json
\`\`\`

## 🔐 Seguridad

- Las credenciales sensibles se almacenan como variables de entorno
- El endpoint de sincronización requiere un token de autorización
- Supabase Row Level Security (RLS) está habilitado
- Las claves de API nunca se exponen en el cliente

## 📝 Notas Importantes

### Costos de ElevenLabs

El costo por llamada de ElevenLabs se estima basándose en la duración de la llamada. Por defecto, se usa **$0.10 por minuto**.

**⚠️ Importante**: Verifica el precio real en tu plan de ElevenLabs y ajusta la constante `COST_PER_MINUTE` en `lib/services/elevenlabs.ts`.

### Límites de API

- **Twilio**: El endpoint `calls.list()` tiene un límite por defecto de 1000 llamadas. Si tienes más, considera implementar paginación.
- **ElevenLabs**: Verifica los límites de rate limiting de tu plan.

## 🐛 Troubleshooting

### Error: "Failed to fetch workspaces"

- Verifica que las credenciales de Supabase sean correctas
- Asegúrate de haber ejecutado el script SQL en Supabase

### Error: "Failed to fetch Twilio calls"

- Verifica que el Account SID y Auth Token de Twilio sean correctos
- Asegúrate de que el número de teléfono tenga el formato correcto (+código de país)

### Error: "Failed to fetch ElevenLabs conversations"

- Verifica que la API key de ElevenLabs sea correcta
- Asegúrate de que tengas conversaciones registradas en ElevenLabs

### Cron job no se ejecuta

- Verifica que `vercel.json` esté en la raíz del proyecto
- Asegúrate de que estés en un plan de Vercel que soporte cron jobs (Pro o Enterprise)
- Revisa los logs en Vercel Dashboard → Logs

## 🔄 Actualizaciones Futuras

- [ ] Autenticación con Supabase Auth
- [ ] Filtros avanzados por fecha
- [ ] Exportación de datos a CSV/Excel
- [ ] Alertas por email cuando los costos superen un umbral
- [ ] Comparación de períodos (mes actual vs anterior)
- [ ] Dashboard de métricas en tiempo real con websockets

## 📧 Soporte

Si tienes problemas o preguntas, no dudes en abrir un issue en el repositorio.

## 📄 Licencia

MIT

---

Hecho con ❤️ para Simbiosia
