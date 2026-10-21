// Our own small icons. One path each, drawn to match the blueprint.
const paths: Record<string, string> = {
  basket: "M4 10h16l-2 9H6zM8 10l3-5M16 10l-3-5",
  leaf: "M5 19C5 9 11 5 19 5c0 8-4 14-14 14zM5 19l8-8",
  apple: "M12 8c-4-2-7 1-6 6s3 7 6 6c3 1 5-1 6-6s-2-8-6-6zM12 8c0-2 1-3 3-4",
  diya: "M3 13h18c0 4-4 7-9 7s-9-3-9-7zM12 4c2 2 2 4 0 6-2-2-2-4 0-6z",
  book: "M5 3h12a2 2 0 012 2v16H7a2 2 0 01-2-2zM9 7h6",
  candy: "M7 12L3 9v6zM17 12l4-3v6zM12 7a5 5 0 100 10 5 5 0 000-10z",
  colours: "M3 19l6-10 6 10zM11 19l5-7 5 7z",
  bottle: "M9 3h6v3H9zM8 6h8v15H8zM8 12h8",
  printer: "M6 9V3h12v6M6 17H4v-6h16v6h-2M7 14h10v7H7z",
  home: "M3 11l9-8 9 8v9H3z",
  search: "M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4",
  list: "M6 3h12v18H6zM9 8h6M9 12h6M9 16h4",
  person: "M12 4a4 4 0 100 8 4 4 0 000-8zM4 21c1-5 15-5 16 0",
  phone: "M5 4h4l2 5-2 1a11 11 0 005 5l1-2 5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z",
};

export function Icon({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.basket} />
    </svg>
  );
}
