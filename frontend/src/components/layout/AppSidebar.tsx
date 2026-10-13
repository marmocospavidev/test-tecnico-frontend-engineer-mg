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
import { FileText } from "lucide-react";
import Link from "next/link";
import { NewChatMenuItem, RecentChats } from "./SidebarChats";
import { SidebarUser } from "./SidebarUser";
import { SidebarLogoIcon } from "./SidebarLogoIcon";

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
          <SidebarTrigger
            size="icon"
            className="group/trigger"
            icon={<SidebarLogoIcon />}
          />
        </SidebarGroup>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <NewChatMenuItem />
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/documents" />}
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
        <RecentChats />
      </SidebarContent>
      <SidebarFooter>
        <SidebarUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export default AppSidebar;
