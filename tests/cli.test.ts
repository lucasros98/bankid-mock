import { describe, expect, it } from "vitest";
import { renderHelp, parseCliArgs } from "../src/cli_help";

describe("CLI --help", () => {
  it("renders a help text that documents all environment variables", () => {
    const help = renderHelp();
    expect(help).toContain("bankid-mock");
    expect(help).toContain("BANKID_MOCK_PORT");
    expect(help).toContain("BANKID_MOCK_HOST");
    expect(help).toContain("BANKID_MOCK_SCENARIO");
    expect(help).toContain("BANKID_MOCK_POLLS");
  });

  it("identifies --help and -h as help requests", () => {
    expect(parseCliArgs(["--help"])).toEqual({ wantsHelp: true, wantsVersion: false });
    expect(parseCliArgs(["-h"])).toEqual({ wantsHelp: true, wantsVersion: false });
  });

  it("identifies --version and -v as version requests", () => {
    expect(parseCliArgs(["--version"])).toEqual({ wantsHelp: false, wantsVersion: true });
    expect(parseCliArgs(["-v"])).toEqual({ wantsHelp: false, wantsVersion: true });
  });

  it("returns neither flag for empty args", () => {
    expect(parseCliArgs([])).toEqual({ wantsHelp: false, wantsVersion: false });
  });
});
