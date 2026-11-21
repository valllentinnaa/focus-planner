// QR code drawn with react-native-svg (works on web and phone). Encoding by qrcode-generator.
import { palettes } from "@/theme/palettes";
import makeQr from "qrcode-generator";
import { useMemo } from "react";
import Svg, { Path, Rect } from "react-native-svg";
import { colors } from "@/theme/tokens";

export function QrCode({ value, size = 200 }: { value: string; size?: number }) {
  const { path, count } = useMemo(() => {
    const qr = makeQr(0, "M");
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return { path: d, count: n };
  }, [value]);
  const quiet = 4;
  const total = count + quiet * 2;
  return (
    <Svg width={size} height={size} viewBox={`${-quiet} ${-quiet} ${total} ${total}`} accessibilityLabel="QR code">
      <Rect x={-quiet} y={-quiet} width={total} height={total} fill={colors.white} />
      {/* Always dark on white, in either theme, so it scans. */}
      <Path d={path} fill={palettes.light.ink} />
    </Svg>
  );
}
