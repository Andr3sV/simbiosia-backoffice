-- ========================================
-- VERIFICAR DAÑO
-- ========================================

-- Cuántas llamadas quedan?
SELECT 'Llamadas restantes:' as info, COUNT(*) as total FROM calls WHERE source = 'twilio';

-- Cuántas conversaciones quedan?
SELECT 'Conversaciones restantes:' as info, COUNT(*) as total FROM elevenlabs_conversations;

-- Workspaces actuales
SELECT 'Workspaces actuales:' as info;
SELECT id, name FROM workspaces ORDER BY id;
