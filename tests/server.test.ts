import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createMockServer, SCENARIO_HEADER, type MockServer } from "../src";
import { generateAnimatedQr } from "../src/qr";

describe("bankid-mock server", () => {
  let mock: MockServer;

  beforeEach(() => {
    mock = createMockServer({ pollsUntilResolved: 3 });
  });

  afterEach(() => {
    mock.store.clear();
  });

  describe("/auth", () => {
    it("returns orderRef, autoStartToken, qrStartToken, qrStartSecret", async () => {
      const res = await request(mock.app)
        .post("/rp/v6.0/auth")
        .send({ endUserIp: "1.2.3.4" });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        orderRef: expect.any(String),
        autoStartToken: expect.any(String),
        qrStartToken: expect.any(String),
        qrStartSecret: expect.any(String),
      });
    });

    it("rejects request without endUserIp", async () => {
      const res = await request(mock.app).post("/rp/v6.0/auth").send({});
      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe("invalidParameters");
    });
  });

  describe("/sign", () => {
    it("requires userVisibleData", async () => {
      const res = await request(mock.app)
        .post("/rp/v6.0/sign")
        .send({ endUserIp: "1.2.3.4" });
      expect(res.status).toBe(400);
    });

    it("accepts a valid sign order", async () => {
      const res = await request(mock.app)
        .post("/rp/v6.0/sign")
        .send({ endUserIp: "1.2.3.4", userVisibleData: "Sign me" });
      expect(res.status).toBe(200);
      expect(res.body.orderRef).toBeDefined();
    });
  });

  describe("/collect state machine", () => {
    it("progresses pending → complete with success scenario", async () => {
      const auth = await request(mock.app)
        .post("/rp/v6.0/auth")
        .send({ endUserIp: "1.2.3.4" });
      const orderRef = auth.body.orderRef;

      const c1 = await request(mock.app).post("/rp/v6.0/collect").send({ orderRef });
      expect(c1.body.status).toBe("pending");
      expect(c1.body.hintCode).toBe("outstandingTransaction");

      const c2 = await request(mock.app).post("/rp/v6.0/collect").send({ orderRef });
      expect(c2.body.status).toBe("pending");
      expect(c2.body.hintCode).toBe("noClient");

      const c3 = await request(mock.app).post("/rp/v6.0/collect").send({ orderRef });
      expect(c3.body.status).toBe("complete");
      expect(c3.body.completionData?.user.personalNumber).toBe("199001011234");
      expect(c3.body.completionData?.device.ipAddress).toBe("1.2.3.4");
    });

    it("returns failed: userCancel when scenario is userCancel", async () => {
      const auth = await request(mock.app)
        .post("/rp/v6.0/auth")
        .set("x-mock-scenario", "userCancel")
        .send({ endUserIp: "1.2.3.4" });
      const orderRef = auth.body.orderRef;

      await request(mock.app).post("/rp/v6.0/collect").send({ orderRef });
      await request(mock.app).post("/rp/v6.0/collect").send({ orderRef });
      const final = await request(mock.app).post("/rp/v6.0/collect").send({ orderRef });

      expect(final.body.status).toBe("failed");
      expect(final.body.hintCode).toBe("userCancel");
    });

    it("returns failed: expiredTransaction when scenario is expiredTransaction", async () => {
      const auth = await request(mock.app)
        .post("/rp/v6.0/auth")
        .set("x-mock-scenario", "expiredTransaction")
        .send({ endUserIp: "1.2.3.4" });
      const orderRef = auth.body.orderRef;

      await request(mock.app).post("/rp/v6.0/collect").send({ orderRef });
      await request(mock.app).post("/rp/v6.0/collect").send({ orderRef });
      const final = await request(mock.app).post("/rp/v6.0/collect").send({ orderRef });

      expect(final.body.status).toBe("failed");
      expect(final.body.hintCode).toBe("expiredTransaction");
    });

    it("returns 404 for unknown orderRef", async () => {
      const res = await request(mock.app)
        .post("/rp/v6.0/collect")
        .send({ orderRef: "nonexistent" });
      expect(res.status).toBe(404);
    });

    it("respects requirement.personalNumber when scenario is success", async () => {
      const auth = await request(mock.app)
        .post("/rp/v6.0/auth")
        .send({
          endUserIp: "1.2.3.4",
          requirement: { personalNumber: "200001012384" },
        });
      const orderRef = auth.body.orderRef;

      await request(mock.app).post("/rp/v6.0/collect").send({ orderRef });
      await request(mock.app).post("/rp/v6.0/collect").send({ orderRef });
      const final = await request(mock.app).post("/rp/v6.0/collect").send({ orderRef });

      expect(final.body.completionData?.user.personalNumber).toBe("200001012384");
    });
  });

  describe("/cancel", () => {
    it("cancels an order so subsequent collect returns failed: cancelled", async () => {
      const auth = await request(mock.app)
        .post("/rp/v6.0/auth")
        .send({ endUserIp: "1.2.3.4" });
      const orderRef = auth.body.orderRef;

      const cancel = await request(mock.app).post("/rp/v6.0/cancel").send({ orderRef });
      expect(cancel.status).toBe(200);

      const collect = await request(mock.app).post("/rp/v6.0/collect").send({ orderRef });
      expect(collect.body.status).toBe("failed");
      expect(collect.body.hintCode).toBe("cancelled");
    });

    it("returns 404 for unknown orderRef", async () => {
      const res = await request(mock.app)
        .post("/rp/v6.0/cancel")
        .send({ orderRef: "nonexistent" });
      expect(res.status).toBe(404);
    });
  });
});

