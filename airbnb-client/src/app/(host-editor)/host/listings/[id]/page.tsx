"use client";

import {
  ArrowLeft,
  Bath,
  BedDouble,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Home,
  ImagePlus,
  Loader2,
  MapPin,
  Minus,
  Pencil,
  Plus,
  Power,
  PowerOff,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  type ElementType,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSelector } from "react-redux";
import {
  type AmenityResponse,
  type AvailabilityPayload,
  type HouseRulesPayload,
  type ListingMutationPayload,
  type ListingPhotoResponse,
  type ListingPricingPayload,
  type ListingResponse,
  listingAPI,
  type PropertyType,
  type RoomType,
  unwrapApiData,
} from "@/api/endpoints/listing";
import { uploadAPI } from "@/api/endpoints/upload";
import AmenityPicker from "@/components/listing/AmenityPicker";
import LocationPickerMap from "@/components/listing/LocationPickerMap";
import { formatPrice } from "@/contants";
import { hasRealmRole } from "@/lib/jwt";
import type { RootState } from "@/store";

type PanelKey =
  | "details"
  | "title"
  | "property"
  | "location"
  | "photos"
  | "amenities"
  | "pricing"
  | "rules"
  | "availability";

const propertyOptions: Array<{ value: PropertyType; label: string }> = [
  { value: "APARTMENT", label: "Apartment" },
  { value: "HOUSE", label: "House" },
  { value: "VILLA", label: "Villa" },
  { value: "CONDO", label: "Condo" },
  { value: "TOWNHOUSE", label: "Townhouse" },
  { value: "COTTAGE", label: "Cottage" },
  { value: "BUNGALOW", label: "Bungalow" },
];

const roomOptions: Array<{
  value: RoomType;
  label: string;
  description: string;
}> = [
  {
    value: "ENTIRE_PLACE",
    label: "Entire place",
    description: "Guests have the whole place to themselves.",
  },
  {
    value: "PRIVATE_ROOM",
    label: "Private room",
    description: "Guests have a room and may share common spaces.",
  },
  {
    value: "SHARED_ROOM",
    label: "Shared room",
    description: "Guests sleep in a shared area.",
  },
];

const houseRuleOptions = [
  { field: "partiesAllowed", label: "Events allowed" },
  {
    field: "smokingAllowed",
    label: "Smoking, vaping, e-cigarettes allowed",
  },
  { field: "petsAllowed", label: "Pets allowed" },
  { field: "childrenAllowed", label: "Children allowed" },
] as const;

const panels: Array<{ key: PanelKey; label: string; icon: ElementType }> = [
  { key: "details", label: "Listing editor", icon: Pencil },
  { key: "photos", label: "Photo tour", icon: Camera },
  { key: "amenities", label: "Amenities", icon: Sparkles },
  { key: "pricing", label: "Pricing", icon: CircleDollarSign },
  { key: "rules", label: "House rules", icon: ShieldCheck },
  { key: "availability", label: "Availability", icon: CalendarDays },
];

const fallbackPreview =
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1400&auto=format&fit=crop";

const softShadow =
  "shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.1)]";

const inputClass =
  "mt-2 h-14 w-full rounded-lg border border-[#dddddd] px-4 text-base text-[#222222] outline-none transition focus:border-2 focus:border-[#222222]";

const textareaClass =
  "mt-2 w-full rounded-lg border border-[#dddddd] px-4 py-3 text-base text-[#222222] outline-none transition focus:border-2 focus:border-[#222222]";

const optionClass = (active: boolean) =>
  `border px-5 text-left transition ${
    active
      ? "border-[#222222] bg-[#f7f7f7]"
      : "border-[#dddddd] bg-white hover:border-[#222222]"
  }`;

function hasValidCheckInWindow(form: ListingMutationPayload) {
  return (
    !form.checkInEndTime ||
    (!!form.checkInStartTime && form.checkInStartTime < form.checkInEndTime)
  );
}

const defaultPricing: ListingPricingPayload = {
  basePrice: 100,
  currency: "USD",
  cleaningFee: 0,
  serviceFeePercentage: 5,
  weekendPrice: 0,
  weeklyDiscount: 0,
  monthlyDiscount: 0,
};

const defaultRules: HouseRulesPayload = {
  checkInFrom: "14:00",
  checkInTo: "22:00",
  checkOutTime: "11:00",
  smokingAllowed: false,
  petsAllowed: false,
  partiesAllowed: false,
  childrenAllowed: true,
  additionalRules: "",
};

function toListingForm(listing: ListingResponse): ListingMutationPayload {
  return {
    title: listing.title ?? "",
    description: listing.description ?? "",
    propertyType: listing.propertyType ?? "APARTMENT",
    roomType: listing.roomType ?? "ENTIRE_PLACE",
    numBedrooms: listing.numBedrooms ?? 1,
    numBeds: listing.numBeds ?? 1,
    numBathrooms: listing.numBathrooms ?? 1,
    maxGuests: listing.maxGuests ?? 2,
    address: listing.address ?? "",
    city: listing.city ?? "",
    state: listing.state ?? "",
    country: listing.country ?? "Vietnam",
    postalCode: listing.postalCode ?? "",
    latitude: listing.latitude ?? 10.762622,
    longitude: listing.longitude ?? 106.660172,
    instantBook: !!listing.instantBook,
    checkInStartTime: listing.checkInStartTime ?? "",
    checkInEndTime: listing.checkInEndTime ?? "",
    checkOutTime: listing.checkOutTime ?? "",
  };
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      <span className="text-sm font-medium text-[#222222]">{label}</span>
      {children}
    </div>
  );
}

function Stepper({
  label,
  value,
  min = 0,
  step = 1,
  icon: Icon,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  step?: number;
  icon: ElementType;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-200 py-5 last:border-b-0">
      <div className="flex items-center gap-4">
        <span className="flex size-11 items-center justify-center rounded-full bg-[#f2f2f2]">
          <Icon className="size-5 text-[#222222]" />
        </span>
        <span className="text-base font-medium text-[#222222]">{label}</span>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() =>
            onChange(Math.max(min, Number((value - step).toFixed(1))))
          }
          disabled={value <= min}
          className="flex size-9 items-center justify-center rounded-full border border-[#dddddd] text-[#6a6a6a] transition hover:border-[#222222] disabled:opacity-30"
        >
          <Minus className="size-4" />
        </button>
        <span className="w-8 text-center text-base font-medium text-[#222222]">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Number((value + step).toFixed(1)))}
          className="flex size-9 items-center justify-center rounded-full border border-[#dddddd] text-[#222222] transition hover:border-[#222222]"
        >
          +
        </button>
      </div>
    </div>
  );
}

