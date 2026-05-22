"use client";

import {
  Bath,
  BriefcaseBusiness,
  Car,
  CookingPot,
  Dumbbell,
  Flame,
  Gamepad2,
  HeartPulse,
  Monitor,
  ShieldCheck,
  Snowflake,
  Tv,
  Waves,
  Wifi,
} from "lucide-react";
import type { ElementType } from "react";
import type { AmenityResponse } from "@/api/endpoints/listing";

interface AmenityPickerProps {
  amenities?: AmenityResponse[];
  selectedNames: string[];
  onChange: (selectedNames: string[]) => void;
}

const categoryLabels: Record<string, string> = {
  BASIC: "What about guest favorites?",
  ENTERTAINMENT: "Do you have any standout amenities?",
  FACILITIES: "Do you have any standout amenities?",
  SAFETY: "Do you have any safety amenities?",
};

const categoryOrder = ["BASIC", "FACILITIES", "ENTERTAINMENT", "SAFETY"];

const defaultAmenities: AmenityResponse[] = [
  { amenityId: "Wi-Fi", name: "Wi-Fi", category: "BASIC" },
  { amenityId: "TV", name: "TV", category: "BASIC" },
  { amenityId: "Kitchen", name: "Kitchen", category: "BASIC" },
  { amenityId: "Washer", name: "Washer", category: "BASIC" },
  {
    amenityId: "Free parking on premises",
    name: "Free parking on premises",
    category: "BASIC",
  },
  {
    amenityId: "Paid parking on premises",
    name: "Paid parking on premises",
    category: "BASIC",
  },
  { amenityId: "Air conditioning", name: "Air conditioning", category: "BASIC" },
  {
    amenityId: "Dedicated workspace",
    name: "Dedicated workspace",
    category: "BASIC",
  },
  { amenityId: "Pool", name: "Pool", category: "FACILITIES" },
  { amenityId: "Hot tub", name: "Hot tub", category: "FACILITIES" },
  { amenityId: "Patio", name: "Patio", category: "FACILITIES" },
  { amenityId: "BBQ grill", name: "BBQ grill", category: "FACILITIES" },
  {
    amenityId: "Outdoor dining area",
    name: "Outdoor dining area",
    category: "FACILITIES",
  },
  { amenityId: "Fire pit", name: "Fire pit", category: "FACILITIES" },
  {
    amenityId: "Exercise equipment",
    name: "Exercise equipment",
    category: "FACILITIES",
  },
  {
    amenityId: "Outdoor shower",
    name: "Outdoor shower",
    category: "FACILITIES",
  },
  { amenityId: "Pool table", name: "Pool table", category: "ENTERTAINMENT" },
  {
    amenityId: "Indoor fireplace",
    name: "Indoor fireplace",
    category: "ENTERTAINMENT",
  },
  { amenityId: "Piano", name: "Piano", category: "ENTERTAINMENT" },
  { amenityId: "Lake access", name: "Lake access", category: "ENTERTAINMENT" },
  { amenityId: "Beach access", name: "Beach access", category: "ENTERTAINMENT" },
  { amenityId: "Ski-in/ski-out", name: "Ski-in/ski-out", category: "ENTERTAINMENT" },
  { amenityId: "Smoke alarm", name: "Smoke alarm", category: "SAFETY" },
  { amenityId: "First aid kit", name: "First aid kit", category: "SAFETY" },
  {
    amenityId: "Fire extinguisher",
    name: "Fire extinguisher",
    category: "SAFETY",
  },
  {
    amenityId: "Carbon monoxide alarm",
    name: "Carbon monoxide alarm",
    category: "SAFETY",
  },
];

function groupAmenities(amenities: AmenityResponse[]) {
  return amenities.reduce<Record<string, AmenityResponse[]>>(
    (groups, amenity) => {
      const category = amenity.category || "OTHER";
      groups[category] = groups[category] ?? [];
      groups[category].push(amenity);
      return groups;
    },
    {},
  );
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[-_]/g, " ");
}

function resolveIcon(amenity: AmenityResponse): ElementType {
  const name = normalize(amenity.name);
  const category = amenity.category;

  if (name.includes("wifi") || name.includes("wi fi")) return Wifi;
  if (name.includes("tv") || name.includes("television")) return Tv;
  if (name.includes("kitchen") || name.includes("bếp")) return CookingPot;
  if (name.includes("park") || name.includes("parking") || name.includes("xe"))
    return Car;
  if (name.includes("washer") || name.includes("laundry") || name.includes("giặt"))
    return Monitor;
  if (name.includes("air") || name.includes("condition") || name.includes("điều hòa"))
    return Snowflake;
  if (name.includes("work") || name.includes("làm việc")) return BriefcaseBusiness;
  if (name.includes("pool") || name.includes("bể bơi")) return Waves;
  if (name.includes("hot tub") || name.includes("bath") || name.includes("bồn"))
    return Bath;
  if (name.includes("bbq") || name.includes("fire") || name.includes("lửa"))
    return Flame;
  if (name.includes("gym") || name.includes("fitness") || name.includes("tập"))
    return Dumbbell;
  if (name.includes("game") || name.includes("piano") || name.includes("billiard"))
    return Gamepad2;
  if (category === "SAFETY") {
    if (name.includes("first aid") || name.includes("sơ cứu")) return HeartPulse;
    return ShieldCheck;
  }

  return ShieldCheck;
}

function getOrderedEntries(groups: Record<string, AmenityResponse[]>) {
  const known = categoryOrder
    .filter((category) => groups[category]?.length)
    .map((category) => [category, groups[category]] as const);
  const unknown = Object.entries(groups).filter(
    ([category]) => !categoryOrder.includes(category),
  );

  return [...known, ...unknown];
}

export default function AmenityPicker({
  amenities,
  selectedNames,
  onChange,
}: AmenityPickerProps) {
  const catalog = amenities?.length ? amenities : defaultAmenities;
  const selectedSet = new Set(selectedNames);
  const groups = groupAmenities(catalog);
  const entries = getOrderedEntries(groups);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-10">
      {entries.map(([category, items]) => (
        <section key={category}>
          <h4 className="text-base font-semibold text-neutral-950">
            {categoryLabels[category] ?? "Other amenities"}
          </h4>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((amenity) => {
              const Icon = resolveIcon(amenity);
              const active = selectedSet.has(amenity.name);

              return (
                <button
                  key={amenity.amenityId}
                  type="button"
                  onClick={() => {
                    if (!amenity.name) return;

                    onChange(
                      active
                        ? selectedNames.filter((name) => name !== amenity.name)
                        : [...selectedNames, amenity.name],
                    );
                  }}
                  className={`flex aspect-[1.58] min-h-24 flex-col items-start justify-between rounded-lg border bg-white p-4 text-left transition hover:border-neutral-950 ${
                    active
                      ? "border-2 border-neutral-950 shadow-[0_0_0_1px_#171717]"
                      : "border-neutral-300"
                  }`}
                >
                  <Icon className="size-6 text-neutral-950" strokeWidth={1.8} />
                  <span className="text-sm font-semibold leading-tight text-neutral-950">
                    {amenity.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
