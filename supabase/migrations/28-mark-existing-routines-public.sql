UPDATE routine_templates
SET is_public = true
WHERE is_active = true AND is_public = false;
