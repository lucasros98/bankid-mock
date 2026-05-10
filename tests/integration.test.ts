import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { BankIdClientV6 } from "bankid";
import path from "node:path";
import fs from "node:fs";
import { createMockServer } from "../src";

/**
 * Integration tests proving drop-in compatibility with the dominant
 * Swedish BankID Node client (anyfin/bankid). We boot a real HTTP server,
 * point the BankIdClientV6 at it via baseURL override, and walk through
 * a full auth → collect → complete flow.
 *
 * The anyfin client requires pfx/passphrase even in test mode. We use the
 * test certificate that ships with the anyfin/bankid package itself.
 */
describe("integration with anyfin/bankid", () => {
  let server: Server;
  let baseURL: string;

  beforeAll(async () => {
    const { app } = createMockServer({ pollsUntilResolved: 2 });
    await new Promise<void>(resolve => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (address && typeof address !== "string") {
      baseURL = `http://127.0.0.1:${address.port}/rp/v6.0/`;
    }
  });

  afterEach(() => {
    // no-op; each test creates its own client and order
  });

  function createPatchedClient() {
    // Locate the anyfin test cert that the package ships with.
    const testCertPath = path.resolve(
      __dirname,
      "../node_modules/bankid/cert/FPTestcert5_20240610.p12",
    );
    const testCaPath = path.resolve(__dirname, "../node_modules/bankid/cert/test.ca");
    const pfx = fs.readFileSync(testCertPath);
    const ca = fs.readFileSync(testCaPath); // Buffer; anyfin treats string as path

    const client = new BankIdClientV6({
      production: false,
      pfx,
      passphrase: "qwerty123",
      ca,
      qrEnabled: false,
    });

    // Point axios at our mock server (plain HTTP, no TLS).
    client.axios.defaults.baseURL = baseURL;
    // Strip the httpsAgent so axios uses plain HTTP.
    client.axios.defaults.httpsAgent = undefined;

    return client;
  }

  it("completes a successful auth flow against the mock", async () => {
    const client = createPatchedClient();

    const auth = await client.authenticate({ endUserIp: "1.2.3.4" });
    expect(auth.orderRef).toBeDefined();
    expect(auth.qrStartToken).toBeDefined();
    expect(auth.qrStartSecret).toBeDefined();

    // First poll: pending
    const c1 = await client.collect({ orderRef: auth.orderRef });
    expect(c1.status).toBe("pending");

    // Second poll: complete
    const c2 = await client.collect({ orderRef: auth.orderRef });
    expect(c2.status).toBe("complete");
    expect(c2.completionData?.user.personalNumber).toBe("199001011234");
  });

  it("returns BankIdError for unknown orderRef", async () => {
    const client = createPatchedClient();

    await expect(client.collect({ orderRef: "does-not-exist" })).rejects.toMatchObject({
      name: "BankIdError",
      code: "notFound",
    });
  });

  it("supports cancel followed by collect", async () => {
    const client = createPatchedClient();

    const auth = await client.authenticate({ endUserIp: "5.6.7.8" });
    await client.cancel({ orderRef: auth.orderRef });

    const collect = await client.collect({ orderRef: auth.orderRef });
    expect(collect.status).toBe("failed");
    expect(collect.hintCode).toBe("cancelled");
  });
});
