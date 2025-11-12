import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun, ArrowLeft, Home } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  showHomeButton?: boolean;
  onHomeClick?: () => void;
  rightContent?: React.ReactNode;
  showThemeToggle?: boolean;
  showLanguageSelector?: boolean;
}

export const Header = ({
  title,
  subtitle,
  showBackButton = false,
  onBackClick,
  showHomeButton = false,
  onHomeClick,
  rightContent,
  showThemeToggle = true,
  showLanguageSelector = true,
}: HeaderProps) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-3 py-3 md:px-4 md:py-4">
        <div className="flex items-center justify-between gap-2">
          {/* Left Section */}
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            {showBackButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBackClick}
                className="rounded-full h-9 w-9 md:h-10 md:w-10 flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            )}
            {showHomeButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onHomeClick}
                className="rounded-full h-9 w-9 md:h-10 md:w-10 flex-shrink-0"
                title="Home"
              >
                <Home className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            )}
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-foreground truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs md:text-sm text-muted-foreground truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            {rightContent}
            {showLanguageSelector && <LanguageSelector />}
            {showThemeToggle && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full h-9 w-9 md:h-10 md:w-10"
                title={isDark ? "Light mode" : "Dark mode"}
              >
                {isDark ? (
                  <Sun className="h-4 w-4 md:h-5 md:w-5" />
                ) : (
                  <Moon className="h-4 w-4 md:h-5 md:w-5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
