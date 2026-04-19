import ResponsiveSidebarLayout from "@/components/layout/ResponsiveSidebarLayout";
import {
  Coins,
  FileText,
  Flame,
  LayoutDashboard,
  ListOrdered,
  MessageCircle,
  User,
  Users,
  Utensils,
} from "lucide-react";

export default function TrainerLayout() {
  return (
    <ResponsiveSidebarLayout
      brand="Flamestreet Trainer"
      brandTo="/trainer/dashboard"
      basePath="/trainer"
      navItems={[
        { to: "/trainer/dashboard", label: "Dashboard", Icon: LayoutDashboard },
        {
          to: "/trainer/menu",
          label: "Meals",
          Icon: Utensils,
          matchPaths: ["/trainer/menu", "/trainer/product"],
        },
        {
          to: "/trainer/orders",
          label: "Orders",
          Icon: ListOrdered,
          matchPaths: ["/trainer/orders", "/orders"],
        },
        {
          to: "/trainer/flamehub",
          label: "Flamehub",
          Icon: Flame,
          matchPaths: ["/trainer/flamehub"],
        },
        { to: "/trainer/profile", label: "Profile", Icon: User },
        { to: "/trainer/chats", label: "Chats", Icon: MessageCircle },
        { to: "/trainer/referrals", label: "Referrals", Icon: Users },
        { to: "/trainer/points", label: "Points", Icon: Coins },
      ]}
    />
  );
}
