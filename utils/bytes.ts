export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = Array.from(bytes.subarray(i, i + chunk));
    binary += String.fromCharCode.apply(
      null,
      slice as unknown as number[]
    );
  }
  return typeof btoa === "function" ? btoa(binary) : "";
}
