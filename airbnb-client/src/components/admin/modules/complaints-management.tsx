"use client";

import { AlertTriangle, CheckCircle2, Inbox } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  decideAdminComplaint,
  listAdminComplaints,
} from "@/api/endpoints/admin";
import { useAdminToken } from "@/components/admin/admin-shell";
import {
  AdminCard,
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingRows,
  AdminMetricCard,
  AdminPageHeader,
  AdminSectionHeader,
  FieldLabel,
  formatAdminDate,
  getAdminErrorMessage,
  TextStatusPill,
} from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  AdminComplaintDecision,
  ComplaintResponse,
  ComplaintStatus,
  ComplaintType,
} from "@/types/booking.type";

const complaintStatuses: Array<ComplaintStatus | "ALL"> = [
  "ALL",
  "WAITING_HOST_RESPONSE",
  "OPEN",
  "ESCALATED_TO_ADMIN",
  "RESOLVED",
  "REJECTED",
  "CLOSED",
];

const decisionMatrix: Record<ComplaintType, AdminComplaintDecision[]> = {
  CANNOT_CHECK_IN: ["FULL_REFUND", "REJECT", "SUSPEND_LISTING"],
  NOT_AS_DESCRIBED: [
    "PARTIAL_REFUND",
    "FULL_REFUND",
    "REJECT",
    "SUSPEND_LISTING",
  ],
  UNCLEAN: ["RESOLVE_NO_REFUND", "PARTIAL_REFUND", "REJECT"],
  MISSING_AMENITY: ["RESOLVE_NO_REFUND", "PARTIAL_REFUND", "REJECT"],
  SAFETY_ISSUE: ["FULL_REFUND", "REJECT", "SUSPEND_LISTING"],
};

function complaintTone(status: ComplaintStatus) {
  if (status === "ESCALATED_TO_ADMIN") return "danger";
  if (status === "WAITING_HOST_RESPONSE" || status === "OPEN") {
    return "warning";
  }
  if (status === "RESOLVED") return "success";
  return "neutral";
}

function shortCode(value?: string | null) {
  return value ? value.slice(0, 8).toUpperCase() : "N/A";
}

