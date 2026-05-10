import { randomUUID, randomBytes } from "node:crypto";
import type { MockOrder, Scenario } from "./types";

export interface OrderStoreOptions {
  /**
   * If set, orders older than this many milliseconds are evicted on the
   * next call to `create`. Default: undefined (no eviction).
   */
  orderTtlMs?: number;
}

export class OrderStore {
  private orders = new Map<string, MockOrder>();
  private readonly orderTtlMs?: number;

  constructor(options: OrderStoreOptions = {}) {
    this.orderTtlMs = options.orderTtlMs;
  }

  create(opts: {
    scenario: Scenario;
    endUserIp: string;
    requestedPersonalNumber?: string;
  }): MockOrder {
    this.evictExpired();
    const order: MockOrder = {
      orderRef: randomUUID(),
      autoStartToken: randomUUID(),
      qrStartToken: randomUUID(),
      qrStartSecret: randomBytes(16).toString("hex"),
      scenario: opts.scenario,
      createdAt: Date.now(),
      pollCount: 0,
      endUserIp: opts.endUserIp,
      cancelled: false,
      requestedPersonalNumber: opts.requestedPersonalNumber,
    };
    this.orders.set(order.orderRef, order);
    return order;
  }

  get(orderRef: string): MockOrder | undefined {
    return this.orders.get(orderRef);
  }

  incrementPoll(orderRef: string): MockOrder | undefined {
    const order = this.orders.get(orderRef);
    if (order) {
      order.pollCount += 1;
    }
    return order;
  }

  cancel(orderRef: string): boolean {
    const order = this.orders.get(orderRef);
    if (!order) return false;
    order.cancelled = true;
    return true;
  }

  delete(orderRef: string): boolean {
    return this.orders.delete(orderRef);
  }

  clear(): void {
    this.orders.clear();
  }

  size(): number {
    return this.orders.size;
  }

  private evictExpired(): void {
    if (this.orderTtlMs === undefined) return;
    const cutoff = Date.now() - this.orderTtlMs;
    for (const [orderRef, order] of this.orders) {
      if (order.createdAt < cutoff) {
        this.orders.delete(orderRef);
      }
    }
  }
}
