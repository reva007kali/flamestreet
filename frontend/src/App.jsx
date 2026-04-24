import { Navigate, Route, Routes } from "react-router-dom";
import RoleGuard from "@/components/common/RoleGuard";
import AdminLayout from "@/components/layout/AdminLayout";
import CourierLayout from "@/components/layout/CourierLayout";
import CashierLayout from "@/components/layout/CashierLayout";
import MemberLayout from "@/components/layout/MemberLayout";
import TrainerLayout from "@/components/layout/TrainerLayout";
import { homeForRoles } from "@/lib/roleHome";
import { useAuthStore } from "@/store/authStore";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import RegisterTrainer from "@/pages/auth/RegisterTrainer";
import OrderDetail from "@/pages/common/OrderDetail";
import Articles from "@/pages/common/Articles";
import ArticleDetail from "@/pages/common/ArticleDetail";
import ArticlesList from "@/pages/common/ArticlesList";
import ArticleDetailPage from "@/pages/common/ArticleDetailPage";
import FpShop from "@/pages/common/FpShop";
import FlamehubFeed from "@/pages/flamehub/Feed";
import FlamehubCreatePost from "@/pages/flamehub/CreatePost";
import FlamehubPostDetail from "@/pages/flamehub/PostDetail";
import FlamehubProfile from "@/pages/flamehub/Profile";
import FlamehubSearch from "@/pages/flamehub/Search";
import MemberHome from "@/pages/member/Home";
import Menu from "@/pages/member/Menu";
import ProductDetail from "@/pages/member/ProductDetail";
import Cart from "@/pages/member/Cart";
import Checkout from "@/pages/member/Checkout";
import MemberOrders from "@/pages/member/Orders";
import MemberChats from "@/pages/member/Chats";
import MemberChatThread from "@/pages/member/ChatThread";
import MemberNutrition from "@/pages/member/Nutrition";
import MemberProfile from "@/pages/member/Profile";
import MemberInvitations from "@/pages/member/Invitations";
import MemberOnboarding from "@/pages/member/Onboarding";
import MemberOnboardingGate from "@/components/member/MemberOnboardingGate";
import TrainerDashboard from "@/pages/trainer/Dashboard";
import TrainerReferrals from "@/pages/trainer/Referrals";
import TrainerInviteMember from "@/pages/trainer/InviteMember";
import TrainerPoints from "@/pages/trainer/Points";
import TrainerProfile from "@/pages/trainer/Profile";
import TrainerChats from "@/pages/trainer/Chats";
import TrainerChatThread from "@/pages/trainer/ChatThread";
import CourierDashboard from "@/pages/courier/Dashboard";
import DeliveryDetail from "@/pages/courier/DeliveryDetail";
import CourierChats from "@/pages/courier/Chats";
import CourierChatThread from "@/pages/courier/ChatThread";
import CashierQueue from "@/pages/cashier/Queue";
import CashierOrders from "@/pages/cashier/Orders";
import CashierDashboard from "@/pages/cashier/Dashboard";
import CashierCheckoutPOS from "@/pages/cashier/CheckoutPOS";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminOrders from "@/pages/admin/Orders";
import AdminCategories from "@/pages/admin/Categories";
import AdminCategoryForm from "@/pages/admin/CategoryForm";
import AdminProducts from "@/pages/admin/Products";
import AdminProductForm from "@/pages/admin/ProductForm";
import AdminPaymentMethods from "@/pages/admin/PaymentMethods";
import AdminPaymentMethodForm from "@/pages/admin/PaymentMethodForm";
import AdminPromoBanners from "@/pages/admin/PromoBanners";
import AdminPromoBannerForm from "@/pages/admin/PromoBannerForm";
import AdminArticles from "@/pages/admin/Articles";
import AdminArticleForm from "@/pages/admin/ArticleForm";
import AdminUsers from "@/pages/admin/Users";
import AdminUserForm from "@/pages/admin/UserForm";
import AdminTrainers from "@/pages/admin/Trainers";
import AdminMembers from "@/pages/admin/Members";
import AdminGyms from "@/pages/admin/Gyms";
import AdminPointSettings from "@/pages/admin/PointSettings";
import AdminDeliveryBranches from "@/pages/admin/DeliveryBranches";
import AdminDeliveryPricing from "@/pages/admin/DeliveryPricing";
import AdminRedeems from "@/pages/admin/Redeems";
import AdminFpShopItems from "@/pages/admin/FpShopItems";
import AdminFpShopItemForm from "@/pages/admin/FpShopItemForm";
import Landing from "@/pages/Landing";
import PrivacyPolicy from "@/pages/PrivacyPolicy";

