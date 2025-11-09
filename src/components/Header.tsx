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
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center gap-3">
            {showBackButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBackClick}
                className="rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            {showHomeButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onHomeClick}
                className="rounded-full"
                title="Home"
              >
                <Home className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h1 className="text-xl font-bold text-foreground">{title}</h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {rightContent}
            {showLanguageSelector && <LanguageSelector />}
            {showThemeToggle && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full"
                title={isDark ? "Light mode" : "Dark mode"}
              >
                {isDark ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

