import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import PasswordReset from "@/pages/password-reset";
import Onboarding from "@/pages/onboarding";
import PendingApproval from "@/pages/pending-approval";
import AcceptInvite from "@/pages/accept-invite";

import DashboardLayout from "@/pages/dashboard/layout";
import DashboardHome from "@/pages/dashboard/dashboard";
import Pos from "@/pages/dashboard/pos";
import Inventory from "@/pages/dashboard/inventory";
import InventoryMoves from "@/pages/dashboard/inventory-moves";
import InventoryChinaImport from "@/pages/dashboard/inventory-china-import";
import Sales from "@/pages/dashboard/sales";
import Quotations from "@/pages/dashboard/quotations";
import Credit from "@/pages/dashboard/credit";
import Reports from "@/pages/dashboard/reports";
import UsersPage from "@/pages/dashboard/users";
import SettingsPage from "@/pages/dashboard/settings";
import SetupStatus from "@/pages/dashboard/setup-status";
import Saas from "@/pages/dashboard/saas";
import Ai from "@/pages/dashboard/ai";

const queryClient = new QueryClient();

function Dashboard({ component: Component }: { component: React.ComponentType }) {
  return (
    <DashboardLayout>
      <Component />
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/password-reset" component={PasswordReset} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/pending-approval" component={PendingApproval} />
      <Route path="/accept-invite" component={AcceptInvite} />

      <Route path="/dashboard">
        <Dashboard component={DashboardHome} />
      </Route>
      <Route path="/pos">
        <Dashboard component={Pos} />
      </Route>
      <Route path="/inventory">
        <Dashboard component={Inventory} />
      </Route>
      <Route path="/inventory/moves">
        <Dashboard component={InventoryMoves} />
      </Route>
      <Route path="/inventory/china-import">
        <Dashboard component={InventoryChinaImport} />
      </Route>
      <Route path="/sales">
        <Dashboard component={Sales} />
      </Route>
      <Route path="/quotations">
        <Dashboard component={Quotations} />
      </Route>
      <Route path="/credit">
        <Dashboard component={Credit} />
      </Route>
      <Route path="/reports">
        <Dashboard component={Reports} />
      </Route>
      <Route path="/users">
        <Dashboard component={UsersPage} />
      </Route>
      <Route path="/settings">
        <Dashboard component={SettingsPage} />
      </Route>
      <Route path="/setup-status">
        <Dashboard component={SetupStatus} />
      </Route>
      <Route path="/saas">
        <Dashboard component={Saas} />
      </Route>
      <Route path="/ai">
        <Dashboard component={Ai} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
