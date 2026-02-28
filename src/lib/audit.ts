export interface FieldChange {
  code: string;
  label: string;
  oldValue: string | number | undefined;
  newValue: string | number | undefined;
}

export interface AuditEvent {
  id: string;
  action: string;
  country: string;
  user: string;
  role?: string;
  timestamp: string;
  details?: string;
  changes?: FieldChange[];
}

export function logAuditEvent(event: Omit<AuditEvent, 'id'>) {
  try {
    const stored = localStorage.getItem('ar_audit_log');
    const events: AuditEvent[] = stored ? JSON.parse(stored) : [];
    events.unshift({ ...event, id: `audit_${Date.now()}_${Math.random().toString(36).slice(2)}` });
    // Keep last 500 events
    if (events.length > 500) events.length = 500;
    localStorage.setItem('ar_audit_log', JSON.stringify(events));
  } catch (e) {
    console.error('Failed to log audit event:', e);
  }
}

export function getAuditEvents(): AuditEvent[] {
  try {
    const stored = localStorage.getItem('ar_audit_log');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}
