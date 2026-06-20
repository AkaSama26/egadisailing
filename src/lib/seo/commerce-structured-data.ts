export const EGADI_PRODUCT_BRAND = {
  "@type": "Brand",
  name: "Egadi Sailing",
} as const;

export function buildServiceProductCodes(value: string) {
  const code = `EGADI-${value}`
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return {
    sku: code,
    mpn: code,
  };
}

export function buildDigitalServiceShippingDetails() {
  return {
    "@type": "OfferShippingDetails",
    shippingRate: {
      "@type": "MonetaryAmount",
      value: "0.00",
      currency: "EUR",
    },
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: "IT",
    },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: {
        "@type": "QuantitativeValue",
        minValue: 0,
        maxValue: 0,
        unitCode: "DAY",
      },
      transitTime: {
        "@type": "QuantitativeValue",
        minValue: 0,
        maxValue: 0,
        unitCode: "DAY",
      },
    },
  } as const;
}

export function buildServiceReturnPolicy(merchantReturnLink?: string) {
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "IT",
    returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
    ...(merchantReturnLink ? { merchantReturnLink } : {}),
  } as const;
}
