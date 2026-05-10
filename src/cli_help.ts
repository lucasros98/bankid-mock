export interface CliFlags {
  wantsHelp: boolean;
  wantsVersion: boolean;
}

export function parseCliArgs(args: string[]): CliFlags {
  return {
    wantsHelp: args.includes("--help") || args.includes("-h"),
    wantsVersion: args.includes("--version") || args.includes("-v"),
  };
}

export function renderHelp(): string {
  return `bankid-mock — drop-in mock server for the Swedish BankID v6 API

Usage:
  bankid-mock              Start the mock server
  bankid-mock --help       Show this help text
  bankid-mock --version    Print the package version

Environment variables:
  PORT, BANKID_MOCK_PORT          Listen port (default: 8585)
  HOST, BANKID_MOCK_HOST          Listen host (default: 127.0.0.1)
  BANKID_MOCK_SCENARIO            Default scenario for new orders
                                  (success | userCancel | expiredTransaction
                                   | certificateErr | startFailed)
                                  Default: success
  BANKID_MOCK_POLLS               Number of /collect calls before resolution
                                  Default: 3
  BANKID_MOCK_ORDER_TTL_MS        Evict orders older than this many ms
                                  Default: unset (no eviction)
  BANKID_MOCK_BODY_LIMIT          Maximum JSON request body size
                                  Default: 100kb

Per-request scenario override:
  Set the HTTP header  x-mock-scenario: <scenario>  on /auth or /sign.

Endpoints:
  POST /rp/v6.0/auth
  POST /rp/v6.0/sign
  POST /rp/v6.0/collect
  POST /rp/v6.0/cancel

More info: https://github.com/lucasros98/bankid-mock
`;
}
