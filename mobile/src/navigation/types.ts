export type RootStackParamList = {
  Auth: undefined;
  App:
    | {
        screen?: keyof AppTabParamList;
        params?: any;
      }
    | undefined;
  Onboarding: undefined;
  ProductDetail: { slug: string };
  OrderDetail: { orderNumber: string; orderId?: number };
  Chats: undefined;
  ChatThread: { orderNumber: string; orderId?: number };
  Nutrition: undefined;
  Checkout: undefined;
  Profile: undefined;
  Notifications: undefined;
  FeedDetail: { slug: string };
  Flamehub: undefined;
  FlamehubCreate: undefined;
  FlamehubPost: { id: number };
  FlamehubEditPost: { id: number };
  FlamehubProfile: { username: string };
  FlamehubFollowers: { username: string };
  FlamehubSearch: undefined;
  PointsHistory: undefined;
  TrainerMembers: undefined;
  TrainerWithdraw: undefined;
  CashierOrderDetail: { id: number };
  AdminOrders: undefined;
  AdminOrderDetail: { id: number };
  AdminRedeems: undefined;
  AdminUsers: undefined;
  AdminTrainers: undefined;
  AdminProducts: undefined;
  AdminProductCategories: undefined;
  AdminGyms: undefined;
  AdminPromoBanners: undefined;
  AdminArticles: undefined;
  AdminPaymentMethods: undefined;
  AdminPointSettings: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register:
    | { allowTrainer?: boolean; presetRole?: "member" | "trainer" }
    | undefined;
};

export type AppTabParamList = {
  Dashboard: undefined;
  Admin: undefined;
  Home: undefined;
  Products: undefined;
  Cart: undefined;
  Orders: undefined;
  Flamehub: undefined;
  Queue: { preset?: "all" | "unpaid" } | undefined;
};
