import './App.css'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom'
import AuthPage from './components/AuthPage'
import AppointmentPage from './components/AppointmentPage'
import { useState } from 'react'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const handleLoginSuccess = (user) => {
    setIsLoggedIn(true);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={
            isLoggedIn ? 
              <Navigate to="/appointments" replace /> : 
              <AuthPage onLoginSuccess={handleLoginSuccess} />
          } />
          <Route 
            path="/appointments" 
            element={
              isLoggedIn ? 
                <AppointmentPage user={currentUser} onLogout={handleLogout} /> : 
                <Navigate to="/" replace />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
