"use client";

export default function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative mb-4">
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-placeholder"
      >
        <circle cx="8.5" cy="8.5" r="5.5" />
        <line x1="16.5" y1="16.5" x2="12.8" y2="12.8" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-line bg-search-bg py-3 pl-11 pr-4 text-sm text-chalk placeholder:text-placeholder focus:border-led focus:outline-none"
      />
    </div>
  );
}
