import type { Metadata } from "next";
import { IslandPoiLab } from "@/components/islands-itinerary/island-poi-lab";

export const metadata: Metadata = {
  title: "Lab punti interesse Egadi",
  robots: {
    follow: false,
    index: false,
  },
};

export default function EgadiMapLabPage() {
  return <IslandPoiLab />;
}

