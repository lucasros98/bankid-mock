import { randomUUID, randomBytes } from "node:crypto";
import type { MockOrder, Scenario } from "./types";

export class OrderStore {
  private orders = new Map<string, MockOrder>();

  create(opts: {
    scenario: Scenario;
    endUserIp: string;
    requestedPersonalNumber?: string;
  }): MockOrder {
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
}
