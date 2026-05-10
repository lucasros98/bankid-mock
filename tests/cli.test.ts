import { describe, expect, it } from "vitest";
import {
  renderHelp,
  parseCliArgs,
  parsePort,
  parsePositiveInt,
  parseScenario,
} from "../src/cli_help";

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

describe("parsePort", () => {
  it("returns the fallback when value is undefined", () => {
    expect(parsePort(undefined, 8585, "PORT")).toBe(8585);
  });

  it("parses a valid integer string", () => {
    expect(parsePort("3000", 8585, "PORT")).toBe(3000);
  });

  it("accepts port 0 (OS-assigned)", () => {
    expect(parsePort("0", 8585, "PORT")).toBe(0);
  });

  it("accepts the maximum port 65535", () => {
    expect(parsePort("65535", 8585, "PORT")).toBe(65535);
  });

  it("throws on non-numeric input", () => {
    expect(() => parsePort("abc", 8585, "PORT")).toThrow(/PORT/);
  });

  it("throws on negative numbers", () => {
    expect(() => parsePort("-1", 8585, "PORT")).toThrow(/PORT/);
  });

  it("throws on numbers above 65535", () => {
    expect(() => parsePort("70000", 8585, "PORT")).toThrow(/PORT/);
  });

  it("throws on non-integer numbers", () => {
    expect(() => parsePort("3.14", 8585, "PORT")).toThrow(/PORT/);
  });
});

describe("parsePositiveInt", () => {
  it("returns fallback when value is undefined", () => {
    expect(parsePositiveInt(undefined, 3, "POLLS")).toBe(3);
  });

  it("returns undefined when value is undefined and fallback is undefined", () => {
    expect(parsePositiveInt(undefined, undefined, "TTL")).toBeUndefined();
  });

  it("parses a valid positive integer", () => {
    expect(parsePositiveInt("5", 3, "POLLS")).toBe(5);
  });

  it("rejects zero", () => {
    expect(() => parsePositiveInt("0", 3, "POLLS")).toThrow(/POLLS/);
  });

  it("rejects negative numbers", () => {
    expect(() => parsePositiveInt("-1", 3, "POLLS")).toThrow(/POLLS/);
  });

  it("rejects non-numeric input", () => {
    expect(() => parsePositiveInt("abc", 3, "POLLS")).toThrow(/POLLS/);
  });

  it("rejects non-integers", () => {
    expect(() => parsePositiveInt("1.5", 3, "POLLS")).toThrow(/POLLS/);
  });
});

describe("parseScenario", () => {
  it("returns the fallback when value is undefined", () => {
    expect(parseScenario(undefined, "success")).toBe("success");
  });

  it.each(["success", "userCancel", "expiredTransaction", "certificateErr", "startFailed"])(
    "accepts valid scenario %s",
    s => {
      expect(parseScenario(s, "success")).toBe(s);
    },
  );

  it("throws on unknown scenario", () => {
    expect(() => parseScenario("nope", "success")).toThrow(/scenario/i);
  });
});
