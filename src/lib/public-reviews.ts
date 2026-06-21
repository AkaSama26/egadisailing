const GOOGLE_REVIEW_URL =
  "https://www.google.com/search?client=ubuntu-sn&sca_esv=393fe94135c43729&channel=fs&cs=1&sxsrf=ANbL-n7bmgag1xIRiMq9Vfe4ZvWT8D7YKg:1777968877317&q=Egadi+Sailing+Recensioni&rflfq=1&num=20&stick=H4sIAAAAAAAAAONgkxIxNLcwNrAwMTc1MjI3NDMwMzE2Md3AyPiKUcI1PTElUyE4MTMnMy9dISg1OTWvODM_L3MRK04pAJ4OsqhRAAAA&rldimm=17830847522716064345&tbm=lcl&hl=it-IT&sa=X&ved=2ahUKEwjy7-ia2qGUAxUZXEEAHSvCAkUQ9fQKegQIEBAG&biw=1784&bih=963&dpr=1#lkt=LocalPoiReviews";

const TRIPADVISOR_PRIMARY_REVIEW_URL =
  "https://www.tripadvisor.it/Attraction_Review-g494955-d4465624-Reviews-Egadi_Sailing-Trapani_Province_of_Trapani_Sicily.html";


export const PUBLIC_REVIEW_LINKS = {
  google: GOOGLE_REVIEW_URL,
  tripadvisor: TRIPADVISOR_PRIMARY_REVIEW_URL,
  tripadvisorProfiles: [TRIPADVISOR_PRIMARY_REVIEW_URL],
} as const;
