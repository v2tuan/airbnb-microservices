import { Calendar, DoorOpen, ShieldCheck, MapPin, Sparkles } from "lucide-react";
import { getCancellationPolicyDetail } from "@/lib/cancellation-policy";

interface ListingData {
  propertyType: string;
  numBedrooms: number;
  numBeds: number;
  numBathrooms: number;
  maxGuests: number;
  description: string;
  cancellationPolicyCode?: string;
}

export function ListingInfo({
  data,
  hostName = "LocalHost",
}: {
  data: ListingData;
  hostName?: string;
}) {
  const displayPropertyType = data.propertyType.charAt(0) + data.propertyType.slice(1).toLowerCase()
  const cancellationPolicy = getCancellationPolicyDetail(
    data.cancellationPolicyCode,
  );

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ff385c]">
          About this stay
        </p>
        <h2 className="text-[22px] font-semibold tracking-tight text-[#222222] sm:text-[26px]">
          Entire {displayPropertyType} hosted by {hostName}
        </h2>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-zinc-600">
          <span>{data.maxGuests} guests</span>
          <span>{data.numBedrooms} bedrooms</span>
          <span>{data.numBeds} beds</span>
          <span>{data.numBathrooms} baths</span>
        </div>
      </div>
      <hr className="border-[#ebebeb]" />

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="rounded-[16px] bg-[#f7f7f7] p-4">
          <DoorOpen className="h-6 w-6 text-[#222222]" />
          <div>
            <h4 className="mt-3 text-sm font-semibold text-[#222222]">Self check-in</h4>
            <p className="mt-1 text-sm leading-6 text-zinc-500">Check yourself in with the keypad.</p>
          </div>
        </div>

        <div className="rounded-[16px] bg-[#f7f7f7] p-4">
          <ShieldCheck className="h-6 w-6 text-[#ff385c]" />
          <div>
            <h4 className="mt-3 text-sm font-semibold text-[#222222]">AirCover</h4>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Every booking includes free protection from Host cancellations, listing inaccuracies, and other issues like trouble checking in.
            </p>
          </div>
        </div>

        <div className="rounded-[16px] bg-[#f7f7f7] p-4">
          <Calendar className="h-6 w-6 text-[#222222]" />
          <div>
            <h4 className="mt-3 text-sm font-semibold text-[#222222]">
              {cancellationPolicy.label} cancellation
            </h4>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              {cancellationPolicy.summary}
            </p>
            <ul className="mt-2 space-y-1 text-sm leading-5 text-zinc-500">
              {cancellationPolicy.rules.map((rule) => (
                <li key={rule} className="flex gap-2">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-zinc-400" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <hr className="border-[#ebebeb]" />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#ff385c]" />
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Description
          </h3>
        </div>
        <p className="whitespace-pre-line text-[15px] leading-7 text-zinc-700">
          {data.description || "Welcome to our beautiful property. Experience a wonderful stay with all modern amenities included."}
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <MapPin className="h-4 w-4 text-[#ff385c]" />
        <span>Guests love this location for the balance of access and privacy.</span>
      </div>

      <button className="inline-flex items-center gap-1 text-sm font-semibold text-[#222222] underline underline-offset-4 transition hover:text-[#ff385c]">
        Show more
      </button>
    </div>
  )
}
