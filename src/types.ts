export type Scenario =
  | "success"
  | "userCancel"
  | "expiredTransaction"
  | "certificateErr"
  | "startFailed";

export type OrderStatus = "pending" | "failed" | "complete";

export type PendingHintCode = "outstandingTransaction" | "noClient" | "started" | "userSign";

export type FailedHintCode =
  | "expiredTransaction"
  | "certificateErr"
  | "userCancel"
  | "cancelled"
  | "startFailed";

export interface AuthRequest {
  endUserIp: string;
  returnUrl?: string;
  returnRisk?: boolean;
  userVisibleData?: string;
  userVisibleDataFormat?: "simpleMarkdownV1" | "plaintext";
  userNonVisibleData?: string;
  requirement?: {
    cardReader?: "class1" | "class2";
    certificatePolicies?: string[];
    pinCode?: boolean;
    mrtd?: boolean;
    personalNumber?: string;
  };
  app?: Record<string, unknown>;
  web?: Record<string, unknown>;
}

export interface SignRequest extends AuthRequest {
  userVisibleData: string;
}

export interface AuthResponse {
  orderRef: string;
  autoStartToken: string;
  qrStartToken: string;
  qrStartSecret: string;
}

export interface CollectRequest {
  orderRef: string;
}

export interface CompletionData {
  user: {
    personalNumber: string;
    name: string;
    givenName: string;
    surname: string;
  };
  device: {
    ipAddress: string;
    uhi?: string;
  };
  bankIdIssueDate: string;
  stepUp: boolean;
  signature: string;
  ocspResponse: string;
}

export interface CollectResponse {
  orderRef: string;
  status: OrderStatus;
  hintCode?: PendingHintCode | FailedHintCode;
  completionData?: CompletionData;
}

export interface ErrorResponse {
  errorCode: string;
  details: string;
}

export interface MockOrder {
  orderRef: string;
  autoStartToken: string;
  qrStartToken: string;
  qrStartSecret: string;
  scenario: Scenario;
  createdAt: number;
  pollCount: number;
  endUserIp: string;
  cancelled: boolean;
  requestedPersonalNumber?: string;
}

export interface MockServerOptions {
  /** Default scenario applied when a request does not request one. */
  defaultScenario?: Scenario;
  /** Number of /collect calls before the order resolves to its terminal state. */
  pollsUntilResolved?: number;
  /** Override personalNumber returned in completionData (defaults to a fixture). */
  fixturePersonalNumber?: string;
  /** Override name returned in completionData. */
  fixtureName?: string;
  /** Maximum JSON request body size accepted by the server. Default: "100kb". */
  jsonBodyLimit?: string;
  /**
   * If set, orders older than this many milliseconds are evicted when a new
   * order is created. Useful for long-running mock processes in CI to avoid
   * unbounded memory growth. Default: undefined (no eviction).
   */
  orderTtlMs?: number;
}
