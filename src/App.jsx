import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Navbar from "./components/Navbar/Navbar";

import Home from "./pages/Home/Home";
import Register from "./pages/Register/Register";
import Login from "./pages/Login/Login";
import PhoneBrowse from "./pages/PhoneBrowse/PhoneBrowse";
import PhoneSpecifications from "./pages/PhoneSpecifications/PhoneSpecifications";
import ReviewThread from "./pages/ReviewThread/ReviewThread";
import Review from "./pages/Review/Review";
import PhoneComparison from "./pages/PhoneComparison/PhoneComparison";
import Favorites from "./pages/Favorites/Favorites";
import Account from "./pages/Account/Account";
import AdminPanel from "./pages/AdminPanel/AdminPanel";

// Old search URL; searching now happens in the catalogue.
function SearchRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/browse${search}`} replace />;
}

function App() {
  return (
  <AuthProvider>
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/search" element={<SearchRedirect />} />
        <Route path="/browse" element={<PhoneBrowse />} />

        <Route
          path="/phone/:phoneId"
          element={<PhoneSpecifications />}
        />

        <Route
          path="/phone/:phoneId/reviews"
          element={<ReviewThread />}
        />

        <Route
          path="/review/:reviewId"
          element={<Review />}
        />

        <Route
          path="/compare"
          element={<PhoneComparison />}
        />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/account" element={<Account />} />
          <Route
            path="/admin_panel"
            element={<AdminPanel />}
        />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
  );
}

export default App;
