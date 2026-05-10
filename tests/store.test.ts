import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrderStore } from "../src/store";

describe("OrderStore TTL eviction", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("removes orders older than the configured TTL when a new order is created", () => {
    const store = new OrderStore({ orderTtlMs: 60_000 });
    const old = store.create({ scenario: "success", endUserIp: "1.2.3.4" });

    vi.advanceTimersByTime(61_000);

    store.create({ scenario: "success", endUserIp: "5.6.7.8" });

    expect(store.get(old.orderRef)).toBeUndefined();
  });

  it("retains orders younger than the TTL", () => {
    const store = new OrderStore({ orderTtlMs: 60_000 });
    const order = store.create({ scenario: "success", endUserIp: "1.2.3.4" });

    vi.advanceTimersByTime(30_000);
    store.create({ scenario: "success", endUserIp: "5.6.7.8" });

    expect(store.get(order.orderRef)).toBeDefined();
  });

  it("retains orders indefinitely when TTL is disabled (default)", () => {
    const store = new OrderStore();
    const order = store.create({ scenario: "success", endUserIp: "1.2.3.4" });

    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    store.create({ scenario: "success", endUserIp: "5.6.7.8" });

    expect(store.get(order.orderRef)).toBeDefined();
  });
});
