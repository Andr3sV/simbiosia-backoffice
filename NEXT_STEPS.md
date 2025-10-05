# 🚀 Próximos Pasos - ¡Empieza Aquí!

Hola! Tu backoffice está **completamente configurado** y listo para usar. Sigue estos pasos para ponerlo en marcha.

---

## 🎯 Lo que tienes ahora

✅ **Backoffice completo** con dashboard moderno  
✅ **Integración con Twilio** (llamadas y costos)  
✅ **Integración con ElevenLabs** (conversaciones AI)  
✅ **Base de datos Supabase** (schema incluido)  
✅ **Sincronización automática** cada 12 horas  
✅ **UI responsive** con tema oscuro  
✅ **Documentación completa**

---

## 🏁 Para empezar (elige tu ruta)

### 🚀 Ruta Rápida (5 minutos)

Sigue el [QUICKSTART.md](QUICKSTART.md) para tenerlo funcionando en local AHORA.

### 📚 Ruta Detallada (15 minutos)

Sigue el [SETUP_GUIDE.md](SETUP_GUIDE.md) para entender cada paso en profundidad.

---

## ✅ Checklist de Setup

Usa esta lista para asegurarte de que todo esté configurado:

### 1. Instalación Base

- [ ] Node.js 18+ instalado
- [ ] Dependencias instaladas (`npm install`)

### 2. Supabase

- [ ] Proyecto creado en supabase.com
- [ ] Schema SQL ejecutado (`supabase/schema.sql`)
- [ ] Credenciales copiadas (URL, anon key, service role key)
- [ ] Workspace de prueba visible en tabla `workspaces`

### 3. Variables de Entorno

- [ ] Archivo `.env.local` creado
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurado
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurado
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurado
- [ ] `TWILIO_ACCOUNT_SID` configurado (ya proporcionado)
- [ ] `TWILIO_AUTH_TOKEN` configurado (ya proporcionado)
- [ ] `ELEVENLABS_API_KEY` configurado (ya proporcionado)
- [ ] `CRON_SECRET` generado (aleatorio y seguro)
- [ ] `NEXT_PUBLIC_CRON_SECRET` igual al anterior

### 4. Prueba Local

- [ ] Servidor corriendo (`npm run dev`)
- [ ] Dashboard visible en http://localhost:3000
- [ ] Sincronización manual funciona (botón "Sync Now")
- [ ] Datos visibles en el dashboard

### 5. Deploy en Vercel (Opcional)

- [ ] Repositorio subido a GitHub
- [ ] Proyecto creado en Vercel
- [ ] Variables de entorno configuradas en Vercel
- [ ] Deploy exitoso
- [ ] Cron job configurado (requiere plan Pro)

---

## 🎮 Comandos Principales

```bash
# Desarrollo
npm run dev              # Iniciar servidor local
npm run build           # Build para producción
npm run lint            # Verificar código

# Scripts útiles
./scripts/test-sync.sh  # Probar sincronización
./scripts/add-workspace.sh "Nombre" "+34123456789"  # Agregar workspace
```

---

## 📊 URLs Importantes

Una vez que tengas todo funcionando:

### Local

- **Dashboard**: http://localhost:3000
- **API Sync**: http://localhost:3000/api/sync
- **API Workspaces**: http://localhost:3000/api/workspaces

### Supabase

- **Dashboard**: https://app.supabase.com/project/[tu-proyecto]
- **Table Editor**: Para ver los datos en tiempo real
- **SQL Editor**: Para ejecutar queries

### Vercel (después del deploy)

- **Dashboard**: https://tu-app.vercel.app
- **Vercel Console**: https://vercel.com/[tu-usuario]/simbiosia-backoffice

---

## 🔧 Configuraciones Importantes

### 1. Ajustar Costos de ElevenLabs

El costo actual está estimado en **$0.10/minuto**. Si tu plan es diferente:

1. Abre `lib/services/elevenlabs.ts`
2. Busca `COST_PER_MINUTE`
3. Cambia el valor según tu plan

```typescript
const COST_PER_MINUTE = 0.1; // Ajusta aquí
```

### 2. Agregar Más Workspaces

