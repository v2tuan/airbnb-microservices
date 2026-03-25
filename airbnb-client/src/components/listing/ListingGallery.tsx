import Image from "next/image"

export function ListingGallery({photos} : {photos: any[] }) {
  return (
    <div className="relative grid grid-cols-4 grid-rows-2 gap-2 h-[450px] rounded-xl overflow-hidden">
      <div className="col-span-2 row-span-2 relative cursor-pointer hover:brightness-90 transition">
        <Image src={photos[0].photoUrl} alt="Cover" fill className="object-cover"/>
      </div>

      {photos.slice(1,5).map((photo,index) => (
        <div key={index} className="relative cursor-pointer hover:brightness-90 transition">
          <Image src={photo.photoUrl} alt={`Photo ${index}`} fill className="object-cover"/>
        </div>
      ))}

      {/* show all photos */}
      <button className="absolute bottom-6 right-6 bg-white border border-black px-4 py-1.5 rounded-lg text-sm font-semibold shadow-sm hover:bg-gray-100">
        Show all photos
      </button>
    </div>
  )
}