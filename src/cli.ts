#!/usr/bin/env node
import { createMockServer } from "./server";
import {
  parseCliArgs,
  parsePort,
  parsePositiveInt,
  parseScenario,
  renderHelp,
} from "./cli_help";

const flags = parseCliArgs(process.argv.slice(2));

if (flags.wantsHelp) {
  process.stdout.write(renderHelp());
  process.exit(0);
}

if (flags.wantsVersion) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pkg = require("../package.json") as { version: string };
  process.stdout.write(`${pkg.version}\n`);
  process.exit(0);
}

let PORT: number;
let POLLS_UNTIL_RESOLVED: number;
let ORDER_TTL_MS: number | undefined;
let DEFAULT_SCENARIO: ReturnType<typeof parseScenario>;

try {
  PORT = parsePort(process.env.PORT ?? process.env.BANKID_MOCK_PORT, 8585, "PORT");
  POLLS_UNTIL_RESOLVED = parsePositiveInt(process.env.BANKID_MOCK_POLLS, 3, "BANKID_MOCK_POLLS");
  ORDER_TTL_MS = parsePositiveInt(
    process.env.BANKID_MOCK_ORDER_TTL_MS,
    undefined,
    "BANKID_MOCK_ORDER_TTL_MS",
  );
  DEFAULT_SCENARIO = parseScenario(process.env.BANKID_MOCK_SCENARIO, "success");
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

const HOST = process.env.HOST ?? process.env.BANKID_MOCK_HOST ?? "127.0.0.1";
const BODY_LIMIT = process.env.BANKID_MOCK_BODY_LIMIT ?? "100kb";

const { app } = createMockServer({
  defaultScenario: DEFAULT_SCENARIO,
  pollsUntilResolved: POLLS_UNTIL_RESOLVED,
  orderTtlMs: ORDER_TTL_MS,
  jsonBodyLimit: BODY_LIMIT,
});

const server = app.listen(PORT, HOST, () => {
  const baseUrl = `http://${HOST}:${PORT}`;
  console.log(`bankid-mock listening on ${baseUrl}`);
  console.log(`  default scenario: ${DEFAULT_SCENARIO}`);
  console.log(`  polls until resolved: ${POLLS_UNTIL_RESOLVED}`);
  console.log(`  body limit: ${BODY_LIMIT}`);
  if (ORDER_TTL_MS !== undefined) {
    console.log(`  order TTL: ${ORDER_TTL_MS}ms`);
  }
  console.log("");
  console.log("Endpoints:");
  console.log(`  POST ${baseUrl}/rp/v6.0/auth`);
  console.log(`  POST ${baseUrl}/rp/v6.0/sign`);
  console.log(`  POST ${baseUrl}/rp/v6.0/collect`);
  console.log(`  POST ${baseUrl}/rp/v6.0/cancel`);
  console.log("");
  console.log("Override per-request scenario with header: x-mock-scenario: userCancel");
  console.log("Run `bankid-mock --help` for full usage.");
});

const shutdown = () => {
  server.close(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
