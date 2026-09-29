export interface LogoProps {
  size?: number;
}

// SVG โลโก้ ใช้แบบเดียวกับ public/icon.svg (ten-frame 2x5 จุดสีส้มบนพื้นเขียวอ่อน มุมโค้ง)
export function Logo({ size = 40 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="โลโก้บทเรียนคณิตศาสตร์"
    >
      <rect width="64" height="64" rx="14" fill="#F2F7F3" />
      {Array.from({ length: 2 }, (_, row) =>
        Array.from({ length: 5 }, (_, col) => (
          <circle
            key={`${row}-${col}`}
            cx={12 + col * 10}
            cy={row === 0 ? 20 : 44}
            r={4}
            fill="#FF7A45"
          />
        )),
      )}
    </svg>
  );
}
