import { Calendar, DoorOpen, ShieldCheck } from "lucide-react";

interface ListingData {
  propertyType: string;
  numBedrooms: number;
  numBeds: number;
  numBathrooms: number;
  maxGuests: number;
  description: string;
}

export function ListingInfo({data} : {data: ListingData}) {
  const displayPropertyType = data.propertyType.charAt(0) + data.propertyType.slice(1).toLowerCase()
  return (
    <div className="space-y-8">
      {/* title and keystats */}
      <div>
        <h2 className="text-2xl font-semibold mb-2">
          Entire {displayPropertyType} hosted by LocalHost
        </h2>
        <div className="flex flex-wrap gap-1 text-zinc-600 font-light">
          <span>{data.maxGuests} guests</span>
          <span>{data.numBedrooms} bedrooms</span>
          <span>{data.numBeds} beds</span>
          <span>{data.numBathrooms} baths</span>
        </div>
      </div>
      <hr className="border-zinc-200" />

      {/* highlight sections */}
      <div className="space-y-6">
        <div className="flex gap-4">
          <DoorOpen className="w-8 h-8 mt-1" />
          <div>
            <h4 className="font-semibold text-zinc-900">Self check-in</h4>
            <p className="text-zinc-500 font-light text-sm">Check yourself in with the keypad.</p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <ShieldCheck className="w-8 h-8 mt-1 text-rose-500" />
          <div>
            <h4 className="font-semibold text-zinc-900 italic">AirCover</h4>
            <p className="text-zinc-500 font-light text-sm leading-relaxed">
              Every booking includes free protection from Host cancellations, listing inaccuracies, and other issues like trouble checking in.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <Calendar className="w-8 h-8 mt-1" />
          <div>
            <h4 className="font-semibold text-zinc-900">Free cancellation for 48 hours</h4>
            <p className="text-zinc-500 font-light text-sm">Get a full refund if you change your mind.</p>
          </div>
        </div>
      </div>

      <hr className="border-zinc-200" />

      {/* Description */}
      <div className="text-zinc-700 leading-relaxed font-light py-2">
        <p className="whitespace-pre-line">
          {data.description || "Welcome to our beautiful property. Experience a wonderful stay with all modern amenities included."}
        </p>
      </div>

      {/* Show More Button (Optional Airbnb UI) */}
      <button className="underline font-semibold flex items-center gap-1 hover:text-black transition">
        Show more
      </button>
    </div>
  )
}