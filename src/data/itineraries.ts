export interface ItineraryStop {
  time: string;
  nameKey: string;
  islandKey?: string;
  descriptionKey: string;
  mapPosition: { x: number; y: number };
  noMapMarker?: boolean;
  hideTime?: boolean;
}

export interface Itinerary {
  boatId: "trimarano" | "boat";
  experienceType: string;
  tabLabelKey: string;
  stops: ItineraryStop[];
}

export const itineraries: Itinerary[] = [
  {
    boatId: "trimarano",
    experienceType: "EXCLUSIVE_EXPERIENCE",
    tabLabelKey: "itinerary.tabs.exclusive",
    stops: [
      {
        time: "09:30",
        nameKey: "itinerary.exclusive.stop1.name",
        descriptionKey: "itinerary.exclusive.stop1.description",
        mapPosition: { x: 15, y: 82 },
        noMapMarker: true,
      },
      {
        time: "11:30",
        nameKey: "itinerary.exclusive.stop2.name",
        islandKey: "itinerary.exclusive.stop2.island",
        descriptionKey: "itinerary.exclusive.stop2.description",
        mapPosition: { x: 79, y: 93 },
      },
      {
        time: "12:30",
        nameKey: "itinerary.exclusive.stop3.name",
        islandKey: "itinerary.exclusive.stop3.island",
        descriptionKey: "itinerary.exclusive.stop3.description",
        mapPosition: { x: 81, y: 74 },
      },
      {
        time: "13:00",
        nameKey: "itinerary.exclusive.stop4.name",
        descriptionKey: "itinerary.exclusive.stop4.description",
        mapPosition: { x: 81, y: 74 },
      },
      {
        time: "13:30",
        nameKey: "itinerary.exclusive.stop5.name",
        descriptionKey: "itinerary.exclusive.stop5.description",
        mapPosition: { x: 78, y: 71 },
      },
      {
        time: "14:30",
        nameKey: "itinerary.exclusive.stop6.name",
        islandKey: "itinerary.exclusive.stop6.island",
        descriptionKey: "itinerary.exclusive.stop6.description",
        mapPosition: { x: 81, y: 74 },
      },
      {
        time: "16:00",
        nameKey: "itinerary.exclusive.stop7.name",
        islandKey: "itinerary.exclusive.stop7.island",
        descriptionKey: "itinerary.exclusive.stop7.description",
        mapPosition: { x: 70, y: 42 },
      },
      {
        time: "16:30",
        nameKey: "itinerary.exclusive.stop8.name",
        islandKey: "itinerary.exclusive.stop8.island",
        descriptionKey: "itinerary.exclusive.stop8.description",
        mapPosition: { x: 75, y: 40 },
      },
      {
        time: "17:15",
        nameKey: "itinerary.exclusive.stop9.name",
        descriptionKey: "itinerary.exclusive.stop9.description",
        mapPosition: { x: 72, y: 51 },
      },
      {
        time: "18:00",
        nameKey: "itinerary.exclusive.stop10.name",
        descriptionKey: "itinerary.exclusive.stop10.description",
        mapPosition: { x: 15, y: 82 },
        noMapMarker: true,
      },
    ],
  },
  {
    boatId: "trimarano",
    experienceType: "CABIN_CHARTER",
    tabLabelKey: "itinerary.tabs.cabinCharter",
    stops: [
      {
        time: "",
        nameKey: "itinerary.cabinCharter.stop1.name",
        descriptionKey: "itinerary.cabinCharter.stop1.description",
        mapPosition: { x: 50, y: 50 },
        noMapMarker: true,
        hideTime: true,
      },
    ],
  },
  {
    boatId: "boat",
    experienceType: "BOAT_SHARED",
    tabLabelKey: "itinerary.tabs.boatShared",
    stops: [
      {
        time: "09:30",
        nameKey: "itinerary.boatShared.stop1.name",
        descriptionKey: "itinerary.boatShared.stop1.description",
        mapPosition: { x: 15, y: 82 },
      },
      {
        time: "10:30",
        nameKey: "itinerary.boatShared.stop2.name",
        islandKey: "itinerary.boatShared.stop2.island",
        descriptionKey: "itinerary.boatShared.stop2.description",
        mapPosition: { x: 38, y: 52 },
      },
      {
        time: "12:30",
        nameKey: "itinerary.boatShared.stop3.name",
        islandKey: "itinerary.boatShared.stop3.island",
        descriptionKey: "itinerary.boatShared.stop3.description",
        mapPosition: { x: 62, y: 28 },
      },
      {
        time: "14:30",
        nameKey: "itinerary.boatShared.stop4.name",
        descriptionKey: "itinerary.boatShared.stop4.description",
        mapPosition: { x: 15, y: 82 },
      },
    ],
  },
  {
    boatId: "boat",
    experienceType: "BOAT_EXCLUSIVE",
    tabLabelKey: "itinerary.tabs.boatExclusive",
    stops: [
      {
        time: "10:00",
        nameKey: "itinerary.boatExclusive.stop1.name",
        descriptionKey: "itinerary.boatExclusive.stop1.description",
        mapPosition: { x: 15, y: 82 },
      },
      {
        time: "11:00",
        nameKey: "itinerary.boatExclusive.stop2.name",
        islandKey: "itinerary.boatExclusive.stop2.island",
        descriptionKey: "itinerary.boatExclusive.stop2.description",
        mapPosition: { x: 38, y: 52 },
      },
      {
        time: "13:00",
        nameKey: "itinerary.boatExclusive.stop3.name",
        descriptionKey: "itinerary.boatExclusive.stop3.description",
        mapPosition: { x: 50, y: 40 },
      },
      {
        time: "15:00",
        nameKey: "itinerary.boatExclusive.stop4.name",
        islandKey: "itinerary.boatExclusive.stop4.island",
        descriptionKey: "itinerary.boatExclusive.stop4.description",
        mapPosition: { x: 62, y: 28 },
      },
      {
        time: "18:00",
        nameKey: "itinerary.boatExclusive.stop5.name",
        descriptionKey: "itinerary.boatExclusive.stop5.description",
        mapPosition: { x: 15, y: 82 },
      },
    ],
  },
];
