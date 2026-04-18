/**
 * Tipi Bokun (subset). L'API ha molti altri campi, definiamo solo quelli
 * che leggiamo/scriviamo. Il raw payload viene salvato in `BokunBooking.rawPayload`.
 */

export interface BokunBookingSummary {
  id: number;
  confirmationCode: string;
  status: string;
  productId: string;
  productConfirmationCode: string;
  startDate: string;
  endDate?: string;
  totalPrice: number;
  currency: string;
  channelName: string;
  mainContactDetails: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    country?: string;
    language?: string;
  };
  passengers?: Array<{ firstName?: string; lastName?: string; numPeople?: number }>;
  numPeople?: number;
  paymentStatus?: string;
  commissionAmount?: number;
  netAmount?: number;
}
