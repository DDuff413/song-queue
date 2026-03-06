import QRCode from "react-qr-code";

export function QrCode() {
  // window.location.origin gives the correct LAN IP when opened on the host's
  // machine, so guests scanning the code connect to the right address.
  const url = window.location.origin;

  return (
    <div className="flex flex-col items-center gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
        Scan to Request
      </h2>
      <div className="rounded-2xl bg-white p-4 shadow-xl">
        <QRCode value={url} size={180} />
      </div>
      <p className="text-xs text-white/30 text-center break-all max-w-[200px]">
        {url}
      </p>
    </div>
  );
}