Tienes 2 opciones:

**Opción A - Desde Supabase:**

1. Ve a Table Editor → `workspaces`
2. Insert → Insert row
3. Completa nombre y número

**Opción B - Con script:**

```bash
./scripts/add-workspace.sh "Mi Nuevo Workspace" "+34987654321"
```

### 3. Cambiar Frecuencia de Sync

Abre `vercel.json` y modifica el cron:

```json
{
  "crons": [
    {
      "path": "/api/sync",
      "schedule": "0 */6 * * *" // Cada 6 horas
    }
  ]
}
```

Formatos comunes:

- `0 */12 * * *` - Cada 12 horas (actual)
- `0 */6 * * *` - Cada 6 horas
- `0 0 * * *` - Cada día a medianoche
- `0 */1 * * *` - Cada hora

---

## 🐛 Problemas Comunes

### "Cannot connect to Supabase"

→ Verifica las credenciales en `.env.local`  
→ Asegúrate de que el proyecto de Supabase esté activo

### "No workspaces found"

→ Ejecuta el schema SQL de nuevo  
→ Verifica la tabla `workspaces` en Supabase

### "Failed to fetch Twilio calls"

→ Verifica que las credenciales de Twilio sean correctas  
→ Asegúrate de tener llamadas en tu cuenta Twilio

### "Cron job not working on Vercel"

→ El plan gratuito NO soporta cron jobs  
→ Necesitas Vercel Pro ($20/mes)  
→ Alternativa: Usa cron-job.org (gratis)

---

## 📚 Recursos de Aprendizaje

| Tema                 | Documentación                                |
| -------------------- | -------------------------------------------- |
| Uso general          | [README.md](README.md)                       |
| Inicio rápido        | [QUICKSTART.md](QUICKSTART.md)               |
| Setup detallado      | [SETUP_GUIDE.md](SETUP_GUIDE.md)             |
| API Reference        | [API_DOCUMENTATION.md](API_DOCUMENTATION.md) |
| Resumen del proyecto | [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)     |

---

## 🎯 Objetivos Cumplidos

✅ **Visualización de llamadas Twilio** segmentadas por número  
✅ **Visualización de llamadas ElevenLabs** segmentadas por número  
✅ **Suma total combinada** de ambas plataformas  
✅ **Workspace de prueba** configurado (ID: 2, número: +34930340228)  
✅ **Actualización automática** cada 12 horas  
✅ **UI moderna** inspirada en football-analytics  
✅ **Supabase** integrado para base de datos  
✅ **Vercel** ready para deploy

---

## 💡 Tips Pro

1. **Performance**: Los datos se cachean en Supabase, así que el dashboard es rápido
2. **Histórico**: Cada snapshot se guarda, puedes ver tendencias a lo largo del tiempo
3. **Escalabilidad**: Diseñado para múltiples workspaces
4. **Seguridad**: Nunca compartas tu `.env.local` o el `CRON_SECRET`
5. **Monitoring**: Vercel tiene logs integrados para debugging

---

## 🚀 ¡Siguiente Nivel!

Una vez que esté funcionando, considera:

1. **Alertas por email** cuando los costos superen un umbral
2. **Autenticación** con Supabase Auth
3. **Exportación** de reportes a Excel
4. **Webhooks** de Twilio para datos en tiempo real
5. **Analytics avanzado** con gráficos personalizados

---

## 📞 ¿Necesitas Ayuda?

- 📖 Lee la documentación en los archivos `.md`
- 🐛 Abre un issue en GitHub
- 💬 Pregunta al equipo de desarrollo
- 📧 Contacta a soporte técnico

---

## 🎉 ¡Todo Listo!

Tu backoffice está **100% funcional** y listo para usar.

### 👉 Próximo paso inmediato:

```bash
# 1. Instala dependencias
npm install

# 2. Configura Supabase y crea .env.local
# (ver QUICKSTART.md)

# 3. Inicia el servidor
npm run dev

# 4. Abre http://localhost:3000 y haz clic en "Sync Now"
```

**¡Disfruta tu nuevo backoffice!** 🎊

---

_Creado con ❤️ para Simbiosia_
