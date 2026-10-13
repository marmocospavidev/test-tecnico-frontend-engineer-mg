import { SidebarTrigger } from "../ui/sidebar";
import ThemeSwitcher from "./ThemeSwitcher";

function AppHeader() {
  return (
    <header className="z-20 w-full shrink-0 bg-background">
      <div className="flex w-full items-center justify-between px-3 py-2 sm:px-6 sm:py-3 md:justify-end">
        <SidebarTrigger
          size="icon-lg"
          className="md:hidden"
        />
        <ThemeSwitcher />
      </div>
    </header>
  );
}

export default AppHeader;