function SaveButton({
  loading,
  children,
}: {
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#ff385c] px-6 text-sm font-medium text-white transition hover:bg-[#e00b41] disabled:bg-[#ffd1da]"
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

export default function EditListingPage() {
  const params = useParams<{ id: string }>();
  const listingId = params.id;
  const token = useSelector((state: RootState) => state.auth.token);
  const router = useRouter();
  const isHost = useMemo(() => !!token && hasRealmRole(token, "HOST"), [token]);

  const [activePanel, setActivePanel] = useState<PanelKey>("photos");
  const [listing, setListing] = useState<ListingResponse | null>(null);
  const [form, setForm] = useState<ListingMutationPayload | null>(null);
  const [pricing, setPricing] = useState<ListingPricingPayload>(defaultPricing);
  const [rules, setRules] = useState<HouseRulesPayload>(defaultRules);
  const [amenities, setAmenities] = useState<AmenityResponse[]>([]);
  const [selectedAmenityNames, setSelectedAmenityNames] = useState<string[]>(
    [],
  );
  const [photos, setPhotos] = useState<ListingPhotoResponse[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [availability, setAvailability] = useState<AvailabilityPayload>({
    date: new Date().toISOString().slice(0, 10),
    isAvailable: true,
    minNights: 1,
    maxNights: 30,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const coverPhoto = useMemo(
    () =>
      photos.find((photo) => photo.isCover)?.photoUrl ??
      photos[0]?.photoUrl ??
      fallbackPreview,
    [photos],
  );

  const loadListing = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await listingAPI.getRoomById(listingId);
      const nextListing = unwrapApiData(response.data);
      setListing(nextListing);
      setForm(toListingForm(nextListing));
      setPricing({ ...defaultPricing, ...nextListing.pricing });
      setRules({ ...defaultRules, ...nextListing.houseRules });
      setSelectedAmenityNames(
        nextListing.amenities?.map((amenity) => amenity.name) ?? [],
      );
      setPhotos(nextListing.photos ?? []);
    } catch {
      setError("Unable to load listing.");
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    void loadListing();
  }, [loadListing]);

  useEffect(() => {
    listingAPI
      .getAmenities()
      .then((response) => setAmenities(unwrapApiData(response.data)))
      .catch(() => setAmenities([]));
  }, []);

  const flashSuccess = (message: string) => {
    setSuccess(message);
    window.setTimeout(() => setSuccess(""), 2500);
  };

  const updateForm = <K extends keyof ListingMutationPayload>(
    field: K,
    value: ListingMutationPayload[K],
  ) => {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleSaveListing = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !form) return;

    if (!hasValidCheckInWindow(form)) {
      setError("Check-in start time must be before check-in end time.");
      return;
    }

    setSaving("listing");
    setError("");
    try {
      const response = await listingAPI.updateListing(token, listingId, form);
      const nextListing = unwrapApiData(response.data);
      setListing(nextListing);
      setForm(toListingForm(nextListing));
      flashSuccess("Listing details saved.");
    } catch (error: any) {
      setError(error?.response?.data?.message ?? "Unable to update listing.");
    } finally {
      setSaving("");
    }
  };

  const handleSavePricing = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;

    setSaving("pricing");
    setError("");
    try {
      await listingAPI.savePricing(token, listingId, pricing);
      flashSuccess("Pricing saved.");
      void loadListing();
    } catch (error: any) {
      setError(error?.response?.data?.message ?? "Unable to save pricing.");
    } finally {
      setSaving("");
    }
  };

  const handleSaveRules = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;

    setSaving("rules");
    setError("");
    try {
      await listingAPI.saveHouseRules(token, listingId, rules);
      if (form) {
        const response = await listingAPI.updateListing(token, listingId, form);
        const nextListing = unwrapApiData(response.data);
        setListing(nextListing);
        setForm(toListingForm(nextListing));
      }
      flashSuccess("House rules saved.");
      void loadListing();
    } catch (error: any) {
      setError(error?.response?.data?.message ?? "Unable to save rules.");
    } finally {
      setSaving("");
    }
  };

  const handleSaveAmenities = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;

    setSaving("amenities");
    setError("");
    try {
      await listingAPI.updateListingAmenityNames(
        token,
        listingId,
        selectedAmenityNames,
      );
      flashSuccess("Amenities saved.");
      void loadListing();
    } catch (error: any) {
      setError(error?.response?.data?.message ?? "Unable to save amenities.");
    } finally {
      setSaving("");
    }
  };

  const handleAddPhotoUrl = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !photoUrl.trim()) return;

    setSaving("photo");
    setError("");
    try {
      const response = await listingAPI.addPhoto(token, listingId, {
        photoUrl: photoUrl.trim(),
        caption: form?.title,
      });
      setPhotos((current) => [...current, unwrapApiData(response.data)]);
      setPhotoUrl("");
      flashSuccess("Photo added.");
    } catch (error: any) {
      setError(error?.response?.data?.message ?? "Unable to add photo.");
    } finally {
      setSaving("");
    }
  };

  const handleUploadPhotos = async (files?: FileList | null) => {
    if (!files?.length || !token) return;

    setUploadingPhoto(true);
    setError("");
    try {
      const uploadedPhotos: ListingPhotoResponse[] = [];

      for (const file of Array.from(files)) {
        const uploadResponse = await uploadAPI.uploadImage(token, file);
        const imageUrl = uploadResponse.data.data.url;
        const addResponse = await listingAPI.addPhoto(token, listingId, {
          photoUrl: imageUrl,
          caption: form?.title,
        });
        uploadedPhotos.push(unwrapApiData(addResponse.data));
      }

      setPhotos((current) => [...current, ...uploadedPhotos]);
      flashSuccess(
        uploadedPhotos.length === 1
          ? "Photo uploaded."
          : `${uploadedPhotos.length} photos uploaded.`,
      );
    } catch (error: any) {
      setError(error?.response?.data?.message ?? "Unable to upload images.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!token) return;
    if (!window.confirm("Delete this photo?")) return;

    setSaving(`delete-photo-${photoId}`);
    setError("");
    try {
      await listingAPI.deletePhoto(token, listingId, photoId);
      setPhotos((current) =>
        current.filter((photo) => photo.photoId !== photoId),
      );
      void loadListing();
      flashSuccess("Photo removed.");
    } catch (error: any) {
      setError(error?.response?.data?.message ?? "Unable to delete photo.");
    } finally {
      setSaving("");
    }
  };

  const handleSetCover = async (photoId: string) => {
    if (!token) return;

    setSaving(`cover-photo-${photoId}`);
    setError("");
    try {
      await listingAPI.setCoverPhoto(token, listingId, photoId);
      setPhotos((current) =>
        current.map((photo) => ({
          ...photo,
          isCover: photo.photoId === photoId,
        })),
      );
      void loadListing();
      flashSuccess("Cover photo updated.");
    } catch (error: any) {
      setError(
        error?.response?.data?.message ?? "Unable to update cover photo.",
      );
    } finally {
      setSaving("");
    }
  };

  const handleSaveAvailability = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;

    setSaving("availability");
    setError("");
    try {
      await listingAPI.saveAvailability(token, listingId, availability);
      flashSuccess("Availability saved.");
    } catch (error: any) {
      setError(
        error?.response?.data?.message ?? "Unable to save availability.",
      );
    } finally {
      setSaving("");
    }
  };

  const handleStatus = async (next: "activate" | "deactivate") => {
    if (!token) return;

    setSaving("status");
    setError("");
    try {
      if (next === "activate") {
        await listingAPI.activateListing(token, listingId);
      } else {
        await listingAPI.deactivateListing(token, listingId);
      }
      flashSuccess(
        next === "activate" ? "Listing activated." : "Listing deactivated.",
      );
      void loadListing();
    } catch (error: any) {
      setError(error?.response?.data?.message ?? "Unable to update status.");
    } finally {
      setSaving("");
    }
  };

  if (!token) {
    return (
      <main className="mx-auto max-w-4xl px-6 pb-12">
        <div className="rounded-[14px] border border-[#dddddd] bg-white p-8">
          Please log in to manage this listing.
        </div>
      </main>
    );
  }

  if (!isHost) {
    return (
      <main className="mx-auto max-w-4xl px-6 pb-12">
        <div className="rounded-[14px] border border-[#dddddd] bg-white p-8">
          <p className="text-[22px] font-medium text-[#222222]">
            Only hosts can edit listings
          </p>
          <p className="mt-2 text-[#6a6a6a]">
            Complete host onboarding before managing places.
          </p>
          <button
            type="button"
            onClick={() => router.push("/host/become")}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-[#ff385c] px-6 text-sm font-medium text-white transition hover:bg-[#e00b41]"
          >
            Become a host
          </button>
        </div>
      </main>
    );
  }

  if (loading || !form) {
    return (
      <main className="mx-auto max-w-6xl px-6 pb-12">
        <div className="flex min-h-[360px] items-center justify-center text-neutral-500">
          <Loader2 className="mr-3 size-5 animate-spin" />
          Loading listing
        </div>
      </main>
    );
  }

  const isListingActive = listing?.status === "ACTIVE";
  const statusAction = isListingActive ? "deactivate" : "activate";
  const StatusIcon = isListingActive ? PowerOff : Power;

  return (
    <main className="min-h-[calc(100vh-96px)] bg-white text-[#222222]">
      <section className="w-full">
        <div className="hidden items-center justify-between py-5">
          <button
            type="button"
            onClick={() => router.push("/host/listings")}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#6a6a6a] hover:text-[#222222]"
          >
            <ArrowLeft className="size-4" />
            Listings
          </button>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-[#f7f7f7] px-3 py-1 text-xs font-semibold text-[#222222] sm:inline-flex">
              {listing?.status ?? "DRAFT"}
            </span>
            <button
              type="button"
              onClick={() => handleStatus(statusAction)}
              disabled={saving === "status"}
              className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition disabled:opacity-60 ${
                isListingActive
                  ? "border border-[#dddddd] text-[#222222] hover:border-[#222222]"
                  : "bg-[#ff385c] text-white hover:bg-[#e00b41]"
              }`}
            >
              {saving === "status" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <StatusIcon className="size-4" />
              )}
              {isListingActive ? "Deactivate" : "Activate"}
            </button>
          </div>
        </div>

        <div className="grid min-h-[calc(100vh-96px)] lg:grid-cols-[34rem_minmax(0,1fr)]">
          <div className="order-2 min-w-0 border-l border-[#dddddd] px-6 py-10 lg:px-16 xl:px-24">
            <div
              className={`hidden overflow-hidden rounded-[20px] bg-[#f7f7f7] ${softShadow}`}
            >
              <Image
                src={coverPhoto}
                alt={form.title || "Listing cover"}
                width={1400}
                height={780}
                className="aspect-[16/7] w-full object-cover"
                unoptimized
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-6 text-white">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#222222]">
                    {listing?.status ?? "DRAFT"}
                  </span>
                  <span className="rounded-full bg-black/35 px-3 py-1 text-xs font-medium backdrop-blur">
                    {photos.length} photos
                  </span>
                </div>
                <h1 className="mt-4 max-w-3xl text-[28px] font-semibold leading-[1.3] tracking-normal md:text-[28px]">
                  {form.title || "Untitled listing"}
                </h1>
                <p className="mt-3 flex items-center gap-2 text-sm font-medium text-white/90">
                  <MapPin className="size-4" />
                  {form.address ? `${form.address}, ` : ""}
                  {form.city}, {form.country}
                </p>
              </div>
            </div>

            {error ? (
              <div className="mt-5 flex items-center gap-3 rounded-[14px] border border-red-100 bg-red-50 p-4 text-sm font-medium text-[#c13515]">
                <X className="size-4" />
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="mt-5 flex items-center gap-3 rounded-[14px] border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                <Check className="size-4" />
                {success}
              </div>
            ) : null}

            <div className="hidden">
              <div className="flex gap-1 overflow-x-auto py-3">
                {panels.map((panel) => {
                  const Icon = panel.icon;
                  const active = activePanel === panel.key;

                  return (
                    <button
                      key={panel.key}
                      type="button"
                      onClick={() => setActivePanel(panel.key)}
                      className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition ${
                        active
                          ? "bg-[#222222] text-white"
                          : "text-[#6a6a6a] hover:bg-[#f7f7f7] hover:text-[#222222]"
                      }`}
                    >
                      <Icon className="size-4" />
                      {panel.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mx-auto w-full max-w-4xl pb-24">
              {activePanel === "photos" ? (
                <section>
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <h2 className="text-[28px] font-semibold leading-tight text-[#222222]">
                        Photo tour
                      </h2>
                      <p className="mt-5 max-w-xl text-base leading-6 text-[#6a6a6a]">
                        Manage all photos guests can see on this listing.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex size-12 cursor-pointer items-center justify-center rounded-full bg-[#f7f7f7] text-2xl leading-none text-[#222222] transition hover:bg-[#f2f2f2]">
                        +
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(event) =>
                            void handleUploadPhotos(event.target.files)
                          }
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {photos.length ? (
                    <div className="mt-16 grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
                      {photos.map((photo, index) => (
                        <div key={photo.photoId} className="text-left">
                          <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-[#f7f7f7]">
                            <Image
                              src={photo.photoUrl}
                              alt={
                                photo.caption || `Listing photo ${index + 1}`
                              }
                              fill
                              className="object-cover"
                              unoptimized
                              sizes="(min-width: 1280px) 240px, (min-width: 640px) 50vw, 100vw"
                            />
                            <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-3">
                              {photo.isCover ? (
                                <span className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-3 text-xs font-semibold text-[#222222] shadow-sm">
                                  <Check className="size-4" />
                                  Cover
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleSetCover(photo.photoId)
                                  }
                                  disabled={
                                    saving === `cover-photo-${photo.photoId}`
                                  }
                                  className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-3 text-xs font-semibold text-[#222222] shadow-sm transition hover:bg-[#f7f7f7] disabled:opacity-60"
                                >
                                  {saving === `cover-photo-${photo.photoId}` ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <Camera className="size-4" />
                                  )}
                                  Set cover
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  void handleDeletePhoto(photo.photoId)
                                }
                                disabled={
                                  saving === `delete-photo-${photo.photoId}`
                                }
                                className="flex size-9 items-center justify-center rounded-full bg-white text-[#222222] shadow-sm transition hover:bg-[#f7f7f7] disabled:opacity-60"
                                aria-label={`Delete photo ${index + 1}`}
                              >
                                {saving === `delete-photo-${photo.photoId}` ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Trash2 className="size-4" />
                                )}
                              </button>
                            </div>
                          </div>
                          <p className="mt-4 text-base font-semibold text-[#222222]">
                            Photo {index + 1}
                          </p>
                          <p className="mt-1 text-sm text-[#6a6a6a]">
                            {photo.caption || "Listing photo"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <label className="mt-16 flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-[14px] border border-dashed border-[#dddddd] bg-[#f7f7f7] text-center transition hover:border-[#222222]">
                      <ImagePlus className="size-8 text-[#222222]" />
                      <span className="mt-4 text-base font-semibold text-[#222222]">
                        Add listing photos
                      </span>
                      <span className="mt-1 text-sm text-[#6a6a6a]">
                        Upload photos to show them here.
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(event) =>
                          void handleUploadPhotos(event.target.files)
                        }
                        className="hidden"
                      />
                    </label>
                  )}
                </section>
              ) : null}

              {activePanel === "title" ? (
                <form onSubmit={handleSaveListing}>
                  <div className="flex min-h-[560px] flex-col items-center justify-center text-center">
                    <p className="text-sm text-[#6a6a6a]">
                      {form.title.length}/50 available
                    </p>
                    <textarea
                      value={form.title}
                      onChange={(event) =>
                        updateForm("title", event.target.value.slice(0, 50))
                      }
                      maxLength={50}
                      rows={2}
                      className="mt-8 w-full resize-none border-0 bg-transparent text-center text-5xl font-semibold leading-tight text-[#222222] outline-none"
                    />
                    <span className="mt-24 flex size-14 items-center justify-center rounded-full bg-[#f7f7f7] text-2xl">
                      💡
                    </span>
                  </div>
                  <div className="sticky bottom-0 -mx-6 flex justify-end border-t border-[#dddddd] bg-white px-6 py-5">
                    <SaveButton loading={saving === "listing"}>Save</SaveButton>
                  </div>
                </form>
              ) : null}

              {activePanel === "property" ? (
                <form onSubmit={handleSaveListing}>
                  <h2 className="text-[28px] font-semibold leading-tight text-[#222222]">
                    Property type
                  </h2>
                  <div className="mt-12 space-y-8">
                    <Field label="Which is most like your place?" wide>
                      <select
                        value={form.propertyType}
                        onChange={(event) =>
                          updateForm(
                            "propertyType",
                            event.target.value as PropertyType,
                          )
                        }
                        className={inputClass}
                      >
                        {propertyOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Listing type" wide>
                      <select
                        value={form.roomType}
                        onChange={(event) =>
                          updateForm("roomType", event.target.value as RoomType)
                        }
                        className={inputClass}
                      >
                        {roomOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div className="rounded-[14px] border border-[#dddddd] px-5">
                      <Stepper
                        label="Guests"
                        value={form.maxGuests}
                        min={1}
                        icon={Users}
                        onChange={(value) => updateForm("maxGuests", value)}
                      />
                      <Stepper
                        label="Beds"
                        value={form.numBeds}
                        min={1}
                        icon={BedDouble}
                        onChange={(value) => updateForm("numBeds", value)}
                      />
                      <Stepper
                        label="Bathrooms"
                        value={form.numBathrooms}
                        min={0.5}
                        step={0.5}
                        icon={Bath}
                        onChange={(value) => updateForm("numBathrooms", value)}
                      />
                    </div>
                  </div>
                  <div className="sticky bottom-0 -mx-6 mt-12 flex justify-end border-t border-[#dddddd] bg-white px-6 py-5">
                    <SaveButton loading={saving === "listing"}>Save</SaveButton>
                  </div>
                </form>
              ) : null}

              {activePanel === "pricing" ? (
                <form onSubmit={handleSavePricing}>
                  <h2 className="text-[28px] font-semibold leading-tight text-[#222222]">
                    Pricing
                  </h2>
                  <p className="mt-6 max-w-xl text-base leading-6 text-[#6a6a6a]">
                    These settings apply to all nights, unless you customize
                    them by date. <span className="underline">Learn more</span>
                  </p>
                  <div className="mt-14 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[#222222]">
                      Nightly price
                    </h3>
                    <div className="flex items-center gap-3 text-sm">
                      Smart Pricing
                      <span className="h-7 w-12 rounded-full bg-[#929292] p-1">
                        <span className="block size-5 rounded-full bg-white" />
                      </span>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={pricing.basePrice}
                    onChange={(event) =>
                      setPricing((current) => ({
                        ...current,
                        basePrice: Number(event.target.value),
                      }))
                    }
                    className="mt-8 h-24 w-full rounded-[14px] border border-[#dddddd] px-8 text-3xl font-semibold text-[#222222] outline-none focus:border-[#222222]"
                  />
                  <div className="mt-5 rounded-[14px] border border-[#dddddd] p-6">
                    <p className="font-semibold text-[#222222]">
                      Weekend adjustment
                    </p>
                    <input
                      type="number"
                      min="0"
                      value={pricing.weekendPrice ?? 0}
                      onChange={(event) =>
                        setPricing((current) => ({
                          ...current,
                          weekendPrice: Number(event.target.value),
                        }))
                      }
                      className="mt-5 w-full border-0 text-3xl font-semibold outline-none"
                    />
                  </div>
                  <h3 className="mt-12 text-xl font-semibold text-[#222222]">
                    Discounts
                  </h3>
                  <div className="mt-6 grid gap-5">
                    <Field label="Weekly · For 7 nights or more">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={pricing.weeklyDiscount ?? 0}
                        onChange={(event) =>
                          setPricing((current) => ({
                            ...current,
                            weeklyDiscount: Number(event.target.value),
                          }))
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Monthly · For 28 nights or more">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={pricing.monthlyDiscount ?? 0}
                        onChange={(event) =>
                          setPricing((current) => ({
                            ...current,
                            monthlyDiscount: Number(event.target.value),
                          }))
                        }
                        className={inputClass}
                      />
                    </Field>
                  </div>
                  <div className="sticky bottom-0 -mx-6 mt-12 flex justify-end border-t border-[#dddddd] bg-white px-6 py-5">
                    <SaveButton loading={saving === "pricing"}>Save</SaveButton>
                  </div>
                </form>
              ) : null}

              {activePanel === "availability" ? (
                <form onSubmit={handleSaveAvailability}>
                  <h2 className="text-[28px] font-semibold leading-tight text-[#222222]">
                    Availability
                  </h2>
                  <p className="mt-6 max-w-xl text-base text-[#6a6a6a]">
                    Open or block individual dates and set stay length.
                  </p>
                  <div className="mt-12 grid gap-6 md:grid-cols-2">
                    <Field label="Date">
                      <input
                        type="date"
                        value={availability.date}
                        onChange={(event) =>
                          setAvailability((current) => ({
                            ...current,
                            date: event.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </Field>
                    <button
                      type="button"
                      onClick={() =>
                        setAvailability((current) => ({
                          ...current,
                          isAvailable: !current.isAvailable,
                        }))
                      }
                      className={`mt-7 flex h-14 items-center justify-between rounded-lg px-4 ${optionClass(availability.isAvailable)}`}
                    >
                      <span className="font-medium text-[#222222]">
                        {availability.isAvailable ? "Available" : "Blocked"}
                      </span>
                      {availability.isAvailable ? (
                        <Check className="size-5" />
                      ) : (
                        <X className="size-5" />
                      )}
                    </button>
                    <Field label="Minimum nights">
                      <input
                        type="number"
                        min="1"
                        value={availability.minNights ?? 1}
                        onChange={(event) =>
                          setAvailability((current) => ({
                            ...current,
                            minNights: Number(event.target.value),
                          }))
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Maximum nights">
                      <input
                        type="number"
                        min="1"
                        value={availability.maxNights ?? 30}
                        onChange={(event) =>
                          setAvailability((current) => ({
                            ...current,
                            maxNights: Number(event.target.value),
                          }))
                        }
                        className={inputClass}
                      />
                    </Field>
                  </div>
                  <div className="sticky bottom-0 -mx-6 mt-12 flex justify-end border-t border-[#dddddd] bg-white px-6 py-5">
                    <SaveButton loading={saving === "availability"}>
                      Save
                    </SaveButton>
                  </div>
                </form>
              ) : null}

              {activePanel === "location" ? (
                <form onSubmit={handleSaveListing}>
                  <h2 className="text-[28px] font-semibold leading-tight text-[#222222]">
                    Location
                  </h2>
                  <div className="mt-10">
                    <LocationPickerMap
                      address={[form.address, form.city, form.country]
                        .filter(Boolean)
                        .join(", ")}
                      latitude={form.latitude}
                      longitude={form.longitude}
                      onChange={(position) =>
                        setForm((current) =>
                          current
                            ? {
                                ...current,
                                latitude: position.latitude,
                                longitude: position.longitude,
                              }
                            : current,
                        )
                      }
                    />
                  </div>
                  <div className="mt-8 grid gap-5 md:grid-cols-2">
                    <Field label="Street address" wide>
                      <input
                        value={form.address}
                        onChange={(event) =>
                          updateForm("address", event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="City">
                      <input
                        value={form.city}
                        onChange={(event) =>
                          updateForm("city", event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Country">
                      <input
                        value={form.country}
                        onChange={(event) =>
                          updateForm("country", event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                  </div>
                  <div className="sticky bottom-0 -mx-6 mt-12 flex justify-end border-t border-[#dddddd] bg-white px-6 py-5">
                    <SaveButton loading={saving === "listing"}>Save</SaveButton>
                  </div>
                </form>
              ) : null}

              {activePanel === "amenities" ? (
                <form onSubmit={handleSaveAmenities}>
                  <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h2 className="text-[28px] font-semibold leading-tight text-[#222222]">
                        Amenities
                      </h2>
                      <p className="mt-5 text-[#6a6a6a]">
                        Select everything guests can use during their stay.
                      </p>
                    </div>
                    <p className="text-sm font-medium text-[#6a6a6a]">
                      {selectedAmenityNames.length} selected
                    </p>
                  </div>
                  <AmenityPicker
                    amenities={amenities}
                    selectedNames={selectedAmenityNames}
                    onChange={setSelectedAmenityNames}
                  />
                  <div className="sticky bottom-0 -mx-6 mt-12 flex justify-end border-t border-[#dddddd] bg-white px-6 py-5">
                    <SaveButton loading={saving === "amenities"}>
                      Save
                    </SaveButton>
                  </div>
                </form>
              ) : null}

              {activePanel === "rules" ? (
                <form onSubmit={handleSaveRules}>
                  <h2 className="text-[28px] font-semibold leading-tight text-[#222222]">
                    House rules
                  </h2>
                  <p className="mt-5 max-w-xl text-base text-[#6a6a6a]">
                    Set clear expectations before guests book. These settings
                    use the rule fields currently supported by this project.
                  </p>

                  <section className="mt-10 max-w-3xl">
                    {houseRuleOptions.map(({ field, label }) => {
                      const allowed = Boolean(rules[field]);

                      return (
                        <div
                          key={field}
                          className="flex min-h-20 items-center justify-between gap-6 border-b border-[#dddddd] py-5"
                        >
                          <span className="text-base font-medium text-[#222222]">
                            {label}
                          </span>
                          <div className="flex shrink-0 items-center gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                setRules((current) => ({
                                  ...current,
                                  [field]: false,
                                }))
                              }
                              aria-label={`Do not allow ${label}`}
                              aria-pressed={!allowed}
                              className={`flex size-10 items-center justify-center rounded-full transition ${
                                !allowed
                                  ? "bg-[#222222] text-white"
                                  : "bg-[#f2f2f2] text-[#222222] hover:bg-[#e8e8e8]"
                              }`}
                            >
                              <X className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setRules((current) => ({
                                  ...current,
                                  [field]: true,
                                }))
                              }
                              aria-label={`Allow ${label}`}
                              aria-pressed={allowed}
                              className={`flex size-10 items-center justify-center rounded-full transition ${
                                allowed
                                  ? "bg-[#222222] text-white"
                                  : "bg-[#f2f2f2] text-[#222222] hover:bg-[#e8e8e8]"
                              }`}
                            >
                              <Check className="size-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    <div className="flex min-h-20 items-center justify-between gap-6 border-b border-[#dddddd] py-5">
                      <span className="text-base font-medium text-[#222222]">
                        Number of guests
                      </span>
                      <div className="flex shrink-0 items-center gap-4">
                        <button
                          type="button"
                          onClick={() =>
                            updateForm(
                              "maxGuests",
                              Math.max(1, form.maxGuests - 1),
                            )
                          }
                          disabled={form.maxGuests <= 1}
                          className="flex size-10 items-center justify-center rounded-full bg-[#f2f2f2] text-[#222222] transition hover:bg-[#e8e8e8] disabled:cursor-not-allowed disabled:text-[#c4c4c4]"
                          aria-label="Decrease maximum guests"
                        >
                          <Minus className="size-4" />
                        </button>
                        <span className="w-6 text-center text-base font-medium text-[#222222]">
                          {form.maxGuests}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateForm("maxGuests", form.maxGuests + 1)
                          }
                          className="flex size-10 items-center justify-center rounded-full bg-[#f2f2f2] text-[#222222] transition hover:bg-[#e8e8e8]"
                          aria-label="Increase maximum guests"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                    </div>
                  </section>

                  <section className="mt-10 max-w-3xl">
                    <h3 className="text-base font-semibold text-[#222222]">
                      Check-in and checkout
                    </h3>
                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                      <Field label="Check-in from">
                        <input
                          type="time"
                          value={rules.checkInFrom}
                          onChange={(event) =>
                            setRules((current) => ({
                              ...current,
                              checkInFrom: event.target.value,
                            }))
                          }
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Check-in until">
                        <input
                          type="time"
                          value={rules.checkInTo}
                          onChange={(event) =>
                            setRules((current) => ({
                              ...current,
                              checkInTo: event.target.value,
                            }))
                          }
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Checkout">
                        <input
                          type="time"
                          value={rules.checkOutTime}
                          onChange={(event) =>
                            setRules((current) => ({
                              ...current,
                              checkOutTime: event.target.value,
                            }))
                          }
                          className={inputClass}
                        />
                      </Field>
                    </div>
                  </section>

                  <section className="mt-10 max-w-3xl">
                    <Field label="Additional rules" wide>
                      <textarea
                        value={rules.additionalRules ?? ""}
                        onChange={(event) =>
                          setRules((current) => ({
                            ...current,
                            additionalRules: event.target.value,
                          }))
                        }
                        rows={5}
                        className={textareaClass}
                        placeholder="Add anything else guests should know."
                      />
                    </Field>
                  </section>
                  <div className="sticky bottom-0 -mx-6 mt-12 flex justify-end border-t border-[#dddddd] bg-white px-6 py-5">
                    <SaveButton loading={saving === "rules"}>Save</SaveButton>
                  </div>
                </form>
              ) : null}
            </div>

            <div className="mt-8 hidden">
              {activePanel === "details" ? (
                <form onSubmit={handleSaveListing} className="max-w-4xl">
                  <div className="mb-8">
                    <h2 className="text-[22px] font-medium leading-tight text-[#222222]">
                      Tell guests what to expect
                    </h2>
                    <p className="mt-2 text-[#6a6a6a]">
                      {form.maxGuests} guests, {form.numBedrooms} bedrooms,{" "}
                      {form.numBeds} beds, {form.numBathrooms} baths
                    </p>
                  </div>

                  <div className="space-y-10">
                    <section>
                      <h3 className="text-base font-semibold text-[#222222]">
                        Title and description
                      </h3>
                      <div className="mt-5 grid gap-5">
                        <Field label="Listing title" wide>
                          <input
                            value={form.title}
                            onChange={(event) =>
                              updateForm("title", event.target.value)
                            }
                            maxLength={255}
                            className={inputClass}
                          />
                        </Field>
                        <Field label="Description" wide>
                          <textarea
                            rows={6}
                            value={form.description}
                            onChange={(event) =>
                              updateForm("description", event.target.value)
                            }
                            className={textareaClass}
                          />
                        </Field>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-base font-semibold text-[#222222]">
                        Property type
                      </h3>
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {propertyOptions.map((option) => {
                          const active = form.propertyType === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                updateForm("propertyType", option.value)
                              }
                              className={`flex h-16 items-center justify-between rounded-[14px] ${optionClass(active)}`}
                            >
                              <span className="font-medium text-[#222222]">
                                {option.label}
                              </span>
                              {active ? <Check className="size-5" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-base font-semibold text-[#222222]">
                        Room type
                      </h3>
                      <div className="mt-5 grid gap-3">
                        {roomOptions.map((option) => {
                          const active = form.roomType === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                updateForm("roomType", option.value)
                              }
                              className={`flex items-center justify-between rounded-[14px] p-5 ${optionClass(active)}`}
                            >
                              <span>
                                <span className="block text-base font-medium text-[#222222]">
                                  {option.label}
                                </span>
                                <span className="mt-1 block text-sm text-[#6a6a6a]">
                                  {option.description}
                                </span>
                              </span>
                              {active ? <Check className="size-5" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-base font-semibold text-[#222222]">
                        Basics
                      </h3>
                      <div className="mt-5 rounded-[14px] border border-[#dddddd] px-5">
                        <Stepper
                          label="Guests"
                          value={form.maxGuests}
                          min={1}
                          icon={Users}
                          onChange={(value) => updateForm("maxGuests", value)}
                        />
                        <Stepper
                          label="Bedrooms"
                          value={form.numBedrooms}
                          min={0}
                          icon={Home}
                          onChange={(value) => updateForm("numBedrooms", value)}
                        />
                        <Stepper
                          label="Beds"
                          value={form.numBeds}
                          min={1}
                          icon={BedDouble}
                          onChange={(value) => updateForm("numBeds", value)}
                        />
                        <Stepper
                          label="Bathrooms"
                          value={form.numBathrooms}
                          min={0.5}
                          step={0.5}
                          icon={Bath}
                          onChange={(value) =>
                            updateForm("numBathrooms", value)
                          }
                        />
                      </div>
                    </section>

                    <section>
                      <h3 className="text-base font-semibold text-[#222222]">
                        Location
                      </h3>
                      <div className="mt-5">
                        <LocationPickerMap
                          address={[form.address, form.city, form.country]
                            .filter(Boolean)
                            .join(", ")}
                          latitude={form.latitude}
                          longitude={form.longitude}
                          onChange={(position) =>
                            setForm((current) =>
                              current
                                ? {
                                    ...current,
                                    latitude: position.latitude,
                                    longitude: position.longitude,
                                  }
                                : current,
                            )
                          }
                        />
                      </div>
                      <div className="mt-5 grid gap-5 md:grid-cols-2">
                        <Field label="Street address" wide>
                          <input
                            value={form.address}
                            onChange={(event) =>
                              updateForm("address", event.target.value)
                            }
                            className={inputClass}
                          />
                        </Field>
                        <Field label="City">
                          <input
                            value={form.city}
                            onChange={(event) =>
                              updateForm("city", event.target.value)
                            }
                            className={inputClass}
                          />
                        </Field>
                        <Field label="Country">
                          <input
                            value={form.country}
                            onChange={(event) =>
                              updateForm("country", event.target.value)
                            }
                            className={inputClass}
                          />
                        </Field>
                        <Field label="State">
                          <input
                            value={form.state ?? ""}
                            onChange={(event) =>
                              updateForm("state", event.target.value)
                            }
                            className={inputClass}
                          />
                        </Field>
                        <Field label="Postal code">
                          <input
                            value={form.postalCode ?? ""}
                            onChange={(event) =>
                              updateForm("postalCode", event.target.value)
                            }
                            className={inputClass}
                          />
                        </Field>
                        <Field label="Latitude">
                          <input
                            type="number"
                            step="0.000001"
                            value={form.latitude}
                            onChange={(event) =>
                              updateForm("latitude", Number(event.target.value))
                            }
                            className={inputClass}
                          />
                        </Field>
                        <Field label="Longitude">
                          <input
                            type="number"
                            step="0.000001"
                            value={form.longitude}
                            onChange={(event) =>
                              updateForm(
                                "longitude",
                                Number(event.target.value),
                              )
                            }
                            className={inputClass}
                          />
                        </Field>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-base font-semibold text-[#222222]">
                        Check-in and check-out
                      </h3>
                      <div className="mt-5 grid gap-5 md:grid-cols-3">
                        <Field label="Check-in starts">
                          <input
                            type="time"
                            value={form.checkInStartTime}
                            onChange={(event) =>
                              updateForm("checkInStartTime", event.target.value)
                            }
                            className={inputClass}
                          />
                        </Field>
                        <Field label="Check-in ends">
                          <input
                            type="time"
                            value={form.checkInEndTime ?? ""}
                            onChange={(event) =>
                              updateForm(
                                "checkInEndTime",
                                event.target.value || undefined,
                              )
                            }
                            className={inputClass}
                          />
                          <span className="mt-1 block text-xs text-neutral-500">
                            Optional
                          </span>
                        </Field>
                        <Field label="Check-out">
                          <input
                            type="time"
                            value={form.checkOutTime}
                            onChange={(event) =>
                              updateForm("checkOutTime", event.target.value)
                            }
                            className={inputClass}
                          />
                        </Field>
                      </div>
                    </section>

                    <section>
                      <button
                        type="button"
                        onClick={() =>
                          updateForm("instantBook", !form.instantBook)
                        }
                        className={`flex w-full items-center justify-between rounded-[14px] p-5 ${optionClass(!!form.instantBook)}`}
                      >
                        <span>
                          <span className="block text-base font-semibold text-[#222222]">
                            Instant book
                          </span>
                          <span className="mt-1 block text-sm text-[#6a6a6a]">
                            Guests can reserve without waiting for approval.
                          </span>
                        </span>
                        {form.instantBook ? <Check className="size-5" /> : null}
                      </button>
                    </section>
                  </div>

                  <div className="mt-10 flex justify-end">
                    <SaveButton loading={saving === "listing"}>
                      Save listing
                    </SaveButton>
                  </div>
                </form>
              ) : null}

              {activePanel === "photos" ? (
                <section className="max-w-5xl">
                  <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h2 className="text-[22px] font-medium leading-tight text-[#222222]">
                        Photo tour
                      </h2>
                      <p className="mt-2 text-[#6a6a6a]">
                        Choose a bright cover image and keep the gallery honest.
                      </p>
                    </div>
                    <label className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#ff385c] px-6 text-sm font-medium text-white transition hover:bg-[#e00b41]">
                      {uploadingPhoto ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Upload className="size-4" />
                      )}
                      {uploadingPhoto ? "Uploading" : "Upload photos"}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(event) =>
                          void handleUploadPhotos(event.target.files)
                        }
                        className="hidden"
                      />
                    </label>
                  </div>

                  <form
                    onSubmit={handleAddPhotoUrl}
                    className="mb-6 flex gap-3"
                  >
                    <input
                      value={photoUrl}
                      onChange={(event) => setPhotoUrl(event.target.value)}
                      placeholder="Paste an image URL"
                      className="h-12 min-w-0 flex-1 rounded-full border border-[#dddddd] px-5 text-sm outline-none transition focus:border-2 focus:border-[#222222]"
                    />
                    <button
                      type="submit"
                      disabled={saving === "photo"}
                      className="inline-flex h-12 items-center gap-2 rounded-lg border border-[#222222] px-5 text-sm font-medium text-[#222222]"
                    >
                      {saving === "photo" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ImagePlus className="size-4" />
                      )}
                      Add
                    </button>
                  </form>

                  {photos.length === 0 ? (
                    <div className="flex aspect-[16/7] items-center justify-center rounded-[20px] border border-dashed border-[#dddddd] bg-[#f7f7f7] text-[#6a6a6a]">
                      <Camera className="mr-3 size-6" />
                      No photos yet
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {photos.map((photo, index) => (
                        <div
                          key={photo.photoId}
                          className={index === 0 ? "md:col-span-2" : undefined}
                        >
                          <div className="group overflow-hidden rounded-[14px] border border-[#dddddd] bg-white">
                            <div className="relative">
                              <Image
                                src={photo.photoUrl}
                                alt={photo.caption ?? "Listing photo"}
                                width={1100}
                                height={720}
                                className={
                                  index === 0
                                    ? "aspect-[16/7] w-full object-cover"
                                    : "aspect-[4/3] w-full object-cover"
                                }
                                unoptimized
                              />
                              {photo.isCover ? (
                                <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-bold text-neutral-950 shadow-sm">
                                  Cover
                                </span>
                              ) : null}
                            </div>
                            <div className="flex items-center justify-between p-4">
                              <button
                                type="button"
                                onClick={() => handleSetCover(photo.photoId)}
                                disabled={photo.isCover}
                                className="text-sm font-medium text-[#222222] underline-offset-4 hover:underline disabled:text-[#929292] disabled:no-underline"
                              >
                                {photo.isCover ? "Cover photo" : "Make cover"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(photo.photoId)}
                                className="inline-flex size-10 items-center justify-center rounded-full border border-[#dddddd] text-[#c13515] transition hover:border-red-200 hover:bg-red-50"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ) : null}

              {activePanel === "amenities" ? (
                <form onSubmit={handleSaveAmenities} className="max-w-5xl">
                  <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h2 className="text-[22px] font-medium leading-tight text-[#222222]">
                        Amenities
                      </h2>
                      <p className="mt-2 text-[#6a6a6a]">
                        Select everything guests can use during their stay.
                      </p>
                    </div>
                    <p className="text-sm font-medium text-[#6a6a6a]">
                      {selectedAmenityNames.length} selected
                    </p>
                  </div>

                  <AmenityPicker
                    amenities={amenities}
                    selectedNames={selectedAmenityNames}
                    onChange={setSelectedAmenityNames}
                  />

                  <div className="mt-10 flex justify-end">
                    <SaveButton loading={saving === "amenities"}>
                      Save amenities
                    </SaveButton>
                  </div>
                </form>
              ) : null}

              {activePanel === "pricing" ? (
                <form onSubmit={handleSavePricing} className="max-w-4xl">
                  <div className="mb-8">
                    <h2 className="text-[22px] font-medium leading-tight text-[#222222]">
                      Set your price
                    </h2>
                    <p className="mt-2 text-[#6a6a6a]">
                      Nightly rate, guest fees, and discounts stay editable
                      anytime.
                    </p>
                  </div>

                  <div className="rounded-[20px] border border-[#dddddd] p-6">
                    <p className="text-sm font-medium text-[#6a6a6a]">
                      Nightly price
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <span className="text-5xl font-semibold text-[#222222]">
                        $
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={pricing.basePrice}
                        onChange={(event) =>
                          setPricing((current) => ({
                            ...current,
                            basePrice: Number(event.target.value),
                          }))
                        }
                        className="h-20 w-full min-w-0 border-0 text-6xl font-semibold tracking-normal text-[#222222] outline-none"
                      />
                    </div>
                  </div>

                  <div className="mt-6 grid gap-5 md:grid-cols-2">
                    <Field label="Currency">
                      <input
                        value={pricing.currency}
                        onChange={(event) =>
                          setPricing((current) => ({
                            ...current,
                            currency: event.target.value.toUpperCase(),
                          }))
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Cleaning fee">
                      <input
                        type="number"
                        min="0"
                        value={pricing.cleaningFee ?? 0}
                        onChange={(event) =>
                          setPricing((current) => ({
                            ...current,
                            cleaningFee: Number(event.target.value),
                          }))
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Service fee percentage">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={pricing.serviceFeePercentage ?? 0}
                        onChange={(event) =>
                          setPricing((current) => ({
                            ...current,
                            serviceFeePercentage: Number(event.target.value),
                          }))
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Weekend price">
                      <input
                        type="number"
                        min="0"
                        value={pricing.weekendPrice ?? 0}
                        onChange={(event) =>
                          setPricing((current) => ({
                            ...current,
                            weekendPrice: Number(event.target.value),
                          }))
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Weekly discount">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={pricing.weeklyDiscount ?? 0}
                        onChange={(event) =>
                          setPricing((current) => ({
                            ...current,
                            weeklyDiscount: Number(event.target.value),
                          }))
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Monthly discount">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={pricing.monthlyDiscount ?? 0}
                        onChange={(event) =>
                          setPricing((current) => ({
                            ...current,
                            monthlyDiscount: Number(event.target.value),
                          }))
                        }
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <div className="mt-10 flex justify-end">
                    <SaveButton loading={saving === "pricing"}>
                      Save pricing
                    </SaveButton>
                  </div>
                </form>
              ) : null}

              {activePanel === "rules" ? (
                <form onSubmit={handleSaveRules} className="max-w-4xl">
                  <div className="mb-8">
                    <h2 className="text-[22px] font-medium leading-tight text-[#222222]">
                      House rules
                    </h2>
                    <p className="mt-2 text-[#6a6a6a]">
                      Set clear expectations before guests book.
                    </p>
                  </div>

                  <section>
                    <h3 className="text-base font-semibold text-[#222222]">
                      Check-in and checkout
                    </h3>
                    <div className="mt-5 grid gap-5 md:grid-cols-3">
                      <Field label="Check-in from">
                        <input
                          type="time"
                          value={rules.checkInFrom}
                          onChange={(event) =>
                            setRules((current) => ({
                              ...current,
                              checkInFrom: event.target.value,
                            }))
                          }
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Check-in until">
                        <input
                          type="time"
                          value={rules.checkInTo}
                          onChange={(event) =>
                            setRules((current) => ({
                              ...current,
                              checkInTo: event.target.value,
                            }))
                          }
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Checkout">
                        <input
                          type="time"
                          value={rules.checkOutTime}
                          onChange={(event) =>
                            setRules((current) => ({
                              ...current,
                              checkOutTime: event.target.value,
                            }))
                          }
                          className={inputClass}
                        />
                      </Field>
                    </div>
                  </section>

                  <section className="mt-10">
                    <h3 className="text-base font-semibold text-[#222222]">
                      Permissions
                    </h3>
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {[
                        ["smokingAllowed", "Smoking allowed"],
                        ["petsAllowed", "Pets allowed"],
                        ["partiesAllowed", "Parties allowed"],
                        ["childrenAllowed", "Children allowed"],
                      ].map(([field, label]) => (
                        <button
                          key={field}
                          type="button"
                          onClick={() =>
                            setRules((current) => ({
                              ...current,
                              [field]:
                                !current[field as keyof HouseRulesPayload],
                            }))
                          }
                          className={`flex h-16 items-center justify-between rounded-[14px] ${optionClass(!!rules[field as keyof HouseRulesPayload])}`}
                        >
                          <span className="font-medium text-[#222222]">
                            {label}
                          </span>
                          {rules[field as keyof HouseRulesPayload] ? (
                            <Check className="size-5" />
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="mt-10">
                    <Field label="Additional rules" wide>
                      <textarea
                        value={rules.additionalRules ?? ""}
                        onChange={(event) =>
                          setRules((current) => ({
                            ...current,
                            additionalRules: event.target.value,
                          }))
                        }
                        rows={5}
                        className={textareaClass}
                      />
                    </Field>
                  </section>

                  <div className="mt-10 flex justify-end">
                    <SaveButton loading={saving === "rules"}>
                      Save rules
                    </SaveButton>
                  </div>
                </form>
              ) : null}

              {activePanel === "availability" ? (
                <form onSubmit={handleSaveAvailability} className="max-w-4xl">
                  <div className="mb-8">
                    <h2 className="text-[22px] font-medium leading-tight text-[#222222]">
                      Availability
                    </h2>
                    <p className="mt-2 text-[#6a6a6a]">
                      Open or block individual dates and set stay length.
                    </p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Date">
                      <input
                        type="date"
                        value={availability.date}
                        onChange={(event) =>
                          setAvailability((current) => ({
                            ...current,
                            date: event.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </Field>
                    <button
                      type="button"
                      onClick={() =>
                        setAvailability((current) => ({
                          ...current,
                          isAvailable: !current.isAvailable,
                        }))
                      }
                      className={`mt-7 flex h-14 items-center justify-between rounded-lg px-4 ${optionClass(availability.isAvailable)}`}
                    >
                      <span className="font-medium text-[#222222]">
                        {availability.isAvailable ? "Available" : "Blocked"}
                      </span>
                      {availability.isAvailable ? (
                        <Check className="size-5" />
                      ) : (
                        <X className="size-5" />
                      )}
                    </button>
                    <Field label="Minimum nights">
                      <input
                        type="number"
                        min="1"
                        value={availability.minNights ?? 1}
                        onChange={(event) =>
                          setAvailability((current) => ({
                            ...current,
                            minNights: Number(event.target.value),
                          }))
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Maximum nights">
                      <input
                        type="number"
                        min="1"
                        value={availability.maxNights ?? 30}
                        onChange={(event) =>
                          setAvailability((current) => ({
                            ...current,
                            maxNights: Number(event.target.value),
                          }))
                        }
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <div className="mt-8 rounded-[20px] bg-[#f7f7f7] p-6">
                    <div className="flex items-start gap-4">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white">
                        <Clock className="size-5 text-[#222222]" />
                      </span>
                      <div>
                        <p className="text-base font-medium text-[#222222]">
                          {availability.date} is{" "}
                          {availability.isAvailable
                            ? "open for booking"
                            : "blocked"}
                        </p>
                        <p className="mt-1 text-sm text-[#6a6a6a]">
                          Guests can stay from {availability.minNights ?? 1} to{" "}
                          {availability.maxNights ?? 30} nights on this date.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 flex justify-end">
                    <SaveButton loading={saving === "availability"}>
                      Save availability
                    </SaveButton>
                  </div>
                </form>
              ) : null}
            </div>
          </div>

          <aside className="order-1 hidden h-[calc(100vh-96px)] overflow-y-auto px-10 py-10 xl:px-14 lg:block">
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => router.push("/host/listings")}
                className="flex size-12 items-center justify-center rounded-full bg-[#f7f7f7] text-[#222222] transition hover:bg-[#f2f2f2]"
                aria-label="Back to listings"
              >
                <ArrowLeft className="size-5" />
              </button>
              <h1 className="text-[26px] font-semibold leading-tight text-[#222222]">
                Listing editor
              </h1>
            </div>

            <div className="mt-9 flex items-center gap-3">
              <div className="flex h-12 rounded-full bg-[#f7f7f7] p-1">
                <button
                  type="button"
                  className="h-10 rounded-full bg-white px-10 text-sm font-semibold text-[#222222] shadow-sm"
                >
                  Your space
                </button>
              </div>
              <button
                type="button"
                className="flex size-12 items-center justify-center rounded-full bg-[#f7f7f7] text-[#222222]"
                aria-label="Listing settings"
              >
                <ShieldCheck className="size-5" />
              </button>
            </div>

            <div className="mt-7 space-y-4 pb-28">
              <button
                type="button"
                onClick={() => setActivePanel("photos")}
                className={`block w-full overflow-hidden rounded-[14px] bg-white text-left transition ${activePanel === "photos" ? "ring-2 ring-[#222222]" : softShadow}`}
              >
                <div className="relative aspect-[16/7] bg-[#f7f7f7]">
                  <Image
                    src={coverPhoto}
                    alt={form.title || "Listing cover"}
                    fill
                    className="object-cover"
                    unoptimized
                    sizes="420px"
                  />
                </div>
                <div className="p-5">
                  <p className="text-base font-semibold text-[#222222]">
                    Photo tour
                  </p>
                  <p className="mt-1 text-sm text-[#6a6a6a]">
                    {photos.length} photos
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActivePanel("title")}
                className={`block w-full rounded-[14px] bg-white p-5 text-left transition ${activePanel === "title" ? "ring-2 ring-[#222222]" : softShadow}`}
              >
                <p className="text-base font-semibold text-[#222222]">Title</p>
                <p className="mt-3 line-clamp-2 text-xl text-[#6a6a6a]">
                  {form.title || "Add title"}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActivePanel("property")}
                className={`block w-full rounded-[14px] bg-white p-5 text-left transition ${activePanel === "property" ? "ring-2 ring-[#222222]" : "hover:bg-[#f7f7f7]"}`}
              >
                <p className="text-base font-semibold text-[#222222]">
                  Property type
                </p>
                <p className="mt-3 text-base text-[#6a6a6a]">
                  {roomOptions.find((item) => item.value === form.roomType)
                    ?.label ?? "Entire place"}{" "}
                  ·{" "}
                  {propertyOptions.find(
                    (item) => item.value === form.propertyType,
                  )?.label ?? "Apartment"}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActivePanel("pricing")}
                className={`block w-full rounded-[14px] bg-white p-5 text-left transition ${activePanel === "pricing" ? "ring-2 ring-[#222222]" : softShadow}`}
              >
                <p className="text-base font-semibold text-[#222222]">
                  Pricing
                </p>
                <p className="mt-3 text-base text-[#6a6a6a]">
                  {formatPrice(
                    pricing.basePrice ?? 0,
                    pricing.currency ?? "USD",
                  )}{" "}
                  per night
                </p>
                <p className="mt-1 text-base text-[#6a6a6a]">
                  {pricing.weeklyDiscount ?? 0}% weekly discount
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActivePanel("availability")}
                className={`block w-full rounded-[14px] bg-white p-5 text-left transition ${activePanel === "availability" ? "ring-2 ring-[#222222]" : softShadow}`}
              >
                <p className="text-base font-semibold text-[#222222]">
                  Availability
                </p>
                <p className="mt-3 text-base text-[#6a6a6a]">
                  {availability.minNights ?? 1} - {availability.maxNights ?? 30}{" "}
                  nights
                </p>
                <p className="mt-1 text-base text-[#6a6a6a]">
                  {availability.isAvailable ? "Open date" : "Blocked date"}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActivePanel("property")}
                className={`block w-full rounded-[14px] bg-white p-5 text-left transition ${activePanel === "property" ? "ring-2 ring-[#222222]" : "hover:bg-[#f7f7f7]"}`}
              >
                <p className="text-base font-semibold text-[#222222]">
                  Number of guests
                </p>
                <p className="mt-3 text-base text-[#6a6a6a]">
                  {form.maxGuests} guests
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActivePanel("amenities")}
                className={`block w-full rounded-[14px] bg-white p-5 text-left transition ${activePanel === "amenities" ? "ring-2 ring-[#222222]" : softShadow}`}
              >
                <p className="text-base font-semibold text-[#222222]">
                  Amenities
                </p>
                <p className="mt-3 text-base text-[#6a6a6a]">
                  {selectedAmenityNames.length
                    ? `${selectedAmenityNames.length} selected`
                    : "Add details"}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActivePanel("location")}
                className={`block w-full rounded-[14px] bg-white p-5 text-left transition ${activePanel === "location" ? "ring-2 ring-[#222222]" : "hover:bg-[#f7f7f7]"}`}
              >
                <p className="text-base font-semibold text-[#222222]">
                  Location
                </p>
                <div className="mt-5 h-40 overflow-hidden rounded-lg bg-[#f7f7f7]">
                  <LocationPickerMap
                    address={[form.address, form.city, form.country]
                      .filter(Boolean)
                      .join(", ")}
                    latitude={form.latitude}
                    longitude={form.longitude}
                    onChange={() => undefined}
                  />
                </div>
                <p className="mt-4 text-base text-[#6a6a6a]">
                  {[form.address, form.city, form.country]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActivePanel("rules")}
                className={`block w-full rounded-[14px] bg-white p-5 text-left transition ${activePanel === "rules" ? "ring-2 ring-[#222222]" : softShadow}`}
              >
                <p className="text-base font-semibold text-[#222222]">
                  House rules
                </p>
                <div className="mt-4 space-y-3 text-base text-[#222222]">
                  <p className="flex items-center gap-3">
                    <Clock className="size-5" />
                    Check-in after {rules.checkInFrom || "3:00 PM"}
                  </p>
                  <p className="flex items-center gap-3">
                    <Users className="size-5" />
                    {form.maxGuests} guests maximum
                  </p>
                </div>
              </button>
            </div>

            <div className="pointer-events-none fixed bottom-8 left-[12rem]">
              <button
                type="button"
                onClick={() => router.push(`/rooms/${listingId}`)}
                className="pointer-events-auto inline-flex h-14 items-center gap-3 rounded-full bg-[#222222] px-8 text-base font-semibold text-white shadow-lg"
              >
                <Camera className="size-5" />
                View
              </button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
