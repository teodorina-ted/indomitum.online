import { useEffect, useMemo, useRef } from "react";
import JsBarcode from "jsbarcode";

type PassportBarcodeProps = {
  value: string;
  onRendered?: (svg: SVGSVGElement) => void;
  className?: string;
};

export function PassportBarcode({ value, onRendered, className }: PassportBarcodeProps) {
  const ref = useRef<SVGSVGElement>(null);

  const colors = useMemo(() => {
    // Keep barcode readable in both themes by using card tokens.
    return {
      bg: "hsl(var(--card))",
      fg: "hsl(var(--card-foreground))",
    };
  }, []);

  useEffect(() => {
    if (!ref.current || !value) return;

    // Ensure a clean slate
    ref.current.innerHTML = "";

    const width = value.length > 24 ? 1.1 : value.length > 16 ? 1.4 : 1.8;
    const height = value.length > 24 ? 44 : 52;

    JsBarcode(ref.current, value, {
      format: "CODE128",
      width,
      height,
      displayValue: true,
      fontSize: 10,
      margin: 8,
      background: colors.bg,
      lineColor: colors.fg,
      textMargin: 4,
    });

    onRendered?.(ref.current);
  }, [value, colors.bg, colors.fg, onRendered]);

  return <svg ref={ref} className={className} />;
}
