import { useState, useRef, useEffect } from "react";
import { Globe, Check } from "lucide-react";
import { useI18n, LANGUAGES, type Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface LanguageSelectorProps {
  className?: string;
  variant?: "pill" | "header" | "compact";
}

export function LanguageSelector({
  className,
  variant = "pill",
}: LanguageSelectorProps) {
  const { lang, setLang } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select language"
        className={cn(
          "inline-flex items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-xs font-bold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#193F32] cursor-pointer",
          variant === "header"
            ? "border border-[#D8CEBD] bg-[#FFFDF8] text-[#193F32] hover:bg-[#F4EFE3]"
            : "border border-[#E7DFD1] bg-[#FAF3E6] text-[#26332D] hover:bg-[#EADBCA]/60",
        )}
      >
        <Globe aria-hidden="true" className="h-3.5 w-3.5 text-[#193F32] shrink-0" />
        <span className="font-semibold">{current.nativeName}</span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Languages"
          className="absolute right-0 z-50 mt-1.5 w-36 origin-top-right rounded-[12px] border border-[#E7DFD1] bg-[#FFFDF8] p-1 shadow-lg ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100"
        >
          {LANGUAGES.map((item) => {
            const isSelected = item.code === lang;
            return (
              <button
                key={item.code}
                role="option"
                aria-selected={isSelected}
                type="button"
                onClick={() => {
                  setLang(item.code);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-xs font-bold transition-colors cursor-pointer",
                  isSelected
                    ? "bg-[#193F32] text-[#FAF7EF]"
                    : "text-[#26332D] hover:bg-[#FAF3E6] hover:text-[#193F32]",
                )}
              >
                <span>{item.nativeName}</span>
                {isSelected && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
