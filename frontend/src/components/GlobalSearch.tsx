import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { searchAppRoutes } from "@/utils/appSearch";
import { cn } from "@/lib/utils";

interface GlobalSearchProps {
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  compact?: boolean;
  fullWidth?: boolean;
}

export function GlobalSearch({
  placeholder = "Buscar módulos, documentos, auditorías...",
  className,
  inputClassName,
  compact = false,
  fullWidth = false,
}: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => searchAppRoutes(query), [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const goTo = (path: string) => {
    navigate(path);
    setQuery("");
    setOpen(false);
  };

  const handleSubmit = () => {
    if (results[activeIndex]) {
      goTo(results[activeIndex].path);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", fullWidth && "w-full", className)}>
      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={query}
        placeholder={placeholder}
        className={cn(
          "pl-8 rounded-xl",
          fullWidth ? "h-10 w-full" : compact ? "h-9 w-40 xl:w-64" : "h-11 w-full max-w-56 sm:w-56",
          inputClassName,
        )}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((prev) => Math.min(prev + 1, Math.max(results.length - 1, 0)));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((prev) => Math.max(prev - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />

      {open && query.trim() && (
        <div className="absolute right-0 z-50 mt-2 w-full min-w-[min(100%,280px)] max-w-[min(100vw-1.5rem,24rem)] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-lg">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[#6B7280]">Sin coincidencias para “{query}”</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((item, index) => (
                <li key={item.path}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => goTo(item.path)}
                    className={cn(
                      "flex w-full flex-col px-4 py-2.5 text-left text-sm transition-colors",
                      index === activeIndex ? "bg-[#EFF6FF]" : "hover:bg-[#F8FAFC]",
                    )}
                  >
                    <span className="font-semibold text-[#1E3A8A]">{item.label}</span>
                    <span className="text-xs text-[#6B7280]">{item.group}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
