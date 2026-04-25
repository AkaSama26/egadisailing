// Backward-compat shim: re-exports from override/ split module.
// New code should import from @/lib/booking/override directly.
// This shim will be deleted after consumers migrate.

export {
  createOverrideRequest,
  approveOverride,
  rejectOverride,
  expireDropDeadRequests,
  sendEscalationReminders,
  type CreateOverrideRequestInput,
  type CreateOverrideRequestResult,
  type ApproveOverrideResult,
  type RejectOverrideResult,
  type ExpireDropDeadResult,
  type SendEscalationRemindersResult,
} from "./override";
