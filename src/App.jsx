import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Footer from "./components/Footer/Footer";
import Navbar from "./components/Navbar/Navbar";
import { PageSkeleton } from "./components/PhoneCard/PhoneCard";

import Home from "./pages/Home/Home";
import PhoneBrowse from "./pages/PhoneBrowse/PhoneBrowse";
import PhoneSpecifications from "./pages/PhoneSpecifications/PhoneSpecifications";

// Split out so the first visit stays light: the main pages are in the first download, the others
// load on demand, and preloadPages fetches the common ones in the background right after.
const loadCompare = () => import("./pages/PhoneComparison/PhoneComparison");
const loadFavorites = () => import("./pages/Favorites/Favorites");
const loadAccount = () => import("./pages/Account/Account");
const loadLogin = () => import("./pages/Login/Login");
const loadRegister = () => import("./pages/Register/Register");
const loadReviewThread = () => import("./pages/ReviewThread/ReviewThread");

const PhoneComparison = lazy(loadCompare);
const Favorites = lazy(loadFavorites);
const Account = lazy(loadAccount);
const Login = lazy(loadLogin);
const Register = lazy(loadRegister);
const ReviewThread = lazy(loadReviewThread);
const ForgotPassword = lazy(() => import("./pages/ResetPassword/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword/ResetPassword"));
// The Markdown renderer and the admin panel are large and only some visitors need them.
const Review = lazy(() => import("./pages/Review/Review"));
const AdminPanel = lazy(() => import("./pages/AdminPanel/AdminPanel"));

function preloadPages() {
  for (const load of [loadCompare, loadFavorites, loadAccount, loadLogin, loadRegister, loadReviewThread]) {
    load().catch(() => {});
  }
}

if ("requestIdleCallback" in window) {
  window.requestIdleCallback(preloadPages);
} else {
  setTimeout(preloadPages, 1500);
}

// Old search URL; searching now happens in the catalogue.
function SearchRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/browse${search}`} replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Navbar />

        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/search" element={<SearchRedirect />} />
            <Route path="/browse" element={<PhoneBrowse />} />
            <Route path="/phone/:phoneId" element={<PhoneSpecifications />} />
            <Route path="/phone/:phoneId/reviews" element={<ReviewThread />} />
            <Route path="/review/:reviewId" element={<Review />} />
            <Route path="/compare" element={<PhoneComparison />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/account" element={<Account />} />
            <Route path="/admin_panel" element={<AdminPanel />} />
          </Routes>
        </Suspense>

        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
