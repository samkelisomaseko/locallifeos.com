/**
 * @module server/lib/validation
 * Per-entity JSON-Schema-style validation for Phase 3 Batch B.
 * Lightweight, dependency-free: each schema declares required string fields,
 * allowed enums, and numeric ranges. validateEntity returns { ok, errors }.
 */

const SCHEMAS = {
  tasks: { required: ['title'], enums: { priority: ['low', 'medium', 'high'] } },
  habits: { required: ['name'], enums: { frequency: ['daily', 'weekly'] } },
  moods: { required: ['mood'], enums: { mood: ['happy', 'sad', 'neutral', 'anxious', 'energetic'] }, ranges: { score: [1, 5] } },
  sleep: { required: ['date'] },
  places: { required: ['name'] },
  deals: { required: ['businessName', 'description'] },
  channels: { required: ['name'] },
  messages: { required: ['content'] },
  bulletins: { required: ['title', 'content'] },
  notifications: { required: ['type', 'title'] },
  trustedContacts: { required: ['name'] },
  gamification: { required: [] },
  applets: { required: ['name'] },
  integratedApps: { required: ['appName'] },
};

export function validateEntity(entity, data) {
  const schema = SCHEMAS[entity];
  if (!schema) return { ok: false, errors: [`Unknown entity: ${entity}`] };
  const errors = [];
  for (const field of schema.required ?? []) {
    if (typeof data[field] !== 'string' || data[field].length === 0) {
      errors.push(`${field} is required and must be a non-empty string.`);
    }
  }
  for (const [field, allowed] of Object.entries(schema.enums ?? {})) {
    if (data[field] !== undefined && data[field] !== null && !allowed.includes(data[field])) {
      errors.push(`${field} must be one of: ${allowed.join(', ')}.`);
    }
  }
  for (const [field, [min, max]] of Object.entries(schema.ranges ?? {})) {
    if (data[field] !== undefined && data[field] !== null) {
      const n = Number(data[field]);
      if (!Number.isFinite(n) || n < min || n > max) errors.push(`${field} must be between ${min} and ${max}.`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function isValidEntity(entity, data) {
  return validateEntity(entity, data).ok;
}

export const ENTITY_NAMES = Object.keys(SCHEMAS);
