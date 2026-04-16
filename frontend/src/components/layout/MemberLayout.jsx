import ResponsiveSidebarLayout from "@/components/layout/ResponsiveSidebarLayout";
import {
  FileText,
  Flame,
  House,
  ListOrdered,
  User,
  Utensils,
} from "lucide-react";

export default function MemberLayout() {
  return (
    <ResponsiveSidebarLayout
      brand="Flamestreet"
      brandTo="/member"
      basePath="/member"
      navItems={[
        { to: "/member", label: "Home", Icon: House },
        {
          to: "/member/menu",
          label: "Meals",
          Icon: Utensils,
          matchPaths: ["/member/menu", "/member/product"],
        },
        {
          to: "/member/orders",
          label: "Orders",
          Icon: ListOrdered,
          matchPaths: ["/member/orders", "/orders"],
        },
        {
          to: "/member/feed",
          label: "Feed",
          Icon: FileText,
          matchPaths: ["/member/feed", "/member/articles"],
        },
        {
          to: "/member/flamehub",
          label: "Flamehub",
          Icon: Flame,
          matchPaths: ["/member/flamehub"],
        },
        {
          to: "/member/profile",
          label: "Profile",
          Icon: User,
          matchPaths: ["/member/profile"],
        },
      ]}
    />
  );
}