function GuestOnly({ children }) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  if (token && user)
    return <Navigate to={homeForRoles(user.roles ?? [])} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/login"
        element={
          <GuestOnly>
            <Login />
          </GuestOnly>
        }
      />
      <Route
        path="/register"
        element={
          <GuestOnly>
            <Register />
          </GuestOnly>
        }
      />
      <Route
        path="/register-trainer"
        element={
          <GuestOnly>
            <RegisterTrainer />
          </GuestOnly>
        }
      />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route
        path="/data-privacy"
        element={<Navigate to="/privacy-policy" replace />}
      />

      <Route
        element={
          <RoleGuard allowRoles={["member", "trainer", "courier", "admin"]} />
        }
      >
        <Route path="/orders/:orderNumber" element={<OrderDetail />} />
      </Route>

      <Route element={<RoleGuard allowRoles={["member"]} />}>
        <Route path="/member/onboarding" element={<MemberOnboarding />} />
        <Route element={<MemberOnboardingGate />}>
          <Route element={<MemberLayout />}>
            <Route path="/member" element={<MemberHome />} />
            <Route path="/member/menu" element={<Menu />} />
            <Route path="/member/product/:slug" element={<ProductDetail />} />
            <Route path="/member/cart" element={<Cart />} />
            <Route path="/member/checkout" element={<Checkout />} />
            <Route path="/member/orders" element={<MemberOrders />} />
            <Route path="/member/chats" element={<MemberChats />} />
            <Route
              path="/member/chats/:orderNumber"
              element={<MemberChatThread />}
            />
            <Route path="/member/invitations" element={<MemberInvitations />} />
            <Route path="/member/fp-shop" element={<FpShop basePath="/member" />} />
            <Route path="/member/nutrition" element={<MemberNutrition />} />
            <Route
              path="/member/feed"
              element={<Articles basePath="/member" />}
            />
            <Route
              path="/member/feed/:slug"
              element={<ArticleDetail basePath="/member" />}
            />
            <Route
              path="/member/articles"
              element={<Navigate to="/member/feed" replace />}
            />
            <Route
              path="/member/articles/:slug"
              element={<ArticleDetail basePath="/member" />}
            />
            <Route
              path="/member/flamehub"
              element={<FlamehubFeed basePath="/member" />}
            />
            <Route
              path="/member/flamehub/new"
              element={<FlamehubCreatePost basePath="/member" />}
            />
            <Route
              path="/member/flamehub/p/:id"
              element={<FlamehubPostDetail basePath="/member" />}
            />
            <Route
              path="/member/flamehub/u/:username"
              element={<FlamehubProfile basePath="/member" />}
            />
            <Route
              path="/member/flamehub/search"
              element={<FlamehubSearch basePath="/member" />}
            />
            <Route path="/member/profile" element={<MemberProfile />} />
          </Route>
        </Route>
      </Route>

      <Route element={<RoleGuard allowRoles={["trainer"]} />}>
        <Route element={<TrainerLayout />}>
          <Route
            path="/trainer"
            element={<Navigate to="/trainer/dashboard" replace />}
          />
          <Route path="/trainer/dashboard" element={<TrainerDashboard />} />
          <Route path="/trainer/referrals" element={<TrainerReferrals />} />
          <Route path="/trainer/fp-shop" element={<FpShop basePath="/trainer" />} />
          <Route
            path="/trainer/invite-member"
            element={<TrainerInviteMember />}
          />
          <Route path="/trainer/points" element={<TrainerPoints />} />
          <Route
            path="/trainer/redeem"
            element={<Navigate to="/trainer/points" replace />}
          />
          <Route path="/trainer/profile" element={<TrainerProfile />} />
          <Route
            path="/trainer/feed"
            element={<Articles basePath="/trainer" />}
          />
          <Route
            path="/trainer/feed/:slug"
            element={<ArticleDetail basePath="/trainer" />}
          />
          <Route
            path="/trainer/articles"
            element={<Navigate to="/trainer/feed" replace />}
          />
          <Route
            path="/trainer/articles/:slug"
            element={<ArticleDetail basePath="/trainer" />}
          />
          <Route
            path="/trainer/flamehub"
            element={<FlamehubFeed basePath="/trainer" />}
          />
          <Route
            path="/trainer/flamehub/new"
            element={<FlamehubCreatePost basePath="/trainer" />}
          />
          <Route
            path="/trainer/flamehub/p/:id"
            element={<FlamehubPostDetail basePath="/trainer" />}
          />
          <Route
            path="/trainer/flamehub/u/:username"
            element={<FlamehubProfile basePath="/trainer" />}
          />
          <Route
            path="/trainer/flamehub/search"
            element={<FlamehubSearch basePath="/trainer" />}
          />
          <Route path="/trainer/menu" element={<Menu basePath="/trainer" />} />
          <Route
            path="/trainer/product/:slug"
            element={<ProductDetail basePath="/trainer" />}
          />
          <Route path="/trainer/cart" element={<Cart basePath="/trainer" />} />
          <Route path="/trainer/checkout" element={<Checkout />} />
          <Route path="/trainer/orders" element={<MemberOrders />} />
          <Route path="/trainer/chats" element={<TrainerChats />} />
          <Route
            path="/trainer/chats/:orderNumber"
            element={<TrainerChatThread />}
          />
        </Route>
      </Route>

      <Route element={<RoleGuard allowRoles={["courier"]} />}>
        <Route element={<CourierLayout />}>
          <Route
            path="/courier"
            element={<Navigate to="/courier/dashboard" replace />}
          />
          <Route path="/courier/dashboard" element={<CourierDashboard />} />
          <Route path="/courier/chats" element={<CourierChats />} />
          <Route
            path="/courier/chats/:orderNumber"
            element={<CourierChatThread />}
          />
          <Route
            path="/courier/delivery/:orderNumber"
            element={<DeliveryDetail />}
          />
        </Route>
      </Route>

      <Route element={<RoleGuard allowRoles={["cashier", "admin"]} />}>
        <Route element={<CashierLayout />}>
          <Route
            path="/cashier"
            element={<Navigate to="/cashier/dashboard" replace />}
          />
          <Route path="/cashier/dashboard" element={<CashierDashboard />} />
          <Route path="/cashier/queue" element={<CashierQueue />} />
          <Route path="/cashier/orders" element={<CashierOrders />} />
          <Route path="/cashier/orders/:orderNumber" element={<OrderDetail />} />
          <Route path="/cashier/menu" element={<Menu basePath="/cashier" />} />
          <Route
            path="/cashier/product/:slug"
            element={<ProductDetail basePath="/cashier" />}
          />
          <Route path="/cashier/cart" element={<Cart basePath="/cashier" />} />
          <Route path="/cashier/checkout" element={<CashierCheckoutPOS />} />
        </Route>
      </Route>

      <Route element={<RoleGuard allowRoles={["admin"]} />}>
        <Route element={<AdminLayout />}>
          <Route
            path="/admin"
            element={<Navigate to="/admin/dashboard" replace />}
          />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/categories/new" element={<AdminCategoryForm />} />
          <Route path="/admin/categories/:id" element={<AdminCategoryForm />} />
          <Route
            path="/admin/payment-methods"
            element={<AdminPaymentMethods />}
          />
          <Route
            path="/admin/payment-methods/new"
            element={<AdminPaymentMethodForm />}
          />
          <Route
            path="/admin/payment-methods/:id"
            element={<AdminPaymentMethodForm />}
          />
          <Route path="/admin/promo-banners" element={<AdminPromoBanners />} />
          <Route
            path="/admin/promo-banners/new"
            element={<AdminPromoBannerForm />}
          />
          <Route
            path="/admin/promo-banners/:id"
            element={<AdminPromoBannerForm />}
          />
          <Route path="/admin/fp-shop/items" element={<AdminFpShopItems />} />
          <Route
            path="/admin/fp-shop/items/new"
            element={<AdminFpShopItemForm />}
          />
          <Route
            path="/admin/fp-shop/items/:id"
            element={<AdminFpShopItemForm />}
          />
          <Route path="/admin/articles" element={<AdminArticles />} />
          <Route path="/admin/articles/new" element={<AdminArticleForm />} />
          <Route path="/admin/articles/:id" element={<AdminArticleForm />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/products/new" element={<AdminProductForm />} />
          <Route path="/admin/products/:id" element={<AdminProductForm />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/users/new" element={<AdminUserForm />} />
          <Route path="/admin/users/:id" element={<AdminUserForm />} />
          <Route path="/admin/trainers" element={<AdminTrainers />} />
          <Route path="/admin/members" element={<AdminMembers />} />
          <Route path="/admin/gyms" element={<AdminGyms />} />
          <Route
            path="/admin/delivery-branches"
            element={<AdminDeliveryBranches />}
          />
          <Route
            path="/admin/delivery-pricing"
            element={<AdminDeliveryPricing />}
          />
          <Route
            path="/admin/point-settings"
            element={<AdminPointSettings />}
          />
          <Route path="/admin/redeems" element={<AdminRedeems />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />

      <Route path="/articles" element={<ArticlesList />} />
      <Route path="/articles/:slug" element={<ArticleDetailPage />} />
    </Routes>
  );
}
