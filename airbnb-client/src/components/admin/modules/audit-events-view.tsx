"use client";

import { AlertTriangle, Bell, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  type AuditEventRecord,
  listAdminAuditEvents,
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

function severityTone(severity: AuditEventRecord["severity"]) {
  if (severity === "CRITICAL") return "danger";
  if (severity === "WARNING") return "warning";
  return "neutral";
}

export function AuditEventsViewModule() {
  const { token } = useAdminToken();
  const [items, setItems] = useState<AuditEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    listAdminAuditEvents(token)
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
            "GET /activity/admin/events is not available yet. This module is a typed placeholder for the audit/event stream.",
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
      critical: items.filter((item) => item.severity === "CRITICAL").length,
      warnings: items.filter((item) => item.severity === "WARNING").length,
    }),
    [items],
  );

  return (
    <>
      <AdminPageHeader
        eyebrow="Audit"
        title="Audit and event view"
        description="Read the operational event trail for admin-sensitive booking, refund, complaint, penalty and listing actions."
      />
      <div className="mx-auto max-w-[1280px] space-y-6 p-5 sm:p-8">
        <div className="grid gap-4 md:grid-cols-3">
          <AdminMetricCard
            accent="brand"
            label="Events"
            value={metrics.total}
            note="Loaded audit entries."
            icon={Bell}
          />
          <AdminMetricCard
            accent="danger"
            label="Critical"
            value={metrics.critical}
            note="Requires immediate review."
            icon={ShieldAlert}
          />
          <AdminMetricCard
            accent="warning"
            label="Warnings"
            value={metrics.warnings}
            note="Operationally notable events."
            icon={AlertTriangle}
          />
        </div>
        <AdminCard className="p-0">
          <AdminSectionHeader
            title="Operational event stream"
            description="Chronological trail for admin-sensitive booking, refund, complaint, penalty and listing actions."
          />
          <div className="p-5">
            {loading ? <AdminLoadingRows /> : null}
            {!loading && error ? <AdminErrorState description={error} /> : null}
            {!loading && !error && items.length === 0 ? (
              <AdminEmptyState
                title="No audit events"
                description="Audit events will appear when the backend exposes the admin event stream."
              />
            ) : null}
            {!loading && !error && items.length > 0 ? (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.eventId}
                    className="relative rounded-[14px] border border-[#ebebeb] bg-white p-4 pl-6"
                  >
                    <span className="absolute left-0 top-5 h-8 w-1 rounded-full bg-[#ff385c]" />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-[#222222]">
                        {item.eventType}
                      </p>
                      <TextStatusPill tone={severityTone(item.severity)}>
                        {item.severity}
                      </TextStatusPill>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#6a6a6a]">
                      {item.message}
                    </p>
                    <p className="mt-3 text-xs text-[#6a6a6a]">
                      {formatAdminDate(item.occurredAt)} /{" "}
                      {item.actorRole ?? "SYSTEM"}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </AdminCard>
      </div>
    </>
  );
}
