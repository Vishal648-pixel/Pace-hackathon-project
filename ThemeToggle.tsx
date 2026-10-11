import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export const THEME_KEY = "pace:theme";

/** Inline script content (static, no user data) that applies the saved theme before paint. */
export const THEME_BOOT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      // ignore
    }
  };
  return (
    <button type="button" onClick={toggle} aria-pressed={dark} className={className}>
      {dark ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
      <span>{dark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
