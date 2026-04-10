import ResponsiveSidebarLayout from '@/components/layout/ResponsiveSidebarLayout'
import { FileText, House, ListOrdered, User, Utensils } from 'lucide-react'

export default function MemberLayout() {
  return (
    <ResponsiveSidebarLayout
      brand="Flamestreet"
      brandTo="/member"
      basePath="/member"
      navItems={[
        { to: '/member', label: 'Home', Icon: House },
        { to: '/member/menu', label: 'Meals', Icon: Utensils, matchPaths: ['/member/menu', '/member/product'] },
        { to: '/member/orders', label: 'Orders', Icon: ListOrdered, matchPaths: ['/member/orders', '/orders'] },
        { to: '/member/articles', label: 'Feed', Icon: FileText, matchPaths: ['/member/articles'] },
        { to: '/member/profile', label: 'Profile', Icon: User, matchPaths: ['/member/profile'] },
      ]}
    />
  )
}
