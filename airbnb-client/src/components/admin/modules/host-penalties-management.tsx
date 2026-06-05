"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type HostPenaltyRecord,
  listAdminHostPenalties,
  waiveAdminHostPenalty,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export function HostPenaltiesManagementModule() {
  const { token } = useAdminToken();
  const [items, setItems] = useState<HostPenaltyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [penaltyId, setPenaltyId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    listAdminHostPenalties(token)
      .then((response) => {
        if (!active) return;
        setItems(response.data ?? []);
      })
      .catch((err) => {
        if (!active) return;
        setItems([]);
        setError(
          getAdminErrorMessage(
            err,
            "GET /bookings/admin/host-penalties is not available yet. Manual waive is available when you know a penalty id.",
          ),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const metrics = useMemo(
    () => ({
      total: items.length,
      active: items.filter((item) => item.status === "ACTIVE").length,
      waived: items.filter((item) => item.status === "WAIVED").length,
    }),
    [items],
  );

  const canSubmit = penaltyId.trim() && reason.trim();

  async function submitWaive() {
    if (!canSubmit) return;

    setSubmitting(true);
    setActionMessage(null);
    try {
      await waiveAdminHostPenalty(token, penaltyId.trim(), reason.trim());
      setActionMessage("Host penalty waived.");
      setItems((current) =>
        current.map((item) =>
          item.penaltyId === penaltyId.trim()
            ? {
                ...item,
                status: "WAIVED",
                waiverReason: reason.trim(),
                waivedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
      setPenaltyId("");
      setReason("");
    } catch (err) {
      setActionMessage(getAdminErrorMessage(err, "Waive penalty failed."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Host penalties"
        title="Host penalty management"
        description="Review active host cancellation penalties and waive only with an admin reason. Waived penalties no longer count toward thresholds."
      />
      <div className="mx-auto max-w-[1280px] space-y-6 p-5 sm:p-8">
        <div className="grid gap-4 md:grid-cols-3">
          <AdminMetricCard
            label="Loaded"
            value={metrics.total}
            note="Penalty records returned."
            accent="brand"
          />
          <AdminMetricCard
            label="Active"
            value={metrics.active}
            note="Counts toward thresholds."
            accent="danger"
          />
          <AdminMetricCard
            label="Waived"
            value={metrics.waived}
            note="Excluded from threshold calculations."
            accent="success"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <AdminCard className="p-0">
            <AdminSectionHeader
              title="Penalty ledger"
              description="Active penalties count toward listing and host thresholds until waived."
            />
            <div className="p-5">
              {loading ? <AdminLoadingRows /> : null}
              {!loading && error ? (
                <AdminErrorState description={error} />
              ) : null}
              {!loading && !error && items.length === 0 ? (
                <AdminEmptyState
                  title="No penalties"
                  description="Active host cancellation penalties will appear here after host cancellation confirmation."
                />
              ) : null}
              {!loading && !error && items.length > 0 ? (
                <Table className="min-w-[820px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Penalty</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow
                        key={item.penaltyId}
                        className="border-[#eeeeee]"
                      >
                        <TableCell>
                          <p className="font-semibold">{item.penaltyId}</p>
                          <p className="text-xs text-[#6a6a6a]">
                            Host {item.hostId}
                          </p>
                        </TableCell>
                        <TableCell>
                          <TextStatusPill
                            tone={
                              item.status === "ACTIVE" ? "danger" : "neutral"
                            }
                          >
                            {item.status}
                          </TextStatusPill>
                        </TableCell>
                        <TableCell>{item.points}</TableCell>
                        <TableCell>{item.reasonCode ?? "Not set"}</TableCell>
                        <TableCell>{formatAdminDate(item.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            className="rounded-full"
                            disabled={item.status !== "ACTIVE"}
                            onClick={() => setPenaltyId(item.penaltyId)}
                          >
                            Use id
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : null}
            </div>
          </AdminCard>

          <AdminCard className="h-fit">
            <div className="rounded-[14px] border border-[#ebebeb] bg-[#f7f7f7] p-5">
              <h2 className="text-base font-semibold text-[#222222]">
                Waive penalty
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#6a6a6a]">
                Waivers require an admin reason and remove the penalty from
                threshold calculations.
              </p>
            </div>
            <div className="mt-5 space-y-4">
              <FieldLabel label="Penalty id">
                <Input
                  value={penaltyId}
                  onChange={(event) => setPenaltyId(event.target.value)}
                  placeholder="UUID"
                  className="h-14 rounded-[8px]"
                />
              </FieldLabel>
              <FieldLabel label="Waiver reason">
                <Textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Required reason"
                  className="min-h-28 rounded-[8px]"
                />
              </FieldLabel>
              <Button
                onClick={submitWaive}
                disabled={!canSubmit || submitting}
                className="h-12 w-full rounded-[8px] bg-[#ff385c] text-white hover:bg-[#e00b41]"
              >
                {submitting ? "Submitting..." : "Waive penalty"}
              </Button>
              {actionMessage ? (
                <p className="text-sm leading-6 text-[#6a6a6a]">
                  {actionMessage}
                </p>
              ) : null}
            </div>
          </AdminCard>
        </div>
      </div>
    </>
  );
}
