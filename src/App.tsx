import { BrowserRouter as Router, Routes, Route } from "react-router-dom"; 
import SignIn from "./pages/AuthPages/SignIn";
import NotFound from "./pages/OtherPage/NotFound";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import {PrivateRoute} from "./routers/PrivateRouter";
import UserPage from "./pages/Admin/UserPage";
import DashboardPage from "./pages/Admin/DashboardPage";
import AccountPage from "./pages/Admin/AccountPage";
import VAPage from "./pages/VA/VAPage";
import CardGroupPage from "./pages/Cards/CardGroupPage";

export default function App() {
  return (
    <Router>
      <ScrollToTop />

      <Routes>  
        <Route path="/login" element={<SignIn />} />

        {/* Private routes */}
        <Route element={<PrivateRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/admin" element={<DashboardPage />} />
            <Route path="/admin/users" element={<UserPage />} />
            <Route path="/admin/account" element={<AccountPage />} />
            <Route path="/virtual-account" element={<VAPage />} />
            <Route path="/card-group" element={<CardGroupPage />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
