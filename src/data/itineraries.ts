export interface ItineraryStop {
  time: string;
  nameKey: string;
  islandKey?: string;
  descriptionKey: string;
  mapPosition: { x: number; y: number };
  noMapMarker?: boolean;
}

export interface Itinerary {
  experienceType: string;
  tabLabelKey: string;
  stops: ItineraryStop[];
}

export const itineraries: Itinerary[] = [
  {
    experienceType: "EXCLUSIVE_EXPERIENCE",
    tabLabelKey: "itinerary.tabs.exclusive",
    stops: [
      {
        time: "10:00",
        nameKey: "itinerary.exclusive.stop1.name",
        descriptionKey: "itinerary.exclusive.stop1.description",
        mapPosition: { x: 15, y: 82 },
      },
      {
        time: "11:30",
        nameKey: "itinerary.exclusive.stop2.name",
        islandKey: "itinerary.exclusive.stop2.island",
        descriptionKey: "itinerary.exclusive.stop2.description",
        mapPosition: { x: 38, y: 52 },
      },
      {
        time: "13:30",
        nameKey: "itinerary.exclusive.stop3.name",
        descriptionKey: "itinerary.exclusive.stop3.description",
        mapPosition: { x: 52, y: 38 },
      },
      {
        time: "15:30",
        nameKey: "itinerary.exclusive.stop4.name",
        islandKey: "itinerary.exclusive.stop4.island",
        descriptionKey: "itinerary.exclusive.stop4.description",
        mapPosition: { x: 65, y: 20 },
      },
      {
        time: "18:00",
        nameKey: "itinerary.exclusive.stop5.name",
        descriptionKey: "itinerary.exclusive.stop5.description",
        mapPosition: { x: 15, y: 82 },
      },
    ],
  },
  {
    experienceType: "CABIN_CHARTER",
    tabLabelKey: "itinerary.tabs.cabinCharter",
    stops: [
      {
        time: "10:00",
        nameKey: "itinerary.cabinCharter.stop1.name",
        descriptionKey: "itinerary.cabinCharter.stop1.description",
        mapPosition: { x: 15, y: 82 },
      },
      {
        time: "12:00",
        nameKey: "itinerary.cabinCharter.stop2.name",
        islandKey: "itinerary.cabinCharter.stop2.island",
        descriptionKey: "itinerary.cabinCharter.stop2.description",
        mapPosition: { x: 38, y: 52 },
      },
      {
        time: "Day 2",
        nameKey: "itinerary.cabinCharter.stop3.name",
        islandKey: "itinerary.cabinCharter.stop3.island",
        descriptionKey: "itinerary.cabinCharter.stop3.description",
        mapPosition: { x: 55, y: 30 },
      },
      {
        time: "Day 3",
        nameKey: "itinerary.cabinCharter.stop4.name",
        islandKey: "itinerary.cabinCharter.stop4.island",
        descriptionKey: "itinerary.cabinCharter.stop4.description",
        mapPosition: { x: 78, y: 15 },
      },
      {
        time: "Day 7",
        nameKey: "itinerary.cabinCharter.stop5.name",
        descriptionKey: "itinerary.cabinCharter.stop5.description",
        mapPosition: { x: 15, y: 82 },
      },
    ],
  },
];
