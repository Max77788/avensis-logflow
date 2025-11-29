import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun, Home, Settings, LogOut } from "lucide-react";

interface HeaderProps {
  showSettingsButton?: boolean;
  onSettingsClick?: () => void;
  showHomeButton?: boolean;
  onHomeClick?: () => void;
  showLogoutButton?: boolean;
  onLogoutClick?: () => void;
}

export const Header = ({
  showSettingsButton = false,
  onSettingsClick,
  showHomeButton = false,
  onHomeClick,
  showLogoutButton = false,
  onLogoutClick,
}: HeaderProps) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-3 py-3 md:px-4 md:py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left Section - Avensis Logo */}
          <div className="flex-shrink-0">
            <img
              src="/avensis-logo.jpg"
              alt="Avensis Energy Services"
              className="h-8 md:h-10 w-auto object-contain"
            />
          </div>

          {/* Right Section - Settings, Home, Logout, Theme Toggle */}
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            {showSettingsButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onSettingsClick}
                className="rounded-full h-9 w-9 md:h-10 md:w-10"
                title="Settings"
              >
                <Settings className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            )}
            {showHomeButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onHomeClick}
                className="rounded-full h-9 w-9 md:h-10 md:w-10"
                title="Home"
              >
                <Home className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            )}
            {showLogoutButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onLogoutClick}
                className="rounded-full h-9 w-9 md:h-10 md:w-10"
                title="Logout"
              >
                <LogOut className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            )}
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
          </div>
        </div>
      </div>
    </header>
  );
};
