import { BrowserRouter as Router, Routes, Route } from "react-router-dom"; 
import SignIn from "./pages/AuthPages/SignIn";
import NotFound from "./pages/OtherPage/NotFound";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import {PrivateRoute} from "./routers/PrivateRouter";
import UserPage from "./pages/Admin/UserPage";

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
            <Route path="/admin" element={<UserPage />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
