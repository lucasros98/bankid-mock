import { createHmac } from "node:crypto";

/**
 * Generates an animated QR auth code per BankID v6 spec.
 *
 * The QR string format is: `bankid.{qrStartToken}.{time}.{qrAuthCode}`
 * where qrAuthCode = HMAC-SHA256(qrStartSecret, time) and `time` is the
 * number of whole seconds elapsed since the RP received the auth response.
 *
 * @see https://developers.bankid.com/getting-started/qr-code
 */
export function generateAnimatedQr(
  qrStartToken: string,
  qrStartSecret: string,
  secondsSinceStart: number,
): string {
  const qrAuthCode = createHmac("sha256", qrStartSecret)
    .update(String(secondsSinceStart))
    .digest("hex");
  return `bankid.${qrStartToken}.${secondsSinceStart}.${qrAuthCode}`;
}
