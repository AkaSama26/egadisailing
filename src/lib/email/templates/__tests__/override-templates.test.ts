import { describe, it, expect } from "vitest";
import { bookingPendingOverrideConfirmationTemplate } from "../booking-pending-override-confirmation";
import { overrideApprovedWinnerTemplate } from "../override-approved-winner";
import { overrideRejectedWinnerTemplate } from "../override-rejected-winner";
import { overrideExpiredTemplate } from "../override-expired";
import { overrideSupersededTemplate } from "../override-superseded";
import { overrideReconcileFailedAdminTemplate } from "../override-reconcile-failed-admin";

const INJECTION = "<script>alert(1)</script>Mario";

describe("override email templates — HTML escape", () => {
  it("bookingPendingOverrideConfirmation escapa customerName + respinge javascript: URL", () => {
    const tpl = bookingPendingOverrideConfirmationTemplate({
      customerName: INJECTION,
      confirmationCode: "TST1",
      serviceName: "Gourmet",
      startDate: "2026-08-15",
      numPeople: 2,
      amountPaid: "3000.00",
      bookingPortalUrl: "javascript:alert(1)",
    });
    expect(tpl.html).not.toContain("<script>");
    expect(tpl.html).toContain("&lt;script&gt;");
    expect(tpl.html).toContain("Mario");
    expect(tpl.html).not.toContain("javascript:");
  });

  it("overrideApprovedWinner escapa HTML injection nel customerName", () => {
    const tpl = overrideApprovedWinnerTemplate({
      customerName: '<img src=x onerror=alert(1)>',
      confirmationCode: "W1",
      serviceName: "Charter",
      startDate: "2026-08-15",
      numPeople: 4,
      bookingPortalUrl: "https://egadisailing.com/b/sessione",
      contactPhone: "+39 123 456",
    });
    expect(tpl.html).not.toContain("<img src=x");
    expect(tpl.html).toContain("&lt;img");
  });

  it("overrideRejectedWinner escapa alternativeDates", () => {
    const tpl = overrideRejectedWinnerTemplate({
      customerName: "Mario",
      confirmationCode: "R1",
      serviceName: "Svc",
      startDate: "2026-08-15",
      refundAmount: "1000.00",
      alternativeDates: ["<b>2026-08-20</b>", "2026-08-21"],
      bookingPortalUrl: "https://x.com",
      contactEmail: "info@x.com",
    });
    expect(tpl.html).not.toContain("<b>2026");
    expect(tpl.html).toContain("&lt;b&gt;2026");
  });

  it("overrideExpired produce subject + body validi", () => {
    const tpl = overrideExpiredTemplate({
      customerName: "Mario",
      confirmationCode: "E1",
      serviceName: "Svc",
      startDate: "2026-08-15",
      refundAmount: "500.00",
      alternativeDates: [],
      bookingPortalUrl: "https://x.com",
    });
    expect(tpl.subject).toContain("E1");
    expect(tpl.subject).toContain("scaduta");
    expect(tpl.html).toContain("500.00");
  });

  it("overrideSuperseded con alternativeDates vuote non rompe", () => {
    const tpl = overrideSupersededTemplate({
      customerName: "Sofia",
      confirmationCode: "S1",
      serviceName: "Gourmet",
      startDate: "2026-08-15",
      refundAmount: "2000.00",
      alternativeDates: [],
      bookingPortalUrl: "https://x.com",
    });
    expect(tpl.subject).toContain("S1");
    expect(tpl.html).toContain("2000.00");
  });

  it("overrideReconcileFailedAdmin escapa channel/externalRef nei conflict", () => {
    const tpl = overrideReconcileFailedAdminTemplate({
      overrideRequestId: "REQ1",
      newBookingCode: "NEW1",
      upstreamConflicts: [
        {
          bookingId: "b1",
          channel: "<b>BOKUN</b>",
          externalRef: "BK-123",
          status: "CONFIRMED",
        },
      ],
      overrideDetailUrl: "https://admin.x.com/override/REQ1",
    });
    expect(tpl.html).not.toContain("<b>BOKUN</b>");
    expect(tpl.html).toContain("&lt;b&gt;BOKUN");
    expect(tpl.subject).toContain("FATAL");
  });
});
