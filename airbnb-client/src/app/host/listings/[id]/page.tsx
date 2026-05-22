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
  Power,
  PowerOff,
  ShieldCheck,
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
import { formatPrice } from "@/contants";
import { hasRealmRole } from "@/lib/jwt";
import type { RootState } from "@/store";

type PanelKey = "details" | "photos" | "pricing" | "rules" | "availability";

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

const panels: Array<{ key: PanelKey; label: string; icon: ElementType }> = [
  { key: "details", label: "Listing editor", icon: Pencil },
  { key: "photos", label: "Photo tour", icon: Camera },
  { key: "pricing", label: "Pricing", icon: CircleDollarSign },
  { key: "rules", label: "House rules", icon: ShieldCheck },
  { key: "availability", label: "Availability", icon: CalendarDays },
];

const fallbackPreview =
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1400&auto=format&fit=crop";

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
      <span className="text-sm font-semibold text-neutral-950">{label}</span>
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
        <span className="flex size-11 items-center justify-center rounded-full bg-neutral-100">
          <Icon className="size-5 text-neutral-900" />
        </span>
        <span className="text-base font-semibold text-neutral-950">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() =>
            onChange(Math.max(min, Number((value - step).toFixed(1))))
          }
          disabled={value <= min}
          className="flex size-9 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 transition hover:border-neutral-950 disabled:opacity-30"
        >
          <Minus className="size-4" />
        </button>
        <span className="w-8 text-center text-base font-semibold text-neutral-950">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Number((value + step).toFixed(1)))}
          className="flex size-9 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 transition hover:border-neutral-950"
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
      className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-neutral-950 px-6 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
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

  const [activePanel, setActivePanel] = useState<PanelKey>("details");
  const [listing, setListing] = useState<ListingResponse | null>(null);
  const [form, setForm] = useState<ListingMutationPayload | null>(null);
  const [pricing, setPricing] = useState<ListingPricingPayload>(defaultPricing);
  const [rules, setRules] = useState<HouseRulesPayload>(defaultRules);
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
      flashSuccess("House rules saved.");
      void loadListing();
    } catch (error: any) {
      setError(error?.response?.data?.message ?? "Unable to save rules.");
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

    setError("");
    try {
      await listingAPI.deletePhoto(token, listingId, photoId);
      setPhotos((current) =>
        current.filter((photo) => photo.photoId !== photoId),
      );
      flashSuccess("Photo removed.");
    } catch (error: any) {
      setError(error?.response?.data?.message ?? "Unable to delete photo.");
    }
  };

  const handleSetCover = async (photoId: string) => {
    if (!token) return;

    setError("");
    try {
      await listingAPI.setCoverPhoto(token, listingId, photoId);
      void loadListing();
      flashSuccess("Cover photo updated.");
    } catch (error: any) {
      setError(
        error?.response?.data?.message ?? "Unable to update cover photo.",
      );
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
        <div className="rounded-2xl border border-neutral-200 bg-white p-8">
          Please log in to manage this listing.
        </div>
      </main>
    );
  }

  if (!isHost) {
    return (
      <main className="mx-auto max-w-4xl px-6 pb-12">
        <div className="rounded-2xl border border-neutral-200 bg-white p-8">
          <p className="text-xl font-semibold text-neutral-950">
            Only hosts can edit listings
          </p>
          <p className="mt-2 text-neutral-500">
            Complete host onboarding before managing places.
          </p>
          <button
            type="button"
            onClick={() => router.push("/host/become")}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-neutral-950 px-5 text-sm font-semibold text-white"
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

  return (
    <main className="min-h-[calc(100vh-96px)] bg-white pb-16">
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-8">
        <div className="flex items-center justify-between py-5">
          <button
            type="button"
            onClick={() => router.push("/host/listings")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-neutral-950"
          >
            <ArrowLeft className="size-4" />
            Listings
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleStatus("activate")}
              disabled={saving === "status" || listing?.status === "ACTIVE"}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-neutral-300 px-4 text-sm font-semibold text-neutral-900 transition hover:border-neutral-950 disabled:opacity-40"
            >
              <Power className="size-4" />
              Activate
            </button>
            <button
              type="button"
              onClick={() => handleStatus("deactivate")}
              disabled={saving === "status" || listing?.status === "INACTIVE"}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-neutral-300 px-4 text-sm font-semibold text-neutral-900 transition hover:border-neutral-950 disabled:opacity-40"
            >
              <PowerOff className="size-4" />
              Deactivate
            </button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div>
            <div className="relative overflow-hidden rounded-[28px] bg-neutral-100">
              <Image
                src={coverPhoto}
                alt={form.title || "Listing cover"}
                width={1400}
                height={780}
                className="aspect-[16/8] w-full object-cover"
                unoptimized
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-6 text-white">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-neutral-950">
                    {listing?.status ?? "DRAFT"}
                  </span>
                  <span className="rounded-full bg-black/35 px-3 py-1 text-xs font-semibold backdrop-blur">
                    {photos.length} photos
                  </span>
                </div>
                <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
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
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600">
                <X className="size-4" />
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                <Check className="size-4" />
                {success}
              </div>
            ) : null}

            <div className="sticky top-24 z-10 mt-8 border-b border-neutral-200 bg-white/95 backdrop-blur">
              <div className="flex gap-1 overflow-x-auto py-3">
                {panels.map((panel) => {
                  const Icon = panel.icon;
                  const active = activePanel === panel.key;

                  return (
                    <button
                      key={panel.key}
                      type="button"
                      onClick={() => setActivePanel(panel.key)}
                      className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${
                        active
                          ? "bg-neutral-950 text-white"
                          : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
                      }`}
                    >
                      <Icon className="size-4" />
                      {panel.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8">
              {activePanel === "details" ? (
                <form onSubmit={handleSaveListing} className="max-w-4xl">
                  <div className="mb-8">
                    <h2 className="text-3xl font-semibold tracking-tight text-neutral-950">
                      Tell guests what to expect
                    </h2>
                    <p className="mt-2 text-neutral-500">
                      {form.maxGuests} guests, {form.numBedrooms} bedrooms,{" "}
                      {form.numBeds} beds, {form.numBathrooms} baths
                    </p>
                  </div>

                  <div className="space-y-10">
                    <section>
                      <h3 className="text-lg font-semibold text-neutral-950">
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
                            className="mt-2 h-14 w-full rounded-xl border border-neutral-300 px-4 text-base outline-none transition focus:border-neutral-950"
                          />
                        </Field>
                        <Field label="Description" wide>
                          <textarea
                            rows={6}
                            value={form.description}
                            onChange={(event) =>
                              updateForm("description", event.target.value)
                            }
                            className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-base outline-none transition focus:border-neutral-950"
                          />
                        </Field>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-lg font-semibold text-neutral-950">
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
                              className={`flex h-16 items-center justify-between rounded-2xl border px-5 text-left transition ${
                                active
                                  ? "border-neutral-950 bg-neutral-50"
                                  : "border-neutral-200 hover:border-neutral-950"
                              }`}
                            >
                              <span className="font-semibold text-neutral-950">
                                {option.label}
                              </span>
                              {active ? <Check className="size-5" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-lg font-semibold text-neutral-950">
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
                              className={`flex items-center justify-between rounded-2xl border p-5 text-left transition ${
                                active
                                  ? "border-neutral-950 bg-neutral-50"
                                  : "border-neutral-200 hover:border-neutral-950"
                              }`}
                            >
                              <span>
                                <span className="block text-base font-semibold text-neutral-950">
                                  {option.label}
                                </span>
                                <span className="mt-1 block text-sm text-neutral-500">
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
                      <h3 className="text-lg font-semibold text-neutral-950">
                        Basics
                      </h3>
                      <div className="mt-5 rounded-2xl border border-neutral-200 px-5">
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
                      <h3 className="text-lg font-semibold text-neutral-950">
                        Location
                      </h3>
                      <div className="mt-5 grid gap-5 md:grid-cols-2">
                        <Field label="Street address" wide>
                          <input
                            value={form.address}
                            onChange={(event) =>
                              updateForm("address", event.target.value)
                            }
                            className="mt-2 h-14 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-neutral-950"
                          />
                        </Field>
                        <Field label="City">
                          <input
                            value={form.city}
                            onChange={(event) =>
                              updateForm("city", event.target.value)
                            }
                            className="mt-2 h-14 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-neutral-950"
                          />
                        </Field>
                        <Field label="Country">
                          <input
                            value={form.country}
                            onChange={(event) =>
                              updateForm("country", event.target.value)
                            }
                            className="mt-2 h-14 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-neutral-950"
                          />
                        </Field>
                        <Field label="State">
                          <input
                            value={form.state ?? ""}
                            onChange={(event) =>
                              updateForm("state", event.target.value)
                            }
                            className="mt-2 h-14 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-neutral-950"
                          />
                        </Field>
                        <Field label="Postal code">
                          <input
                            value={form.postalCode ?? ""}
                            onChange={(event) =>
                              updateForm("postalCode", event.target.value)
                            }
                            className="mt-2 h-14 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-neutral-950"
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
                            className="mt-2 h-14 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-neutral-950"
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
                            className="mt-2 h-14 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-neutral-950"
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
                        className={`flex w-full items-center justify-between rounded-2xl border p-5 text-left transition ${
                          form.instantBook
                            ? "border-neutral-950 bg-neutral-50"
                            : "border-neutral-200 hover:border-neutral-950"
                        }`}
                      >
                        <span>
                          <span className="block text-lg font-semibold text-neutral-950">
                            Instant book
                          </span>
                          <span className="mt-1 block text-sm text-neutral-500">
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
                      <h2 className="text-3xl font-semibold tracking-tight text-neutral-950">
                        Photo tour
                      </h2>
                      <p className="mt-2 text-neutral-500">
                        Choose a bright cover image and keep the gallery honest.
                      </p>
                    </div>
                    <label className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-neutral-950 px-6 text-sm font-semibold text-white transition hover:bg-neutral-800">
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
                      className="h-12 min-w-0 flex-1 rounded-full border border-neutral-300 px-5 text-sm outline-none transition focus:border-neutral-950"
                    />
                    <button
                      type="submit"
                      disabled={saving === "photo"}
                      className="inline-flex h-12 items-center gap-2 rounded-full border border-neutral-950 px-5 text-sm font-semibold"
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
                    <div className="flex aspect-[16/7] items-center justify-center rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 text-neutral-500">
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
                          <div className="group overflow-hidden rounded-3xl border border-neutral-200 bg-white">
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
                                className="text-sm font-semibold text-neutral-950 underline-offset-4 hover:underline disabled:text-neutral-400 disabled:no-underline"
                              >
                                {photo.isCover ? "Cover photo" : "Make cover"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(photo.photoId)}
                                className="inline-flex size-10 items-center justify-center rounded-full border border-neutral-200 text-red-600 transition hover:border-red-200 hover:bg-red-50"
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

              {activePanel === "pricing" ? (
                <form onSubmit={handleSavePricing} className="max-w-4xl">
                  <div className="mb-8">
                    <h2 className="text-3xl font-semibold tracking-tight text-neutral-950">
                      Set your price
                    </h2>
                    <p className="mt-2 text-neutral-500">
                      Nightly rate, guest fees, and discounts stay editable
                      anytime.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-neutral-200 p-6">
                    <p className="text-sm font-semibold text-neutral-500">
                      Nightly price
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <span className="text-6xl font-semibold text-neutral-950">
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
                        className="h-24 w-full min-w-0 border-0 text-7xl font-semibold tracking-normal outline-none"
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
                        className="mt-2 h-14 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-neutral-950"
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
                        className="mt-2 h-14 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-neutral-950"
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
                        className="mt-2 h-14 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-neutral-950"
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
                        className="mt-2 h-14 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-neutral-950"
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
                        className="mt-2 h-14 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-neutral-950"
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
                        className="mt-2 h-14 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-neutral-950"
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
                    <h2 className="text-3xl font-semibold tracking-tight text-neutral-950">
                      House rules
                    </h2>
                    <p className="mt-2 text-neutral-500">
                      Set clear expectations before guests book.
                    </p>
                  </div>

                  <section>
                    <h3 className="text-lg font-semibold text-neutral-950">
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
                          className="mt-2 h-14 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-neutral-950"
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
                          className="mt-2 h-14 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-neutral-950"
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
                          className="mt-2 h-14 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-neutral-950"
                        />
                      </Field>
                    </div>
                  </section>

                  <section className="mt-10">
                    <h3 className="text-lg font-semibold text-neutral-950">
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
                          className={`flex h-16 items-center justify-between rounded-2xl border px-5 text-left transition ${
                            rules[field as keyof HouseRulesPayload]
                              ? "border-neutral-950 bg-neutral-50"
                              : "border-neutral-200 hover:border-neutral-950"
                          }`}
                        >
                          <span className="font-semibold text-neutral-950">
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
                        className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-neutral-950"
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
                    <h2 className="text-3xl font-semibold tracking-tight text-neutral-950">
                      Availability
                    </h2>
                    <p className="mt-2 text-neutral-500">
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
                        className="mt-2 h-14 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-neutral-950"
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
                      className={`mt-7 flex h-14 items-center justify-between rounded-xl border px-4 text-left transition ${
                        availability.isAvailable
                          ? "border-neutral-950 bg-neutral-50"
                          : "border-neutral-200 hover:border-neutral-950"
                      }`}
                    >
                      <span className="font-semibold text-neutral-950">
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
                        className="mt-2 h-14 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-neutral-950"
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
                        className="mt-2 h-14 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-neutral-950"
                      />
                    </Field>
                  </div>

                  <div className="mt-8 rounded-3xl bg-neutral-50 p-6">
                    <div className="flex items-start gap-4">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white">
                        <Clock className="size-5 text-neutral-950" />
                      </span>
                      <div>
                        <p className="text-base font-semibold text-neutral-950">
                          {availability.date} is{" "}
                          {availability.isAvailable
                            ? "open for booking"
                            : "blocked"}
                        </p>
                        <p className="mt-1 text-sm text-neutral-500">
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

          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.12)]">
                <div className="relative aspect-[4/3] bg-neutral-100">
                  <Image
                    src={coverPhoto}
                    alt="Listing preview"
                    fill
                    className="object-cover"
                    unoptimized
                    sizes="380px"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="line-clamp-2 text-lg font-semibold text-neutral-950">
                        {form.title || "Untitled listing"}
                      </h2>
                      <p className="mt-1 text-sm text-neutral-500">
                        {form.city}, {form.country}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-neutral-950">
                      {formatPrice(
                        pricing.basePrice ?? 0,
                        pricing.currency ?? "USD",
                      )}
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-neutral-600">
                    <div className="rounded-2xl bg-neutral-50 p-3">
                      <Users className="mb-2 size-4 text-neutral-950" />
                      {form.maxGuests} guests
                    </div>
                    <div className="rounded-2xl bg-neutral-50 p-3">
                      <BedDouble className="mb-2 size-4 text-neutral-950" />
                      {form.numBeds} beds
                    </div>
                    <div className="rounded-2xl bg-neutral-50 p-3">
                      <Bath className="mb-2 size-4 text-neutral-950" />
                      {form.numBathrooms} baths
                    </div>
                    <div className="rounded-2xl bg-neutral-50 p-3">
                      <Camera className="mb-2 size-4 text-neutral-950" />
                      {photos.length} photos
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push(`/rooms/${listingId}`)}
                    className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-neutral-950 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-50"
                  >
                    View public page
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
