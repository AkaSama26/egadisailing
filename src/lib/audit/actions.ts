/**
 * Centralized audit action strings. Prevents drift (camelCase outliers,
 * typos) and enables compile-time coverage when adding new actions.
 *
 * Usage:
 *   import { AUDIT_ACTIONS } from "@/lib/audit/actions";
 *   await auditLog({ action: AUDIT_ACTIONS.OVERRIDE_APPROVED, ... });
 */
export const AUDIT_ACTIONS = {
  // Generic CRUD (used by pricing, crew dynamic create-vs-update branches)
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  ACTIVATE: "ACTIVATE",
  DEACTIVATE: "DEACTIVATE",
  // Booking lifecycle
  CANCEL: "CANCEL",
  CUSTOMER_CANCEL: "CUSTOMER_CANCEL",
  CUSTOMER_RESCHEDULE: "CUSTOMER_RESCHEDULE",
  CUSTOMER_RESCHEDULE_REQUESTED: "CUSTOMER_RESCHEDULE_REQUESTED",
  ADMIN_RESCHEDULE_APPROVED: "ADMIN_RESCHEDULE_APPROVED",
  ADMIN_RESCHEDULE_REJECTED: "ADMIN_RESCHEDULE_REJECTED",
  REGISTER_PAYMENT: "REGISTER_PAYMENT",
  ADD_NOTE: "ADD_NOTE",
  ANONYMIZE: "ANONYMIZE",
  // Availability admin
  MANUAL_BLOCK: "MANUAL_BLOCK",
  MANUAL_RELEASE: "MANUAL_RELEASE",
  // Crew
  ASSIGN_CREW: "ASSIGN_CREW",
  // Manual alerts (auditLog ledger; ManualAlert.action enum lives separately on the model)
  RESOLVE_MANUAL_ALERT: "RESOLVE_MANUAL_ALERT",
  // Override system (Fase 1)
  OVERRIDE_APPROVED: "OVERRIDE_APPROVED",
  OVERRIDE_REJECTED: "OVERRIDE_REJECTED",
  OVERRIDE_RECONCILE_FAILED: "OVERRIDE_RECONCILE_FAILED",
  BOOKING_CANCELLED_BY_OVERRIDE: "BOOKING_CANCELLED_BY_OVERRIDE",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
