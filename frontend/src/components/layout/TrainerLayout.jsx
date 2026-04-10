import ResponsiveSidebarLayout from '@/components/layout/ResponsiveSidebarLayout'
import { Coins, FileText, LayoutDashboard, User, Users, Utensils } from 'lucide-react'

export default function TrainerLayout() {
  return (
    <ResponsiveSidebarLayout
      brand="Flamestreet Trainer"
      brandTo="/trainer/dashboard"
      basePath="/trainer"
      navItems={[
        { to: '/trainer/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
        { to: '/trainer/menu', label: 'Meals', Icon: Utensils, matchPaths: ['/trainer/menu', '/trainer/product'] },
        { to: '/trainer/points', label: 'Points', Icon: Coins },
        { to: '/trainer/articles', label: 'Feed', Icon: FileText, matchPaths: ['/trainer/articles'] },
        { to: '/trainer/profile', label: 'Profile', Icon: User },
        { to: '/trainer/referrals', label: 'Referrals', Icon: Users },
      ]}
    />
  )
}
