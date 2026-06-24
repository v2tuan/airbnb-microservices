import type { LucideIcon } from "lucide-react";
import {
  BadgeDollarSign,
  Clock3,
  MapPin,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export type RatingCategoryKey =
  | "cleanliness"
  | "accuracy"
  | "checkIn"
  | "communication"
  | "location"
  | "value";

export interface RatingCategoryConfig {
  key: RatingCategoryKey;
  label: string;
  icon: LucideIcon;
}

export const ratingCategoryConfig: RatingCategoryConfig[] = [
  { key: "cleanliness", label: "Cleanliness", icon: Sparkles },
  { key: "accuracy", label: "Accuracy", icon: ShieldCheck },
  { key: "checkIn", label: "Check-in", icon: Clock3 },
  { key: "communication", label: "Communication", icon: MessagesSquare },
  { key: "location", label: "Location", icon: MapPin },
  { key: "value", label: "Value", icon: BadgeDollarSign },
];
