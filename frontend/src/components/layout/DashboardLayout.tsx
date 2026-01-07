import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="h-screen flex w-full bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden">
        <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
