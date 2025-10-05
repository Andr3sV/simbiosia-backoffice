-- ========================================
-- REORGANIZACIÓN COMPLETA DESDE CERO
-- ========================================

BEGIN;

-- ========================================
-- PASO 0: Ver workspaces actuales
-- ========================================

SELECT 'Workspaces actuales:' as info;
SELECT id, name FROM workspaces ORDER BY id;

-- ========================================
-- PASO 1: Eliminar workspaces innecesarios (excepto 1, 4, 5, 6)
-- ========================================

DELETE FROM workspaces 
WHERE id NOT IN (1, 4, 5, 6);

SELECT '✅ Workspaces innecesarios eliminados' as status;

-- Verificar que existen los workspaces necesarios, si no, crearlos
INSERT INTO workspaces (id, name, phone_number, created_at, updated_at) VALUES
(1, 'Otros Números', 'unknown', NOW(), NOW()),
(4, 'Workspace Principal', '+34930340228', NOW(), NOW()),
(5, 'Workspace Secundario', '+34911677200', NOW(), NOW()),
(6, 'Workspace USA', '+13527475264', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  phone_number = EXCLUDED.phone_number,
  updated_at = NOW();

SELECT '✅ Workspaces 1, 4, 5, 6 asegurados' as status;

-- ========================================
-- PASO 2: Limpiar workspace_phones completamente
-- ========================================

TRUNCATE TABLE workspace_phones CASCADE;

SELECT '✅ workspace_phones limpiado' as status;

-- ========================================
-- PASO 3: Insertar SOLO los números correctos
-- ========================================

-- Workspace 4: Números principales (13 números)
INSERT INTO workspace_phones (workspace_id, phone_number, is_primary) VALUES
(4, '+34881193139', false),
(4, '+34930349258', false),
(4, '+34930349294', false),
(4, '+34930341942', false),
(4, '+34930343536', false),
(4, '+34911674282', false),
(4, '+34911676271', false),
(4, '+34911679636', false),
(4, '+34911679868', false),
(4, '+34881198794', false),
(4, '+34930341062', false),
(4, '+34930340228', true),
(4, '+34911677759', false);

-- Workspace 5: Números secundarios (3 números)
INSERT INTO workspace_phones (workspace_id, phone_number, is_primary) VALUES
(5, '+34911677200', true),
(5, '+34911670356', false),
(5, '+34930347962', false);

-- Workspace 6: Número USA (1 número)
INSERT INTO workspace_phones (workspace_id, phone_number, is_primary) VALUES
(6, '+13527475264', true);

SELECT '✅ Insertados 17 números en workspaces 4, 5, 6' as status;

-- ========================================
-- PASO 4: Actualizar workspace_id en CALLS
-- ========================================

-- Actualizar los que coinciden con workspace 4, 5, 6
UPDATE calls c
SET workspace_id = wp.workspace_id
FROM workspace_phones wp
WHERE c.phone_from = wp.phone_number
  AND c.source = 'twilio';

SELECT '✅ Calls actualizados para workspaces 4, 5, 6' as status;

-- Actualizar todos los demás a workspace 1
UPDATE calls
SET workspace_id = 1
WHERE source = 'twilio'
  AND phone_from NOT IN (SELECT phone_number FROM workspace_phones);

SELECT '✅ Resto de calls actualizados a workspace 1' as status;

-- Ver distribución final
SELECT 'Distribución final en CALLS:' as info;
SELECT 
  workspace_id,
  COUNT(*) as total_calls
FROM calls
WHERE source = 'twilio'
GROUP BY workspace_id
ORDER BY workspace_id;

-- ========================================
-- PASO 5: Actualizar workspace_id en ELEVENLABS_CONVERSATIONS
-- ========================================

-- Actualizar los que coinciden con workspace 4, 5, 6
UPDATE elevenlabs_conversations ec
SET workspace_id = wp.workspace_id
FROM workspace_phones wp
WHERE ec.agent_number = wp.phone_number;

SELECT '✅ Conversaciones actualizadas para workspaces 4, 5, 6' as status;

-- Actualizar todos los demás a workspace 1
UPDATE elevenlabs_conversations
SET workspace_id = 1
WHERE agent_number IS NOT NULL
  AND agent_number NOT IN (SELECT phone_number FROM workspace_phones);

SELECT '✅ Resto de conversaciones actualizadas a workspace 1' as status;

-- Ver distribución final
SELECT 'Distribución final en ELEVENLABS_CONVERSATIONS:' as info;
SELECT 
  workspace_id,
  COUNT(*) as total_conversations
FROM elevenlabs_conversations
GROUP BY workspace_id
ORDER BY workspace_id;

COMMIT;

SELECT '===========================================' as separator;
SELECT '✅ REORGANIZACIÓN COMPLETADA' as status;
SELECT 'Solo quedan workspace_ids: 1, 4, 5, 6' as detail;
SELECT '===========================================' as separator;
