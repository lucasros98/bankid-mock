#!/usr/bin/env node
import { createMockServer } from "./server";
import type { Scenario } from "./types";

const PORT = Number(process.env.PORT ?? process.env.BANKID_MOCK_PORT ?? 8585);
const HOST = process.env.HOST ?? process.env.BANKID_MOCK_HOST ?? "127.0.0.1";
const DEFAULT_SCENARIO = (process.env.BANKID_MOCK_SCENARIO ?? "success") as Scenario;
const POLLS_UNTIL_RESOLVED = Number(process.env.BANKID_MOCK_POLLS ?? 3);

const { app } = createMockServer({
  defaultScenario: DEFAULT_SCENARIO,
  pollsUntilResolved: POLLS_UNTIL_RESOLVED,
});

const server = app.listen(PORT, HOST, () => {
  const baseUrl = `http://${HOST}:${PORT}`;
  console.log(`bankid-mock listening on ${baseUrl}`);
  console.log(`  default scenario: ${DEFAULT_SCENARIO}`);
  console.log(`  polls until resolved: ${POLLS_UNTIL_RESOLVED}`);
  console.log("");
  console.log("Endpoints:");
  console.log(`  POST ${baseUrl}/rp/v6.0/auth`);
  console.log(`  POST ${baseUrl}/rp/v6.0/sign`);
  console.log(`  POST ${baseUrl}/rp/v6.0/collect`);
  console.log(`  POST ${baseUrl}/rp/v6.0/cancel`);
  console.log("");
  console.log("Override per-request scenario with header: x-mock-scenario: userCancel");
});

const shutdown = () => {
  server.close(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
