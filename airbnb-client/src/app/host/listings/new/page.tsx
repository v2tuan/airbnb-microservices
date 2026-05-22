"use client";

import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Home,
  Hotel,
  House,
  Loader2,
  MapPin,
  Minus,
  Sparkles,
  TentTree,
  Upload,
  Users,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  type ListingMutationPayload,
  listingAPI,
  type PropertyType,
  type RoomType,
  unwrapApiData,
} from "@/api/endpoints/listing";
import { uploadAPI } from "@/api/endpoints/upload";
import { formatPrice } from "@/contants";
import { hasRealmRole } from "@/lib/jwt";
import type { RootState } from "@/store";

type StepKey = "place" | "basics" | "location" | "photos" | "publish";

const steps: Array<{
  key: StepKey;
  eyebrow: string;
  title: string;
  description: string;
}> = [
  {
    key: "place",
    eyebrow: "Step 1",
    title: "Which of these best describes your place?",
    description: "Guests use this to understand the kind of stay you offer.",
  },
  {
    key: "basics",
    eyebrow: "Step 2",
    title: "Share some basics about your place",
    description:
      "Add the details guests scan first: room type, guests, beds, and baths.",
  },
  {
    key: "location",
    eyebrow: "Step 3",
    title: "Where's your place located?",
    description:
      "Use a clear address and city so guests know the area before booking.",
  },
  {
    key: "photos",
    eyebrow: "Step 4",
    title: "Add a cover photo and a title",
    description: "A bright, honest first photo helps your place stand out.",
  },
  {
    key: "publish",
    eyebrow: "Step 5",
    title: "Set your price and finish up",
    description:
      "You can update pricing, photos, and rules later from your host dashboard.",
  },
];

const propertyOptions: Array<{
  value: PropertyType;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    value: "APARTMENT",
    label: "Apartment",
    description: "A rental unit in a shared building",
    icon: Building2,
  },
  {
    value: "HOUSE",
    label: "House",
    description: "A standalone home guests can settle into",
    icon: House,
  },
  {
    value: "VILLA",
    label: "Villa",
    description: "A spacious, private stay with room to breathe",
    icon: Home,
  },
  {
    value: "CONDO",
    label: "Condo",
    description: "A polished unit with building amenities",
    icon: Hotel,
  },
  {
    value: "TOWNHOUSE",
    label: "Townhouse",
    description: "A multi-level home in a neighborhood",
    icon: Home,
  },
  {
    value: "COTTAGE",
    label: "Cottage",
    description: "A cozy stay with a relaxed feel",
    icon: TentTree,
  },
  {
    value: "BUNGALOW",
    label: "Bungalow",
    description: "A low-rise home with easy living",
    icon: Sparkles,
  },
];

const roomOptions: Array<{
  value: RoomType;
  label: string;
  description: string;
}> = [
  {
    value: "ENTIRE_PLACE",
    label: "An entire place",
    description: "Guests have the whole place to themselves.",
  },
  {
    value: "PRIVATE_ROOM",
    label: "A private room",
    description: "Guests have a room and may share common spaces.",
  },
  {
    value: "SHARED_ROOM",
    label: "A shared room",
    description: "Guests sleep in a shared area.",
  },
];

const initialForm: ListingMutationPayload = {
  title: "",
  description: "",
  propertyType: "APARTMENT",
  roomType: "ENTIRE_PLACE",
  numBedrooms: 1,
  numBeds: 1,
  numBathrooms: 1,
  maxGuests: 2,
  address: "",
  city: "",
  state: "",
  country: "Vietnam",
  postalCode: "",
  latitude: 10.762622,
  longitude: 106.660172,
  instantBook: false,
  checkInStartTime: "",
  checkInEndTime: "",
  checkOutTime: "",
};

const fallbackPreview =
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1200&auto=format&fit=crop";

