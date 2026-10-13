import { PanelLeftIcon } from "lucide-react";
import Image from "next/image";

// Icona del brand che sfuma nell'icona del pannello quando il trigger è in
// hover, a fuoco o premuto (quest'ultimo dà riscontro sui dispositivi touch,
// dove l'hover non esiste). Il pulsante padre deve essere `group/trigger`.
export function SidebarLogoIcon() {
  const swap =
    "transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none";

  return (
    <span className="relative grid size-5 place-items-center">
      <Image
        src="/favicon.png"
        alt=""
        width={20}
        height={20}
        className={`${swap} size-5 rounded-sm group-hover/trigger:scale-75 group-hover/trigger:-rotate-12 group-hover/trigger:opacity-0 group-focus-visible/trigger:scale-75 group-focus-visible/trigger:-rotate-12 group-focus-visible/trigger:opacity-0 group-active/trigger:scale-75 group-active/trigger:-rotate-12 group-active/trigger:opacity-0`}
      />
      <PanelLeftIcon
        aria-hidden
        className={`${swap} absolute size-4 scale-75 rotate-12 opacity-0 group-hover/trigger:scale-100 group-hover/trigger:rotate-0 group-hover/trigger:opacity-100 group-focus-visible/trigger:scale-100 group-focus-visible/trigger:rotate-0 group-focus-visible/trigger:opacity-100 group-active/trigger:scale-100 group-active/trigger:rotate-0 group-active/trigger:opacity-100`}
      />
    </span>
  );
}