export function ComplaintsManagementModule() {
  const { token } = useAdminToken();
  const [status, setStatus] = useState<ComplaintStatus | "ALL">(
    "ESCALATED_TO_ADMIN",
  );
  const [items, setItems] = useState<ComplaintResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ComplaintResponse | null>(null);
  const [decision, setDecision] =
    useState<AdminComplaintDecision>("RESOLVE_NO_REFUND");
  const [adminNote, setAdminNote] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    listAdminComplaints(token, status === "ALL" ? undefined : status)
      .then((response) => {
        if (!active) return;
        setItems(response.data ?? []);
      })
      .catch((err) => {
        if (!active) return;
        setItems([]);
        setError(getAdminErrorMessage(err, "Unable to load complaints."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, status]);

  const metrics = useMemo(
    () => ({
      total: items.length,
      escalated: items.filter((item) => item.status === "ESCALATED_TO_ADMIN")
        .length,
      resolved: items.filter((item) => item.status === "RESOLVED").length,
    }),
    [items],
  );

  const allowedDecisions = selected ? decisionMatrix[selected.type] : [];
  const canDecide =
    selected?.status === "ESCALATED_TO_ADMIN" &&
    allowedDecisions.includes(decision) &&
    adminNote.trim() &&
    (decision !== "PARTIAL_REFUND" || Number(refundAmount) > 0);

  function selectComplaint(complaint: ComplaintResponse) {
    setSelected(complaint);
    const nextDecision =
      decisionMatrix[complaint.type][0] ?? "RESOLVE_NO_REFUND";
    setDecision(nextDecision);
    setAdminNote("");
    setRefundAmount("");
    setActionMessage(null);
  }

  async function submitDecision() {
    if (!selected || !canDecide) return;

    setSubmitting(true);
    setActionMessage(null);
    try {
      const response = await decideAdminComplaint(token, selected.complaintId, {
        decision,
        adminNote: adminNote.trim(),
        refundAmount: refundAmount ? Number(refundAmount) : undefined,
      });
      setActionMessage("Complaint decision submitted.");
      setItems((current) =>
        current.map((item) =>
          item.complaintId === selected.complaintId
            ? (response.data ?? item)
            : item,
        ),
      );
      setSelected(response.data ?? selected);
    } catch (err) {
      setActionMessage(getAdminErrorMessage(err, "Complaint decision failed."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Complaint operations"
        title="Complaint management"
        description="Review escalated complaints and apply the V2 decision matrix. Every admin decision requires a note."
      />
      <div className="mx-auto max-w-[1280px] space-y-6 p-5 sm:p-8">
        <div className="grid gap-4 md:grid-cols-3">
          <AdminMetricCard
            accent="brand"
            label="Loaded"
            value={metrics.total}
            note="Complaints in current filter."
            icon={Inbox}
          />
          <AdminMetricCard
            accent="danger"
            label="Escalated"
            value={metrics.escalated}
            note="Ready for admin decision."
            icon={AlertTriangle}
          />
          <AdminMetricCard
            accent="success"
            label="Resolved"
            value={metrics.resolved}
            note="Completed decisions in view."
            icon={CheckCircle2}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <AdminCard className="p-0">
            <AdminSectionHeader
              title="Complaint queue"
              description="Escalated complaints are the only records eligible for admin decision."
              action={
                <Select
                  value={status}
                  onValueChange={(value) =>
                    setStatus(value as ComplaintStatus | "ALL")
                  }
                >
                  <SelectTrigger className="h-10 w-[230px] rounded-full bg-white">
                    <SelectValue placeholder="Complaint status" />
                  </SelectTrigger>
                  <SelectContent>
                    {complaintStatuses.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item === "ALL" ? "All" : item.replaceAll("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
            <div className="p-5">
              {loading ? <AdminLoadingRows /> : null}
              {!loading && error ? (
                <AdminErrorState description={error} />
              ) : null}
              {!loading && !error && items.length === 0 ? (
                <AdminEmptyState
                  title="No complaints"
                  description="There are no complaints for this filter."
                />
              ) : null}
              {!loading && !error && items.length > 0 ? (
                <div className="space-y-3">
                  {items.map((complaint) => (
                    <button
                      type="button"
                      key={complaint.complaintId}
                      onClick={() => selectComplaint(complaint)}
                      className="w-full rounded-[14px] border border-[#ebebeb] bg-white p-4 text-left transition hover:border-[#dddddd] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.10)]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-semibold text-[#222222]">
                          {complaint.type.replaceAll("_", " ")}
                        </p>
                        <TextStatusPill tone={complaintTone(complaint.status)}>
                          {complaint.status.replaceAll("_", " ")}
                        </TextStatusPill>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6a6a6a]">
                        {complaint.description}
                      </p>
                      <p className="mt-3 text-xs text-[#6a6a6a]">
                        Reservation {shortCode(complaint.bookingId)} / Created{" "}
                        {formatAdminDate(complaint.createdAt)}
                      </p>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </AdminCard>

          <AdminCard className="h-fit">
            <div className="rounded-[14px] border border-[#ebebeb] bg-[#f7f7f7] p-5">
              <h2 className="text-base font-semibold text-[#222222]">
                Decision panel
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#6a6a6a]">
                Decision options are constrained by complaint type and require
                an audit note.
              </p>
            </div>
            {!selected ? (
              <p className="mt-5 text-sm leading-6 text-[#6a6a6a]">
                Select an escalated complaint to issue a decision.
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="rounded-[14px] bg-[#f7f7f7] p-4">
                  <p className="text-sm font-semibold text-[#222222]">
                    {selected.type.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-xs text-[#6a6a6a]">
                    Reservation {shortCode(selected.bookingId)}
                  </p>
                </div>
                <FieldLabel label="Allowed decision">
                  <Select
                    value={decision}
                    onValueChange={(value) =>
                      setDecision(value as AdminComplaintDecision)
                    }
                    disabled={selected.status !== "ESCALATED_TO_ADMIN"}
                  >
                    <SelectTrigger className="h-14 w-full rounded-[8px] bg-white">
                      <SelectValue placeholder="Select decision" />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedDecisions.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item.replaceAll("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldLabel>
                <FieldLabel label="Refund amount">
                  <Input
                    value={refundAmount}
                    onChange={(event) => setRefundAmount(event.target.value)}
                    inputMode="decimal"
                    disabled={
                      decision !== "PARTIAL_REFUND" &&
                      decision !== "FULL_REFUND"
                    }
                    placeholder="Required for partial refund"
                    className="h-14 rounded-[8px]"
                  />
                </FieldLabel>
                <FieldLabel label="Admin note">
                  <Textarea
                    value={adminNote}
                    onChange={(event) => setAdminNote(event.target.value)}
                    placeholder="Required decision rationale"
                    className="min-h-28 rounded-[8px]"
                    disabled={selected.status !== "ESCALATED_TO_ADMIN"}
                  />
                </FieldLabel>
                <Button
                  onClick={submitDecision}
                  disabled={!canDecide || submitting}
                  className="h-12 w-full rounded-[8px] bg-[#ff385c] text-white hover:bg-[#e00b41]"
                >
                  {submitting ? "Submitting..." : "Submit decision"}
                </Button>
                {actionMessage ? (
                  <p className="text-sm leading-6 text-[#6a6a6a]">
                    {actionMessage}
                  </p>
                ) : null}
              </div>
            )}
          </AdminCard>
        </div>
      </div>
    </>
  );
}
