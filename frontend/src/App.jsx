import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HeroSection from './components/HeroSection';
import MainPage from './components/MainPage'; // Create this component next
import PreviousRecipesPage from './components/PreviousRecipesPage';
import FavoriteRecipesPage from './components/FavoriteRecipesPage';

function App() {
    // Basic check for login status (can be improved with context/state management)
    // This assumes HeroSection manages login state and potentially stores something 
    // (like user info, not the token) or you have a global state.
    // For now, we'll pass a prop or use a more robust state management later.
    
    // A more robust way would involve a global state/context provider
    // to check authentication status across the app.
    // Let's assume MainPage handles its own auth check for now or receives props.

    return (
        <Router>
            <Routes>
                {/* HeroSection is the landing/login page */}
                <Route path="/" element={<HeroSection />} /> 
                
                {/* MainPage is protected (example, needs real auth check) */}
                {/* You'd typically wrap this in a component that checks auth */}
                <Route path="/main" element={<MainPage />} /> 
                <Route path="/previous-recipes" element={<PreviousRecipesPage />} />
                <Route path="/favorites" element={<FavoriteRecipesPage />} />

                {/* Redirect any other path to home */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
}

export default App;

// Note: You might need to adjust how HeroSection and MainPage share/check 
// login status. Using React Context API or Zustand/Redux is common.
// For simplicity here, MainPage might re-check auth on load.
