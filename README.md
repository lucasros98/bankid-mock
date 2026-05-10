# @lucasros/bankid-mock

A drop-in mock server for the Swedish **BankID v6 API**. Runs locally with no
certificates, supports configurable scenarios, animated QR, and is suitable
for CI and local development.

Tested against [anyfin/bankid](https://github.com/anyfin/bankid) (the dominant
Node BankID client) — the integration tests in this repo run a real
`BankIdClientV6` against the mock and assert a full auth → collect →
complete flow.

## Why

Testing BankID integrations end-to-end is genuinely painful:

- The BankID app cannot run in iOS/Android emulators — it requires a physical
  device.
- A test BankID and a production BankID cannot coexist on the same phone.
  Teams keep "burner phones in a drawer" for this.
- The official test environment requires a `.p12` cert with mTLS, which is
  awkward for CI and local dev.
- Existing community mocks are abandoned (`rojanDinc/bankidmock`, andreif's
  gist) or framework-specific.

This package is a small, maintained alternative: a plain HTTP server that
accepts the v6 endpoints, runs an order state machine, and returns
realistic responses.

## Install

```bash
npm install --save-dev @lucasros/bankid-mock
```

## Quickstart — CLI

```bash
npx bankid-mock
```

Starts a server on `http://127.0.0.1:8585` with the four BankID v6 endpoints:

```
POST /rp/v6.0/auth
POST /rp/v6.0/sign
POST /rp/v6.0/collect
POST /rp/v6.0/cancel
```

### Environment variables

| Var | Default | Description |
|---|---|---|
| `PORT` / `BANKID_MOCK_PORT` | `8585` | Listen port |
| `HOST` / `BANKID_MOCK_HOST` | `127.0.0.1` | Listen host |
| `BANKID_MOCK_SCENARIO` | `success` | Default scenario for new orders |
| `BANKID_MOCK_POLLS` | `3` | Number of `/collect` calls before resolving |

## Quickstart — programmatic

```ts
import { createMockServer } from "@lucasros/bankid-mock";

const { app } = createMockServer({
  defaultScenario: "success",
  pollsUntilResolved: 2,
});

app.listen(8585);
```

## Use with anyfin/bankid

Point the dominant Node client at the mock by overriding `axios.defaults.baseURL`:

```ts
import { BankIdClientV6 } from "bankid";

const client = new BankIdClientV6({ production: false, qrEnabled: false });
client.axios.defaults.baseURL = "http://127.0.0.1:8585/rp/v6.0/";
client.axios.defaults.httpsAgent = undefined; // plain HTTP

const auth = await client.authenticate({ endUserIp: "1.2.3.4" });
// poll client.collect(...) until status === "complete"
```

See [`tests/integration.test.ts`](tests/integration.test.ts) for the full flow.

## Scenarios

Five scenarios are supported. The default is `success`. Override globally
via `BANKID_MOCK_SCENARIO` or per-request via the `x-mock-scenario` HTTP
header.

| Scenario | Final state | hintCode |
|---|---|---|
| `success` | `complete` | — (returns `completionData`) |
| `userCancel` | `failed` | `userCancel` |
| `expiredTransaction` | `failed` | `expiredTransaction` |
| `certificateErr` | `failed` | `certificateErr` |
| `startFailed` | `failed` | `startFailed` |

### Per-request scenario via header

```bash
curl -X POST http://127.0.0.1:8585/rp/v6.0/auth \
  -H "Content-Type: application/json" \
  -H "x-mock-scenario: userCancel" \
  -d '{"endUserIp":"1.2.3.4"}'
```

This lets a single mock instance serve many test cases concurrently.

## Order state machine

Each `/collect` increments a counter on the order. The first
`pollsUntilResolved - 1` polls return `pending` with progressing hint codes
(`outstandingTransaction` → `noClient` → `started` → `userSign`). The
`pollsUntilResolved`-th poll returns the terminal state for the scenario.

`POST /rp/v6.0/cancel` flips the order to `failed: cancelled` immediately,
regardless of scenario.

## Animated QR

The mock returns real `qrStartToken` and `qrStartSecret` values per the v6
spec. The `generateAnimatedQr` helper is exported so tests can compute the
expected QR string for a given second:

```ts
import { generateAnimatedQr } from "@lucasros/bankid-mock";

const qr = generateAnimatedQr(qrStartToken, qrStartSecret, 0);
// "bankid.<token>.0.<HMAC-SHA256(secret, "0")>"
```

Algorithm: `HMAC-SHA256(qrStartSecret, secondsSinceStart)` per
[BankID's QR code documentation](https://developers.bankid.com/getting-started/qr-code).

## CI example

```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx bankid-mock &
      - run: sleep 1 && npm test
        env:
          BANKID_BASE_URL: http://127.0.0.1:8585/rp/v6.0/
```

## What the mock does **not** do

- No real cryptography on the response side — `signature` and `ocspResponse`
  are static placeholder strings. If you verify these in production code,
  stub that step out in test mode.
- No real certificate validation — the mock does not enforce mTLS. Your
  client should bypass `httpsAgent` when pointing at the mock.
- No persistence — orders live in memory and are wiped when the process
  exits.

## License

MIT — see [LICENSE](LICENSE).
