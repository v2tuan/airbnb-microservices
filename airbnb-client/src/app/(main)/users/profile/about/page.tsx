"use client";

import { Camera } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import authAPI, { type MeResponse } from "@/api/endpoints/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  selectCurrentUser,
  selectIsAuthenticated,
} from "@/features/auth/authSelectors";
import { fetchMeThunk } from "@/features/auth/authSlice";
import type { AppDispatch, RootState } from "@/store";

type ProfileFormState = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bio: string;
};

const initialForm: ProfileFormState = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  bio: "",
};

const extractApiMessage = (error: unknown, fallbackMessage: string) => {
  const maybeAxiosError = error as {
    response?: { data?: { message?: string } };
    message?: string;
  };

  return (
    maybeAxiosError?.response?.data?.message ??
    maybeAxiosError?.message ??
    fallbackMessage
  );
};

const extractResponseMessage = (response: unknown, fallbackMessage: string) => {
  const maybeResponse = response as { data?: { message?: string } };

  return maybeResponse.data?.message ?? fallbackMessage;
};

export default function AboutPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border bg-white p-6">
          Loading profile...
        </div>
      }
    >
      <AboutPageContent />
    </Suspense>
  );
}

function AboutPageContent() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const token = useSelector((state: RootState) => state.auth.token);

  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [form, setForm] = useState<ProfileFormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isEditMode = searchParams.get("editMode") === "true";

  const displayName = useMemo(() => {
    if (profile?.fullName) return profile.fullName;
    const firstName = profile?.firstName ?? "";
    const lastName = profile?.lastName ?? "";
    return `${firstName} ${lastName}`.trim() || "Guest";
  }, [profile]);

  const avatarUrl = profile?.avatarUrl ?? user?.avatarUrl;

  const syncForm = useCallback((nextProfile: MeResponse) => {
    setForm({
      firstName: nextProfile.firstName ?? "",
      lastName: nextProfile.lastName ?? "",
      dateOfBirth: nextProfile.dateOfBirth ?? "",
      gender: nextProfile.gender ?? "",
      bio: nextProfile.bio ?? "",
    });
  }, []);

  const loadProfile = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");
    try {
      const response = await authAPI.getMe(token);
      const nextProfile = response.data?.data ?? null;
      if (!nextProfile) {
        setErrorMessage("Unable to load profile.");
      }
      setProfile(nextProfile);
      if (nextProfile) {
        syncForm(nextProfile);
      }
    } catch {
      setErrorMessage("Unable to load profile.");
    } finally {
      setLoading(false);
    }
  }, [syncForm, token]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const toggleEditMode = (enabled: boolean) => {
    router.push(
      enabled ? "/users/profile/about?editMode=true" : "/users/profile/about",
    );
  };

  const onChangeField = (field: keyof ProfileFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSaveProfile = async () => {
    if (!token) return;

    setSaving(true);
    setErrorMessage("");
    try {
      const response = await authAPI.updateMe(token, {
        firstName: form.firstName,
        lastName: form.lastName,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender,
        bio: form.bio,
      });
      const nextProfile = response.data?.data;
      if (nextProfile) {
        setProfile(nextProfile);
        syncForm(nextProfile);
      }
      await dispatch(fetchMeThunk(token));
      toast.success(
        extractResponseMessage(response, "Profile updated successfully."),
      );
      toggleEditMode(false);
    } catch (error) {
      const message = extractApiMessage(error, "Unable to update profile.");
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const onUploadAvatar = async (file: File) => {
    if (!token) return;

    setUploading(true);
    setErrorMessage("");
    try {
      const response = await authAPI.uploadAvatar(token, file);
      const nextProfile = response.data?.data;
      if (nextProfile) {
        setProfile(nextProfile);
        syncForm(nextProfile);
      }
      await dispatch(fetchMeThunk(token));
      toast.success(
        extractResponseMessage(response, "Avatar updated successfully."),
      );
    } catch (error) {
      const message = extractApiMessage(error, "Unable to upload avatar.");
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const initials =
    `${form.firstName.slice(0, 1)}${form.lastName.slice(0, 1)}`
      .trim()
      .toUpperCase() || "U";

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        Please login to view your profile.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">About me</h1>
        <Button variant="outline" onClick={() => toggleEditMode(!isEditMode)}>
          {isEditMode ? "Cancel" : "Edit"}
        </Button>
      </div>

      <Card className="rounded-2xl border bg-white shadow-sm">
        <CardContent className="space-y-6 pt-2">
          <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="size-24">
                <AvatarImage src={avatarUrl || undefined} alt="User avatar" />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>

              <div>
                <h2 className="text-xl font-semibold">{displayName}</h2>
                <p className="text-sm text-neutral-500">
                  {profile?.isHost ? "Host" : "Guest"}
                </p>
              </div>
            </div>

            {isEditMode && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void onUploadAvatar(file);
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Camera className="mr-2 size-4" />
                  {uploading ? "Uploading..." : "Change avatar"}
                </Button>
              </>
            )}
          </div>

          {loading ? (
            <p className="text-sm text-neutral-500">Loading profile...</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">First name</p>
                <Input
                  value={form.firstName}
                  readOnly={!isEditMode}
                  onChange={(event) =>
                    onChangeField("firstName", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Last name</p>
                <Input
                  value={form.lastName}
                  readOnly={!isEditMode}
                  onChange={(event) =>
                    onChangeField("lastName", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Date of birth</p>
                <Input
                  type="date"
                  value={form.dateOfBirth}
                  readOnly={!isEditMode}
                  onChange={(event) =>
                    onChangeField("dateOfBirth", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Gender</p>
                <Input
                  value={form.gender}
                  readOnly={!isEditMode}
                  onChange={(event) =>
                    onChangeField("gender", event.target.value)
                  }
                  placeholder="Male, Female, Other"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <p className="text-sm font-medium">Bio</p>
                <Textarea
                  value={form.bio}
                  readOnly={!isEditMode}
                  onChange={(event) => onChangeField("bio", event.target.value)}
                  placeholder="Tell us about yourself"
                />
              </div>
            </div>
          )}

          {errorMessage && (
            <p className="text-sm text-red-500">{errorMessage}</p>
          )}

          {isEditMode && (
            <div className="flex justify-end">
              <Button onClick={onSaveProfile} disabled={saving || uploading}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="border-t pt-4 text-sm text-neutral-500">
        Reviews I have written
      </div>
    </div>
  );
}
