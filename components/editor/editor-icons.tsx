// Small line icons for the description toolbar, sized to match the text.

type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className ?? "size-[18px]"}
    >
      {children}
    </svg>
  );
}

export const ChevronDownIcon = ({ className }: IconProps) => (
  <Svg className={className ?? "size-3.5"}>
    <path d="m5 8 5 5 5-5" />
  </Svg>
);

export const LinkIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M8.5 11.5a3 3 0 0 0 4.2 0l2.6-2.6a3 3 0 0 0-4.2-4.2l-.9.9" />
    <path d="M11.5 8.5a3 3 0 0 0-4.2 0l-2.6 2.6a3 3 0 0 0 4.2 4.2l.9-.9" />
  </Svg>
);

export const ImageIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="3" y="3.5" width="14" height="13" rx="2" />
    <circle cx="7.5" cy="8" r="1.3" />
    <path d="m3.5 14 4-4 3 3 2-2 4 4" />
  </Svg>
);

export const VideoIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="10" cy="10" r="7" />
    <path d="m8.5 7.3 4 2.7-4 2.7z" />
  </Svg>
);

export const TableIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="3" y="3.5" width="14" height="13" rx="1.5" />
    <path d="M3 8h14M3 12.3h14M8 8v8.5M12.5 8v8.5" />
  </Svg>
);

export const MoreIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="4.5" cy="10" r=".6" fill="currentColor" />
    <circle cx="10" cy="10" r=".6" fill="currentColor" />
    <circle cx="15.5" cy="10" r=".6" fill="currentColor" />
  </Svg>
);

export const CodeIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="m7 6-4 4 4 4M13 6l4 4-4 4M11 4.5 9 15.5" />
  </Svg>
);

const ALIGN_LINES: Record<string, string> = {
  left: "M3.5 5h13M3.5 8.3h8M3.5 11.7h13M3.5 15h8",
  center: "M3.5 5h13M6 8.3h8M3.5 11.7h13M6 15h8",
  right: "M3.5 5h13M8.5 8.3h8M3.5 11.7h13M8.5 15h8",
  justify: "M3.5 5h13M3.5 8.3h13M3.5 11.7h13M3.5 15h13",
};

export const AlignIcon = ({ align, className }: IconProps & { align: string }) => (
  <Svg className={className}>
    <path d={ALIGN_LINES[align] ?? ALIGN_LINES.left} />
  </Svg>
);