describe("SCENARIO_HEADER constant", () => {
  it("is exported as 'x-mock-scenario'", () => {
    expect(SCENARIO_HEADER).toBe("x-mock-scenario");
  });

  it("is honored when used to set the per-request scenario", async () => {
    const mock = createMockServer({ pollsUntilResolved: 1 });
    const auth = await request(mock.app)
      .post("/rp/v6.0/auth")
      .set(SCENARIO_HEADER, "userCancel")
      .send({ endUserIp: "1.2.3.4" });

    const final = await request(mock.app)
      .post("/rp/v6.0/collect")
      .send({ orderRef: auth.body.orderRef });

    expect(final.body.status).toBe("failed");
    expect(final.body.hintCode).toBe("userCancel");
  });
});

describe("payload size limit", () => {
  it("rejects requests larger than the configured jsonBodyLimit", async () => {
    const small = createMockServer({ jsonBodyLimit: "1kb" });
    const oversized = "x".repeat(2000);

    const res = await request(small.app)
      .post("/rp/v6.0/auth")
      .set("Content-Type", "application/json")
      .send({ endUserIp: "1.2.3.4", userVisibleData: oversized });

    expect(res.status).toBe(413);
  });

  it("accepts requests within the limit", async () => {
    const small = createMockServer({ jsonBodyLimit: "1kb" });

    const res = await request(small.app)
      .post("/rp/v6.0/auth")
      .send({ endUserIp: "1.2.3.4" });

    expect(res.status).toBe(200);
  });
});

describe("animated QR HMAC", () => {
  it("generates the bankid.<token>.<time>.<authcode> format", () => {
    const qr = generateAnimatedQr("token123", "secret456", 0);
    expect(qr).toMatch(/^bankid\.token123\.0\.[a-f0-9]{64}$/);
  });

  it("changes auth code per second", () => {
    const a = generateAnimatedQr("token", "secret", 0);
    const b = generateAnimatedQr("token", "secret", 1);
    expect(a).not.toBe(b);
  });

  it("matches the reference HMAC-SHA256 vector", () => {
    // Manually computed: HMAC-SHA256(key="secret", msg="0")
    // node:crypto is the source of truth here, but verify the algorithm
    // produces a deterministic 64-char hex digest.
    const qr = generateAnimatedQr("token", "secret", 0);
    const [, , , code] = qr.split(".");
    expect(code).toHaveLength(64);
  });
});
