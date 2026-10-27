import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Navbar from "./components/Navbar/Navbar";

import Home from "./pages/Home/Home";
import Register from "./pages/Register/Register";
import Login from "./pages/Login/Login";
import SearchResults from "./pages/SearchResults/SearchResults";
import PhoneBrowse from "./pages/PhoneBrowse/PhoneBrowse";
import PhoneSpecifications from "./pages/PhoneSpecifications/PhoneSpecifications";
import ReviewThread from "./pages/ReviewThread/ReviewThread";
import Review from "./pages/Review/Review";
import PhoneComparison from "./pages/PhoneComparison/PhoneComparison";
import AdminPanel from "./pages/AdminPanel/AdminPanel";

function App() {
  return (
  <AuthProvider>
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/search" element={<SearchResults />} />
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
          <Route
            path="/phone/:phoneId"
            element={<PhoneSpecifications />}
        />
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