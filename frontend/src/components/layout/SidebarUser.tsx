"use client";

import { useAuth } from "@/context/AuthContext";
import { act_Logout } from "@/lib/actions/auth";
import { LogOutIcon } from "lucide-react";
import { useTransition } from "react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { SidebarMenu, SidebarMenuItem } from "../ui/sidebar";

export function SidebarUser() {
  const session = useAuth();
  const userId = session ? session.user_id : "";
  const [isPending, startTransition] = useTransition();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="h-auto w-full justify-start gap-2 rounded-full p-1 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
              >
                <Avatar>
                  <AvatarFallback className="uppercase">
                    {userId.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="sidebar-collapsible-item truncate">
                  {userId}
                </span>
              </Button>
            }
          ></DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              variant="destructive"
              disabled={isPending}
              onClick={() => startTransition(() => act_Logout())}
            >
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
