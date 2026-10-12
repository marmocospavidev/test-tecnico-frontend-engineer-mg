import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "../ui/sidebar";
import { Avatar, AvatarFallback } from "../ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  FileText,
  LogOutIcon,
  MessageSquare,
  SquarePen,
} from "lucide-react";
import Link from "next/link";

function AppSidebar() {
  return (
    <Sidebar
      side="left"
      variant="sidebar"
      collapsible="icon"
    >
      <SidebarHeader>
        <SidebarGroup className="flex-row items-center group-data-[collapsible=icon]:justify-center justify-between">
          <span className="sidebar-collapsible-item">
            Chat
          </span>
          <SidebarTrigger size="icon" />
        </SidebarGroup>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href={"#"} />}
                >
                  <SquarePen className="text-muted-foreground" />
                  <span className="sidebar-collapsible-item">
                    Nuova chat
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href={"#"} />}
                >
                  <FileText className="text-muted-foreground" />
                  <span className="sidebar-collapsible-item">
                    Documenti
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="sidebar-collapsible-item">
          <SidebarGroupLabel>
            Chat recenti
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href={"#"} />}
                >
                  <MessageSquare className="text-muted-foreground" />
                  <span>Chat 1</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                  >
                    <Avatar>
                      <AvatarFallback>
                        {"MG"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                }
              ></DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem variant="destructive">
                  <LogOutIcon />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export default AppSidebar;
