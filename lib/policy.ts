// Policy primitive modeled after Overmind's pass/flag/stop runtime supervision
// pattern. Real Overmind SDK integration runs via OpenTelemetry below; this is
// the local enforcement layer — every potential sale is evaluated through
// these rules, in priority order. Each rule is explicit and explainable so
// the UI can show *why* a bid was stopped or flagged, not just that it was.

import { trace, SpanStatusCode } from "@opentelemetry/api";
import type { Bid, IntentSegment, Sensitivity } from "@/lib/types";

export type PolicyOutcome = "pass" | "flag" | "stop";

export interface PolicyDecision {
  outcome: PolicyOutcome;
  reason: string;
  triggered_rules: string[];
}

export interface ConsentRules {
  allow_low: boolean;
  allow_medium: boolean;
  allow_high: boolean;
  reserve_usd: number;
}

const tracer = trace.getTracer("mr-frogs.policy");

function allowsSensitivity(rules: ConsentRules, s: Sensitivity): boolean {
  return (
    (s === "low" && rules.allow_low) ||
    (s === "medium" && rules.allow_medium) ||
    (s === "high" && rules.allow_high)
  );
}

export function checkPolicy(
  bid: Bid,
  segment: IntentSegment,
  rules: ConsentRules,
): PolicyDecision {
  const span = tracer.startSpan("policy.check");
  span.setAttribute("policy.advertiser", bid.advertiser);
  span.setAttribute("policy.segment_id", segment.id);
  span.setAttribute("policy.bid_usd", bid.bid_usd);
  span.setAttribute("policy.floor_usd", segment.floor_price_usd);
  span.setAttribute("policy.sensitivity", segment.sensitivity);
  span.setAttribute("policy.reserve_usd", rules.reserve_usd);

  const decision = evaluate(bid, segment, rules);

  span.setAttribute("policy.outcome", decision.outcome);
  span.setAttribute("policy.reason", decision.reason);
  span.setAttribute("policy.triggered_rules", decision.triggered_rules.join(","));
  span.setStatus({
    code: decision.outcome === "stop" ? SpanStatusCode.ERROR : SpanStatusCode.OK,
    message: decision.reason,
  });
  span.end();

  return decision;
}

function evaluate(
  bid: Bid,
  segment: IntentSegment,
  rules: ConsentRules,
): PolicyDecision {
  // Rule 1 (highest priority): sensitivity_blocked → STOP.
  if (!allowsSensitivity(rules, segment.sensitivity)) {
    return {
      outcome: "stop",
      reason: `Sensitivity tier "${segment.sensitivity}" is blocked by consent`,
      triggered_rules: ["sensitivity_blocked"],
    };
  }

  // Rule 2: bid_below_reserve → STOP.
  if (bid.bid_usd < rules.reserve_usd) {
    return {
      outcome: "stop",
      reason: `Bid $${bid.bid_usd.toFixed(2)} is below reserve $${rules.reserve_usd.toFixed(2)}`,
      triggered_rules: ["bid_below_reserve"],
    };
  }

  // Rule 3: anomalous_bid → FLAG. Bid >3× floor signals overpayment, which
  // is a real signal for sensitive intent the bidder thinks is worth more
  // than the marketplace floor reflects.
  if (segment.floor_price_usd > 0 && bid.bid_usd > 3 * segment.floor_price_usd) {
    return {
      outcome: "flag",
      reason: `Bid is ${(bid.bid_usd / segment.floor_price_usd).toFixed(1)}× the segment floor — anomalous, review before sale`,
      triggered_rules: ["anomalous_bid"],
    };
  }

  // Rule 4: medium_sensitivity_unverified → FLAG. Medium-sensitivity sales
  // always require explicit approval even when allowed in the toggles.
  if (segment.sensitivity === "medium") {
    return {
      outcome: "flag",
      reason: "Medium-sensitivity sale requires explicit user approval",
      triggered_rules: ["medium_sensitivity_unverified"],
    };
  }

  // Default → PASS.
  return {
    outcome: "pass",
    reason: "All rules passed",
    triggered_rules: [],
  };
}
