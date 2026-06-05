export type CancellationPolicyCode = "FLEXIBLE" | "MODERATE" | "STRICT";

export interface CancellationPolicyDetail {
  code: CancellationPolicyCode;
  label: string;
  summary: string;
  rules: string[];
}

export const CANCELLATION_POLICY_DETAILS: Record<
  CancellationPolicyCode,
  CancellationPolicyDetail
> = {
  FLEXIBLE: {
    code: "FLEXIBLE",
    label: "Flexible",
    summary: "Best for guests who may need to change plans.",
    rules: [
      "At least 24 hours before check-in: 100% accommodation, cleaning fee, and service fee are refunded.",
      "Less than 24 hours before check-in: unused nights excluding the first night and cleaning fee are refunded; service fee is not refunded.",
    ],
  },
  MODERATE: {
    code: "MODERATE",
    label: "Moderate",
    summary: "Balanced protection for guests and hosts.",
    rules: [
      "At least 5 days before check-in: 100% accommodation, cleaning fee, and service fee are refunded.",
      "At least 24 hours and less than 5 days before check-in: 50% accommodation and 100% cleaning fee are refunded; service fee is not refunded.",
      "Less than 24 hours before check-in: cleaning fee only is refunded.",
    ],
  },
  STRICT: {
    code: "STRICT",
    label: "Strict",
    summary: "More protection for hosts when guests cancel late.",
    rules: [
      "At least 7 days before check-in: 50% accommodation and 100% cleaning fee are refunded; service fee is not refunded.",
      "Less than 7 days before check-in: cleaning fee only is refunded.",
    ],
  },
};

export function getCancellationPolicyDetail(
  code?: string | null,
): CancellationPolicyDetail {
  const normalized = code?.trim().toUpperCase() as
    | CancellationPolicyCode
    | undefined;

  return normalized && normalized in CANCELLATION_POLICY_DETAILS
    ? CANCELLATION_POLICY_DETAILS[normalized]
    : CANCELLATION_POLICY_DETAILS.FLEXIBLE;
}
