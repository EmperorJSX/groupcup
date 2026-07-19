import type { ReactNode } from "react";

// ponytail: simplified national flags as inline SVG so the mock ships zero
// external assets and renders on every OS (emoji flags break on Windows).
export type FlagCode =
  | "QAT"
  | "SEN"
  | "ENG"
  | "IRN"
  | "ARG"
  | "MEX"
  | "FRA"
  | "AUS"
  | "BRA";

function starPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.42 : r;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(
      `${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`,
    );
  }
  return pts.join(" ");
}

function Star({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  return <polygon points={starPoints(cx, cy, r)} fill={fill} />;
}

// Serrated edge for Qatar: maroon block whose left edge zigzags.
const QAT_TEETH = Array.from({ length: 19 }, (_, i) => {
  const x = i % 2 ? 8 : 11;
  return `${x},${((i * 20) / 18).toFixed(2)}`;
}).join(" ");

function vertical(a: string, b: string, c: string): ReactNode {
  return (
    <>
      <rect width="10" height="20" fill={a} />
      <rect x="10" width="10" height="20" fill={b} />
      <rect x="20" width="10" height="20" fill={c} />
    </>
  );
}

function horizontal(a: string, b: string, c: string): ReactNode {
  return (
    <>
      <rect width="30" height="6.67" fill={a} />
      <rect y="6.67" width="30" height="6.67" fill={b} />
      <rect y="13.33" width="30" height="6.67" fill={c} />
    </>
  );
}

const FLAGS: Record<FlagCode, ReactNode> = {
  QAT: (
    <>
      <rect width="30" height="20" fill="#ffffff" />
      <polygon points={`30,0 30,20 ${QAT_TEETH}`} fill="#8A1538" />
    </>
  ),
  SEN: (
    <>
      {vertical("#00853F", "#FDEF42", "#E31B23")}
      <Star cx={15} cy={10} r={3.4} fill="#00853F" />
    </>
  ),
  ENG: (
    <>
      <rect width="30" height="20" fill="#ffffff" />
      <rect x="12.4" width="5.2" height="20" fill="#CE1124" />
      <rect y="7.4" width="30" height="5.2" fill="#CE1124" />
    </>
  ),
  IRN: (
    <>
      {horizontal("#239F40", "#ffffff", "#DA0000")}
      <circle cx="15" cy="10" r="1.7" fill="#DA0000" />
    </>
  ),
  ARG: (
    <>
      {horizontal("#74ACDF", "#ffffff", "#74ACDF")}
      <circle cx="15" cy="10" r="2.2" fill="#F6B40E" />
    </>
  ),
  MEX: (
    <>
      {vertical("#006847", "#ffffff", "#CE1126")}
      <circle cx="15" cy="10" r="1.8" fill="#7C6B45" />
    </>
  ),
  FRA: vertical("#0055A4", "#ffffff", "#EF4135"),
  BRA: (
    <>
      <rect width="30" height="20" fill="#009C3B" />
      <polygon points="15,2.5 27,10 15,17.5 3,10" fill="#FFDF00" />
      <circle cx="15" cy="10" r="3.4" fill="#002776" />
    </>
  ),
  AUS: (
    <>
      <rect width="30" height="20" fill="#00247D" />
      <line x1="0" y1="0" x2="13" y2="9" stroke="#ffffff" strokeWidth="2" />
      <line x1="13" y1="0" x2="0" y2="9" stroke="#ffffff" strokeWidth="2" />
      <rect x="5.2" width="2.6" height="9" fill="#ffffff" />
      <rect y="3.2" width="13" height="2.6" fill="#ffffff" />
      <rect x="5.9" width="1.2" height="9" fill="#CF142B" />
      <rect y="3.9" width="13" height="1.2" fill="#CF142B" />
      <Star cx={6.5} cy={15} r={2} fill="#ffffff" />
      <Star cx={21} cy={3.5} r={1.3} fill="#ffffff" />
      <Star cx={26.5} cy={7.5} r={1.3} fill="#ffffff" />
      <Star cx={19} cy={9.5} r={1.3} fill="#ffffff" />
      <Star cx={23} cy={13} r={1.3} fill="#ffffff" />
      <Star cx={26} cy={17} r={1} fill="#ffffff" />
    </>
  ),
};

export default function Flag({
  code,
  className = "h-7 w-10",
}: {
  code: FlagCode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 30 20"
      role="img"
      aria-label={`${code} flag`}
      className={`overflow-hidden rounded-md border border-border ${className}`}
    >
      {FLAGS[code]}
    </svg>
  );
}
