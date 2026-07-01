"use client";

import { AlertTriangle, Clock3, ReceiptText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  type AdminRefundRecord,
  listAdminRefunds,
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
  formatAdminDate,
  getAdminErrorMessage,
  TextStatusPill,
} from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

function refundTone(status: AdminRefundRecord["status"]) {
  if (status === "COMPLETED") return "success";
  if (status === "FAILED") return "danger";
  if (status === "PROCESSING") return "warning";
  return "brand";
}

function shortCode(value?: string | null) {
  return value ? value.slice(0, 8).toUpperCase() : "N/A";
}

export function RefundsManagementModule() {
  const { token } = useAdminToken();
  const [items, setItems] = useState<AdminRefundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    listAdminRefunds(token)
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
            "GET /payments/admin/refunds is not available yet. Refunds are still created from cancellation quote, complaint decision, or admin force cancellation flows.",
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
      pending: items.filter(
        (item) => item.status === "PENDING" || item.status === "PROCESSING",
      ).length,
      failed: items.filter((item) => item.status === "FAILED").length,
    }),
    [items],
  );

  return (
    <>
      <AdminPageHeader
        eyebrow="Refund operations"
        title="Refund management"
        description="Read-only queue for refund records. Normal users cannot create arbitrary refunds; records must have a business cause."
      />
      <div className="mx-auto max-w-[1280px] space-y-6 p-5 sm:p-8">
        <div className="grid gap-4 md:grid-cols-3">
          <AdminMetricCard
            label="Refund records"
            value={metrics.total}
            note="Loaded from admin payment endpoint."
            accent="brand"
            icon={ReceiptText}
          />
          <AdminMetricCard
            label="Pending work"
            value={metrics.pending}
            note="PENDING or PROCESSING."
            accent="warning"
            icon={Clock3}
          />
          <AdminMetricCard
            label="Failed"
            value={metrics.failed}
            note="Requires provider/admin recovery."
            accent="danger"
            icon={AlertTriangle}
          />
        </div>
        <AdminCard className="p-0">
          <AdminSectionHeader
            title="Refund operations queue"
            description="Refund records are read-only here and must originate from business causes."
          />
          <div className="p-5">
            {loading ? <AdminLoadingRows /> : null}
            {!loading && error ? <AdminErrorState description={error} /> : null}
            {!loading && !error && items.length === 0 ? (
              <AdminEmptyState
                title="No refund records"
                description="Refund records will appear here after cancellation quotes, complaint decisions, or admin force cancellation create them."
              />
            ) : null}
            {!loading && !error && items.length > 0 ? (
              <Table className="min-w-[880px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Refund</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cause</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.refundId} className="border-[#eeeeee]">
                      <TableCell>
                        <p className="font-semibold">
                          Refund {shortCode(item.refundId)}
                        </p>
                        <p className="text-xs text-[#6a6a6a]">
                          Reservation {shortCode(item.bookingId)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <TextStatusPill tone={refundTone(item.status)}>
                          {item.status}
                        </TextStatusPill>
                      </TableCell>
                      <TableCell>
                        {item.businessCause.replaceAll("_", " ")}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(item.amount, item.currency)}
                      </TableCell>
                      <TableCell>{formatAdminDate(item.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          className="rounded-full"
                          disabled
                        >
                          Provider recovery TODO
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
          </div>
        </AdminCard>
      </div>
    </>
  );
}
