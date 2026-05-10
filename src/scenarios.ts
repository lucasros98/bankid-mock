import type {
  CollectResponse,
  CompletionData,
  FailedHintCode,
  MockOrder,
  PendingHintCode,
  Scenario,
} from "./types";

export interface ResolveOptions {
  pollsUntilResolved: number;
  fixturePersonalNumber: string;
  fixtureName: string;
}

const PENDING_PROGRESSION: PendingHintCode[] = [
  "outstandingTransaction",
  "noClient",
  "started",
  "userSign",
];

/**
 * Returns the collect response for an order based on its scenario and
 * how many times it has been polled.
 *
 * The state progression mirrors a real BankID flow:
 *   poll 1 → pending: outstandingTransaction
 *   poll 2 → pending: noClient
 *   poll 3 → pending: started
 *   poll 4 → pending: userSign
 *   poll N (= pollsUntilResolved) → terminal state per scenario
 */
export function resolveCollect(order: MockOrder, opts: ResolveOptions): CollectResponse {
  if (order.cancelled) {
    return failure(order.orderRef, "cancelled");
  }

  const { pollCount, scenario } = order;
  const { pollsUntilResolved } = opts;

  if (pollCount < pollsUntilResolved) {
    return pending(order.orderRef, pollCount);
  }

  switch (scenario) {
    case "success":
      return complete(order, opts);
    case "userCancel":
      return failure(order.orderRef, "userCancel");
    case "expiredTransaction":
      return failure(order.orderRef, "expiredTransaction");
    case "certificateErr":
      return failure(order.orderRef, "certificateErr");
    case "startFailed":
      return failure(order.orderRef, "startFailed");
  }
}

function pending(orderRef: string, pollCount: number): CollectResponse {
  // pollCount has already been incremented for the current poll, so the
  // first call sees pollCount=1 → outstandingTransaction.
  const idx = Math.min(Math.max(pollCount - 1, 0), PENDING_PROGRESSION.length - 1);
  return {
    orderRef,
    status: "pending",
    hintCode: PENDING_PROGRESSION[idx],
  };
}

function failure(orderRef: string, hintCode: FailedHintCode): CollectResponse {
  return {
    orderRef,
    status: "failed",
    hintCode,
  };
}

function complete(order: MockOrder, opts: ResolveOptions): CollectResponse {
  const personalNumber = order.requestedPersonalNumber ?? opts.fixturePersonalNumber;
  const completionData: CompletionData = {
    user: {
      personalNumber,
      name: opts.fixtureName,
      givenName: opts.fixtureName.split(" ")[0] ?? "",
      surname: opts.fixtureName.split(" ").slice(1).join(" ") || "",
    },
    device: {
      ipAddress: order.endUserIp,
      uhi: "mock-device-uhi",
    },
    bankIdIssueDate: new Date().toISOString().slice(0, 10),
    stepUp: false,
    signature: "MOCK_SIGNATURE_BASE64",
    ocspResponse: "MOCK_OCSP_RESPONSE_BASE64",
  };
  return {
    orderRef: order.orderRef,
    status: "complete",
    completionData,
  };
}

/**
 * Resolves the scenario for a new order from the request payload, request
 * headers, and falls back to the server default.
 *
 * Scenarios can be selected per-request via header `x-mock-scenario` so that
 * the same mock instance can serve multiple test cases concurrently.
 */
export function pickScenario(
  defaultScenario: Scenario,
  headerScenario: string | undefined,
): Scenario {
  const valid: Scenario[] = [
    "success",
    "userCancel",
    "expiredTransaction",
    "certificateErr",
    "startFailed",
  ];
  if (headerScenario && (valid as string[]).includes(headerScenario)) {
    return headerScenario as Scenario;
  }
  return defaultScenario;
}
