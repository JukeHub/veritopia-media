
import React from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Database } from '@/lib/database.types';
import { 
  User, 
  Home,
  Settings,
  MenuIcon,
  Newspaper,
  Database as DatabaseIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarProvider,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";

const menuItems = [
  { icon: Home, label: "Overview", href: "/dashboard" },
  { icon: Newspaper, label: "News Feed", href: "/dashboard/news-feed" },
  { icon: DatabaseIcon, label: "Sources", href: "/dashboard/sources" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

const Dashboard = () => {
  const session = useSession();
  const supabase = useSupabaseClient<Database>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account.",
      });
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!session) {
    navigate('/');
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50 dark:bg-gray-900">
        <Sidebar>
          <SidebarHeader className="border-b border-border p-4">
            <h2 className="text-lg font-semibold">VeriLens</h2>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        asChild
                        className={location.pathname === item.href ? "bg-accent text-accent-foreground" : ""}
                      >
                        <Link to={item.href} className="flex items-center gap-2 w-full">
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1">
          <nav className="bg-white dark:bg-gray-800 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <SidebarTrigger>
                    <Button variant="ghost" size="icon">
                      <MenuIcon className="h-5 w-5" />
                    </Button>
                  </SidebarTrigger>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white ml-4">
                    {menuItems.find(item => item.href === location.pathname)?.label || 'Dashboard'}
                  </h1>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-6 w-6 text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {session.user.email}
                    </span>
                  </div>
                  <Button variant="outline" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </nav>

          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