function hasValidCheckInWindow(form: ListingMutationPayload) {
  return (
    !form.checkInEndTime ||
    (!!form.checkInStartTime && form.checkInStartTime < form.checkInEndTime)
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
  icon: React.ElementType;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-200 py-5 last:border-b-0">
      <div className="flex items-center gap-4">
        <div className="flex size-11 items-center justify-center rounded-full bg-neutral-100">
          <Icon className="size-5 text-neutral-800" />
        </div>
        <p className="text-base font-semibold text-neutral-950">{label}</p>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() =>
            onChange(Math.max(min, Number((value - step).toFixed(1))))
          }
          disabled={value <= min}
          className="flex size-9 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 disabled:opacity-30"
        >
          <Minus className="size-4" />
        </button>
        <span className="w-8 text-center text-base font-semibold">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Number((value + step).toFixed(1)))}
          className="flex size-9 items-center justify-center rounded-full border border-neutral-300 text-neutral-700"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function NewListingPage() {
  const token = useSelector((state: RootState) => state.auth.token);
  const router = useRouter();
  const isHost = useMemo(() => !!token && hasRealmRole(token, "HOST"), [token]);

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<ListingMutationPayload>(initialForm);
  const [basePrice, setBasePrice] = useState(100);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const currentStep = steps[stepIndex];
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const selectedProperty = useMemo(
    () =>
      propertyOptions.find((option) => option.value === form.propertyType) ??
      propertyOptions[0],
    [form.propertyType],
  );

  const update = <K extends keyof ListingMutationPayload>(
    field: K,
    value: ListingMutationPayload[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const canContinue = () => {
    if (currentStep.key === "location")
      return (
        !!form.address.trim() && !!form.city.trim() && !!form.country.trim()
      );
    if (currentStep.key === "photos")
      return !!form.title.trim() && !!form.description.trim();
    if (currentStep.key === "publish")
      return (
        basePrice > 0 &&
        !!form.checkInStartTime &&
        !!form.checkOutTime &&
        hasValidCheckInWindow(form)
      );
    return true;
  };

  const goNext = () => {
    if (!canContinue()) {
      setError(
        form.checkInEndTime && !hasValidCheckInWindow(form)
          ? "Check-in start time must be before check-in end time."
          : "Please complete the required fields on this step.",
      );
      return;
    }

    setError("");
    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  };

  const goBack = () => {
    setError("");
    setStepIndex((index) => Math.max(index - 1, 0));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;

    if (!canContinue()) {
      setError(
        form.checkInEndTime && !hasValidCheckInWindow(form)
          ? "Check-in start time must be before check-in end time."
          : "Please complete the required fields before publishing.",
      );
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await listingAPI.createListing(token, form);
      const created = unwrapApiData(response.data);

      await listingAPI.savePricing(token, created.listingId, {
        basePrice,
        currency: "USD",
        cleaningFee: 0,
        serviceFeePercentage: 5,
      });

      for (const [index, url] of photoUrls.entries()) {
        if (url.trim()) {
          await listingAPI.addPhoto(token, created.listingId, {
            photoUrl: url.trim(),
            caption: index === 0 ? form.title : `${form.title} ${index + 1}`,
          });
        }
      }

      router.push(`/host/listings/${created.listingId}`);
    } catch (error: any) {
      setError(error?.response?.data?.message ?? "Unable to create listing.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadPhotos = async (files?: FileList | null) => {
    if (!files?.length || !token) return;

    setUploading(true);
    setError("");
    try {
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        const response = await uploadAPI.uploadImage(token, file);
        uploadedUrls.push(response.data.data.url);
      }

      setPhotoUrls((current) => [...current, ...uploadedUrls]);
    } catch (error: any) {
      setError(error?.response?.data?.message ?? "Unable to upload images.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (url: string) => {
    setPhotoUrls((current) => current.filter((photoUrl) => photoUrl !== url));
  };

  if (!token) {
    return (
      <main className="mx-auto max-w-4xl px-6 pb-12">
        <div className="rounded-2xl border border-neutral-200 bg-white p-8">
          Please log in to create a listing.
        </div>
      </main>
    );
  }

  if (!isHost) {
    return (
      <main className="mx-auto max-w-4xl px-6 pb-12">
        <div className="rounded-2xl border border-neutral-200 bg-white p-8">
          <p className="text-xl font-semibold text-neutral-950">
            Only hosts can create listings
          </p>
          <p className="mt-2 text-neutral-500">
            Complete host onboarding before adding a new place.
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

  return (
    <main className="min-h-[calc(100vh-96px)] bg-white pb-28">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 pb-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_390px]">
        <section className="pt-4 md:pt-10">
          <button
            type="button"
            onClick={() =>
              stepIndex === 0 ? router.push("/host/listings") : goBack()
            }
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-neutral-950"
          >
            <ArrowLeft className="size-4" />
            {stepIndex === 0 ? "Exit" : "Back"}
          </button>

          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-500">
              {currentStep.eyebrow}
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950 md:text-5xl">
              {currentStep.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-600">
              {currentStep.description}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-10 max-w-3xl">
            {currentStep.key === "place" && (
              <div className="grid gap-4 sm:grid-cols-2">
                {propertyOptions.map((option) => {
                  const Icon = option.icon;
                  const active = form.propertyType === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => update("propertyType", option.value)}
                      className={`rounded-2xl border p-5 text-left transition ${
                        active
                          ? "border-neutral-950 bg-neutral-50 shadow-sm"
                          : "border-neutral-200 bg-white hover:border-neutral-950"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <Icon className="size-8 text-neutral-950" />
                        {active ? (
                          <span className="flex size-6 items-center justify-center rounded-full bg-neutral-950 text-white">
                            <Check className="size-4" />
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-5 text-lg font-semibold text-neutral-950">
                        {option.label}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-neutral-500">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {currentStep.key === "basics" && (
              <div className="space-y-8">
                <div className="grid gap-3">
                  {roomOptions.map((option) => {
                    const active = form.roomType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => update("roomType", option.value)}
                        className={`flex items-center justify-between rounded-2xl border p-5 text-left transition ${
                          active
                            ? "border-neutral-950 bg-neutral-50"
                            : "border-neutral-200 bg-white hover:border-neutral-950"
                        }`}
                      >
                        <span>
                          <span className="block text-lg font-semibold text-neutral-950">
                            {option.label}
                          </span>
                          <span className="mt-1 block text-sm text-neutral-500">
                            {option.description}
                          </span>
                        </span>
                        {active ? (
                          <Check className="size-5 text-neutral-950" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-neutral-200 px-5">
                  <Stepper
                    label="Guests"
                    value={form.maxGuests}
                    min={1}
                    icon={Users}
                    onChange={(value) => update("maxGuests", value)}
                  />
                  <Stepper
                    label="Bedrooms"
                    value={form.numBedrooms}
                    min={0}
                    icon={Home}
                    onChange={(value) => update("numBedrooms", value)}
                  />
                  <Stepper
                    label="Beds"
                    value={form.numBeds}
                    min={1}
                    icon={BedDouble}
                    onChange={(value) => update("numBeds", value)}
                  />
                  <Stepper
                    label="Bathrooms"
                    value={form.numBathrooms}
                    min={0.5}
                    step={0.5}
                    icon={Bath}
                    onChange={(value) => update("numBathrooms", value)}
                  />
                </div>
              </div>
            )}

            {currentStep.key === "location" && (
              <div className="space-y-5">
                <label className="block">
                  <span className="text-sm font-semibold text-neutral-950">
                    Street address
                  </span>
                  <input
                    value={form.address}
                    onChange={(event) => update("address", event.target.value)}
                    placeholder="House number, street, ward"
                    className="mt-2 h-14 w-full rounded-xl border border-neutral-300 px-4 text-base outline-none transition focus:border-neutral-950"
                  />
                </label>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-neutral-950">
                      City
                    </span>
                    <input
                      value={form.city}
                      onChange={(event) => update("city", event.target.value)}
                      placeholder="Da Nang"
                      className="mt-2 h-14 w-full rounded-xl border border-neutral-300 px-4 text-base outline-none transition focus:border-neutral-950"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-neutral-950">
                      Country
                    </span>
                    <input
                      value={form.country}
                      onChange={(event) =>
                        update("country", event.target.value)
                      }
                      className="mt-2 h-14 w-full rounded-xl border border-neutral-300 px-4 text-base outline-none transition focus:border-neutral-950"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-neutral-950">
                      Latitude
                    </span>
                    <input
                      type="number"
                      step="0.000001"
                      value={form.latitude}
                      onChange={(event) =>
                        update("latitude", Number(event.target.value))
                      }
                      className="mt-2 h-14 w-full rounded-xl border border-neutral-300 px-4 text-base outline-none transition focus:border-neutral-950"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-neutral-950">
                      Longitude
                    </span>
                    <input
                      type="number"
                      step="0.000001"
                      value={form.longitude}
                      onChange={(event) =>
                        update("longitude", Number(event.target.value))
                      }
                      className="mt-2 h-14 w-full rounded-xl border border-neutral-300 px-4 text-base outline-none transition focus:border-neutral-950"
                    />
                  </label>
                </div>
              </div>
            )}

            {currentStep.key === "photos" && (
              <div className="space-y-6">
                <label className="block">
                  <span className="text-sm font-semibold text-neutral-950">
                    Listing title
                  </span>
                  <input
                    value={form.title}
                    onChange={(event) => update("title", event.target.value)}
                    placeholder="Peaceful ocean-view apartment"
                    maxLength={255}
                    className="mt-2 h-14 w-full rounded-xl border border-neutral-300 px-4 text-base outline-none transition focus:border-neutral-950"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-neutral-950">
                    Description
                  </span>
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      update("description", event.target.value)
                    }
                    placeholder="Tell guests what makes your place comfortable, memorable, and easy to enjoy."
                    rows={5}
                    className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-base outline-none transition focus:border-neutral-950"
                  />
                </label>

                <div className="rounded-2xl border border-dashed border-neutral-300 p-6">
                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-base font-semibold text-neutral-950">
                        Upload listing photos
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        Select multiple images. The first one becomes the cover
                        photo.
                      </p>
                    </div>
                    <label className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-neutral-950 px-5 text-sm font-semibold text-white">
                      {uploading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Upload className="size-4" />
                      )}
                      {uploading ? "Uploading" : "Choose photos"}
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

                  {photoUrls.length > 0 ? (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {photoUrls.map((url, index) => (
                        <div
                          key={url}
                          className={index === 0 ? "sm:col-span-2" : undefined}
                        >
                          <div className="group overflow-hidden rounded-2xl border border-neutral-200">
                            <div className="relative">
                              <Image
                                src={url}
                                alt={
                                  index === 0
                                    ? "Cover preview"
                                    : `Listing photo ${index + 1}`
                                }
                                width={1100}
                                height={720}
                                className={
                                  index === 0
                                    ? "aspect-[16/10] w-full object-cover"
                                    : "aspect-[4/3] w-full object-cover"
                                }
                                unoptimized
                              />
                              {index === 0 ? (
                                <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-bold text-neutral-950 shadow-sm">
                                  Cover
                                </span>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(url)}
                                className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-white text-neutral-950 shadow-sm"
                                aria-label="Remove photo"
                              >
                                x
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-5 flex aspect-[16/10] items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500">
                      <Camera className="mr-2 size-5" />
                      No photos uploaded yet
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep.key === "publish" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-neutral-200 p-6">
                  <p className="text-base font-semibold text-neutral-950">
                    Nightly price
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    <span className="text-5xl font-semibold text-neutral-950">
                      $
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={basePrice}
                      onChange={(event) =>
                        setBasePrice(Number(event.target.value))
                      }
                      className="h-20 w-full rounded-xl border-0 text-6xl font-semibold outline-none"
                    />
                  </div>
                  <p className="mt-4 text-sm text-neutral-500">
                    Cleaning fee starts at 0 and service fee is set to 5%. You
                    can change both after publishing.
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-200 p-6">
                  <p className="text-base font-semibold text-neutral-950">
                    Check-in and check-out
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Set the arrival window guests will see before booking.
                  </p>
                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <label className="block">
                      <span className="text-sm font-semibold text-neutral-950">
                        Check-in starts
                      </span>
                      <input
                        type="time"
                        value={form.checkInStartTime}
                        onChange={(event) =>
                          update("checkInStartTime", event.target.value)
                        }
                        className="mt-2 h-12 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-neutral-950"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-neutral-950">
                        Check-in ends
                      </span>
                      <input
                        type="time"
                        value={form.checkInEndTime ?? ""}
                        onChange={(event) =>
                          update(
                            "checkInEndTime",
                            event.target.value || undefined,
                          )
                        }
                        className="mt-2 h-12 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-neutral-950"
                      />
                      <span className="mt-1 block text-xs text-neutral-500">
                        Optional
                      </span>
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-neutral-950">
                        Check-out
                      </span>
                      <input
                        type="time"
                        value={form.checkOutTime}
                        onChange={(event) =>
                          update("checkOutTime", event.target.value)
                        }
                        className="mt-2 h-12 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-neutral-950"
                      />
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => update("instantBook", !form.instantBook)}
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
                      Let guests book without waiting for approval.
                    </span>
                  </span>
                  {form.instantBook ? (
                    <Check className="size-5 text-neutral-950" />
                  ) : null}
                </button>

                <div className="rounded-2xl bg-neutral-50 p-5">
                  <p className="text-sm font-semibold text-neutral-950">
                    Ready to publish?
                  </p>
                  <p className="mt-1 text-sm leading-6 text-neutral-500">
                    Your listing starts as a backend listing with pricing and
                    uploaded photos. Add rules and availability from the edit
                    page.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <p className="mt-6 text-sm font-medium text-red-600">{error}</p>
            )}
          </form>
        </section>

        <aside className="hidden pt-10 lg:block">
          <div className="sticky top-28">
            <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.12)]">
              <div className="relative aspect-[4/3] bg-neutral-100">
                <Image
                  src={photoUrls[0] || fallbackPreview}
                  alt="Listing preview"
                  fill
                  className="object-cover"
                  unoptimized
                  sizes="390px"
                />
                <div className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-bold text-neutral-950 shadow-sm">
                  Preview
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="line-clamp-2 text-lg font-semibold text-neutral-950">
                      {form.title ||
                        `${selectedProperty.label} in ${form.city || "your city"}`}
                    </h2>
                    <p className="mt-1 text-sm text-neutral-500">
                      {form.city || "City"}, {form.country || "Country"}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-neutral-950">
                    {formatPrice(basePrice, "USD")}
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
                    <MapPin className="mb-2 size-4 text-neutral-950" />
                    {form.roomType.replace("_", " ").toLowerCase()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white">
        <div className="h-1 bg-neutral-200">
          <div
            className="h-full bg-neutral-950 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
          <button
            type="button"
            onClick={goBack}
            disabled={stepIndex === 0}
            className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-neutral-800 underline-offset-4 hover:underline disabled:opacity-0"
          >
            <ChevronLeft className="size-4" />
            Back
          </button>

          {currentStep.key === "publish" ? (
            <button
              type="button"
              onClick={(event) =>
                void handleSubmit(event as unknown as FormEvent)
              }
              disabled={saving || uploading}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-rose-500 px-7 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Publish listing
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={!canContinue() || uploading}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-neutral-950 px-7 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-40"
            >
              Next
              <ChevronRight className="size-4" />
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
