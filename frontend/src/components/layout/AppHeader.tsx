import { SidebarTrigger } from "../ui/sidebar";
import ThemeSwitcher from "./ThemeSwitcher";

function AppHeader() {
  return (
    <header className="absolute top-0 z-900 w-full bg-background backdrop-blur">
      <div className="w-full px-6 py-4 flex justify-between md:justify-end">
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
