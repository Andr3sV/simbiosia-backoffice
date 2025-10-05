# Ejecución Paso a Paso de Reorganización de Workspaces

## 📋 Orden de Ejecución

### 🔍 Verificación (EJECUTAR PRIMERO)

```
verify_workspaces.sql
```

- Verifica qué workspace_ids existen en calls y elevenlabs_conversations
- Identifica teléfonos sin mapear
- Tiempo estimado: < 5 segundos

**✅ Verificar:** Deberías ver qué workspace_ids están presentes y si hay números sin mapear

---

### 🔧 Corrección de Workspace IDs

```
fix_workspace_ids.sql
```

- Reasigna TODOS los workspace_id según el mapeo correcto
- Números no mapeados van a workspace 1
- Tiempo estimado: 10-30 segundos

**✅ Verificar:** Deberías ver solo workspace_ids 1, 4, 5, 6 en las tablas

---

### 0️⃣ Limpieza de Snapshots

```
clean_snapshots.sql
```

- Limpia todas las tablas de snapshots
- Tiempo estimado: < 1 segundo

---

### 1️⃣ Preparación

```
step1_prepare.sql
```

- Agrega columna `real_minutes` a `twilio_snapshots`
- Crea tabla temporal con mapeo de teléfonos → workspaces
- Tiempo estimado: 1-2 segundos

**✅ Verificar:** Deberías ver el conteo de teléfonos mapeados

---

### 2️⃣ Crear Snapshots de Twilio

```
step2_twilio_snapshots.sql
```

- Crea snapshots de Twilio agrupados por hora y workspace
- Calcula `real_minutes` (minutos facturables redondeados hacia arriba)
- Tiempo estimado: 30-60 segundos (depende del volumen de datos)

**✅ Verificar:** Deberías ver:

- Total de snapshots creados
- Resumen por workspace con totales

---

### 3️⃣ Crear Snapshots de ElevenLabs

```
step3_elevenlabs_snapshots.sql
```

- Crea snapshots de ElevenLabs agrupados por hora y workspace
- Incluye todos los detalles de costos (LLM, llamadas, descuentos)
- Tiempo estimado: 30-60 segundos (depende del volumen de datos)

**✅ Verificar:** Deberías ver:

- Total de snapshots creados
- Resumen por workspace con totales

---

### 4️⃣ Actualizar Nombres y Ver Resumen

```
step4_update_workspaces.sql
```

- Actualiza nombres de workspaces (Principal, Secundario, USA, Otros)
- Muestra resumen final completo
- Tiempo estimado: < 1 segundo

**✅ Verificar:** Deberías ver el resumen final con:

- Workspace 1: Otros Números
- Workspace 4: Workspace Principal
- Workspace 5: Workspace Secundario
- Workspace 6: Workspace USA

---

## ⚠️ Notas Importantes

1. **Ejecutar en orden:** Los pasos deben ejecutarse en secuencia
2. **Esperar confirmación:** Espera a ver "✅ PASO X COMPLETADO" antes de continuar
3. **Si algo falla:** Puedes volver a ejecutar desde `clean_snapshots.sql` y empezar de nuevo
4. **Tabla temporal:** El `workspace_mapping` del paso 1 solo vive durante esa sesión

## 🔍 Verificación Post-Ejecución

Después de completar todos los pasos, verifica con:

```sql
-- Ver total de snapshots
SELECT 'Twilio:' as table, COUNT(*) as total FROM twilio_snapshots
UNION ALL
SELECT 'ElevenLabs:' as table, COUNT(*) as total FROM elevenlabs_snapshots;

-- Ver workspaces
SELECT id, name FROM workspaces WHERE id IN (1, 4, 5, 6) ORDER BY id;
```
