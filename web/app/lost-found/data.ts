import waterBottleImg from "@/assets/lost-items/water-bottle.jpg";
import airpodsImg from "@/assets/lost-items/airpods.jpg";
import idCardImg from "@/assets/lost-items/id-card.jpg";
import laptopChargerImg from "@/assets/lost-items/laptop-charger.jpg";
import carKeysImg from "@/assets/lost-items/car-keys.jpg";
import umbrellaImg from "@/assets/lost-items/umbrella.jpg";

export type ItemStatus = "PENDING" | "APPROVED" | "CLAIMED" | "RESOLVED";

export interface LostItem {
  id: number;
  title: string;
  description: string;
  location: string;
  valueTier: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  status: ItemStatus;
  reportedBy: string;
  createdAt: string;
  foundDate: string;
  photoUrl: typeof waterBottleImg;
}

export const mockItems: LostItem[] = [
  {
    id: 1,
    title: "Blue Hydro Flask Water Bottle",
    description: "Found near the library entrance, 2nd floor. Has stickers on it.",
    location: "Library 2F",
    valueTier: "LOW",
    status: "APPROVED",
    reportedBy: "Lyhour H.",
    createdAt: "2 hours ago",
    foundDate: "Apr 12, 2026",
    photoUrl: waterBottleImg,
  },
  {
    id: 2,
    title: "AirPods Pro with Case",
    description: "White AirPods Pro found on a desk in the cafeteria.",
    location: "Cafeteria",
    valueTier: "HIGH",
    status: "PENDING",
    reportedBy: "Raksmey P.",
    createdAt: "4 hours ago",
    foundDate: "Apr 13, 2026",
    photoUrl: airpodsImg,
  },
  {
    id: 3,
    title: "Student ID Card — Kimhong R.",
    description: "Found a student ID card on the ground floor hallway.",
    location: "Building A, Ground Floor",
    valueTier: "MEDIUM",
    status: "CLAIMED",
    reportedBy: "Virakyuth S.",
    createdAt: "1 day ago",
    foundDate: "Apr 11, 2026",
    photoUrl: idCardImg,
  },
  {
    id: 4,
    title: "HP Laptop Charger",
    description: "Black HP laptop charger left in Room 204 after class.",
    location: "Room 204",
    valueTier: "MEDIUM",
    status: "APPROVED",
    reportedBy: "Sovanrith S.",
    createdAt: "1 day ago",
    foundDate: "Apr 10, 2026",
    photoUrl: laptopChargerImg,
  },
  {
    id: 5,
    title: "Car Keys with Toyota Keychain",
    description: "Found car keys in the parking lot near Gate 2.",
    location: "Parking Lot B",
    valueTier: "VERY_HIGH",
    status: "RESOLVED",
    reportedBy: "Kimheng C.",
    createdAt: "3 days ago",
    foundDate: "Apr 8, 2026",
    photoUrl: carKeysImg,
  },
  {
    id: 6,
    title: "Blue Umbrella",
    description: "Left behind in the auditorium after the morning lecture.",
    location: "Auditorium",
    valueTier: "LOW",
    status: "APPROVED",
    reportedBy: "Pochhay E.",
    createdAt: "3 days ago",
    foundDate: "Apr 9, 2026",
    photoUrl: umbrellaImg,
  },
];
