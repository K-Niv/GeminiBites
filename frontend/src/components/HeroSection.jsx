import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const HeroSection = () => {
    const [showLogin, setShowLogin] = useState(false);
    const [showSignup, setShowSignup] = useState(false);
    const [loginForm, setLoginForm] = useState({ email: "", password: "" });
    const [signupForm, setSignupForm] = useState({ 
        name: "", 
        email: "", 
        password: "",
        agreeTerms: false
    });
    const [formErrors, setFormErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const navigate = useNavigate(); // Initialize navigate

    useEffect(() => {
        const checkAuthentication = async () => {
            try {
                const response = await fetch('http://127.0.0.1:5000/api/check_auth', {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.logged_in) {
                        // If already logged in when visiting '/', redirect to main
                        // navigate('/main'); // Uncomment if you want auto-redirect
                        setIsLoggedIn(true); // Still useful to update HeroSection UI if needed
                        setCurrentUser(data.user);
                        console.log("User is logged in:", data.user);
                    } else {
                        setIsLoggedIn(false);
                        setCurrentUser(null);
                    }
                } else {
                    setIsLoggedIn(false);
                    setCurrentUser(null);
                }
            } catch (error) {
                console.error("Auth check failed:", error);
                setIsLoggedIn(false);
                setCurrentUser(null);
            }
        };

        checkAuthentication();
    }, [navigate]); // Add navigate to dependency array if used inside

    const handleLoginChange = (e) => {
        const { name, value } = e.target;
        setLoginForm({ ...loginForm, [name]: value });
    };

    const handleSignupChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSignupForm({ 
            ...signupForm, 
            [name]: type === 'checkbox' ? checked : value 
        });
    };

    const validateLogin = () => {
        const errors = {};
        if (!loginForm.email) errors.email = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(loginForm.email)) errors.email = "Email is invalid";
        
        if (!loginForm.password) errors.password = "Password is required";
        return errors;
    };

    const validateSignup = () => {
        const errors = {};
        if (!signupForm.name) errors.name = "Name is required";
        
        if (!signupForm.email) errors.email = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(signupForm.email)) errors.email = "Email is invalid";
        
        if (!signupForm.password) errors.password = "Password is required";
        else if (signupForm.password.length < 6) errors.password = "Password must be at least 6 characters";
        
        if (!signupForm.agreeTerms) errors.agreeTerms = "You must agree to the terms";
        
        return errors;
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        const errors = validateLogin();
        setFormErrors(errors);

        if (Object.keys(errors).length === 0) {
            setIsLoading(true);
            setErrorMessage(null);

            try {
                const response = await fetch('http://127.0.0.1:5000/api/login', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: loginForm.email,
                        password: loginForm.password
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || data.message || 'Login failed');
                }

                // Update state (optional here if redirecting immediately)
                setIsLoggedIn(true); 
                setCurrentUser(data.user); 

                // Clear form and close modal
                setLoginForm({ email: "", password: "" });
                setShowLogin(false);

                // --- Navigate to Main Page ---
                navigate('/main'); 

            } catch (error) {
                setErrorMessage(error.message);
                setIsLoggedIn(false); 
                setCurrentUser(null);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleSignupSubmit = async (e) => {
        e.preventDefault();
        const errors = validateSignup();
        setFormErrors(errors);

        if (Object.keys(errors).length === 0) {
            setIsLoading(true);
            setErrorMessage(null);

            try {
                const response = await fetch('http://127.0.0.1:5000/api/user', {
                    method: 'POST',
                    credentials: 'include', // Important: Include cookies
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: signupForm.name,
                        email: signupForm.email,
                        password: signupForm.password
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    // Try to parse error message from backend
                    let errorMsg = 'Registration failed';
                    try {
                        const errorData = await response.json();
                        errorMsg = errorData.message || errorData.error || errorMsg;
                    } catch (parseError) {
                        // If parsing fails, use the status text
                        errorMsg = response.statusText || errorMsg;
                    }
                    throw new Error(errorMsg);
                }

                // --- REMOVE AUTO-LOGIN ---
                // setIsLoggedIn(true); // REMOVED
                // setCurrentUser(data.user); // REMOVED

                // Show simple success message
                setSuccessMessage({
                    type: 'success',
                    title: 'Account Created',
                });

                // Clear form
                setSignupForm({
                    name: "",
                    email: "",
                    password: "",
                    agreeTerms: false
                });
                // Close signup modal
                setShowSignup(false);

                // Automatically close the success message after 3 seconds
                setTimeout(() => {
                    setSuccessMessage(null);
                    // Optionally, prompt user to log in now
                    // setShowLogin(true); 
                }, 3000);

            } catch (error) {
                setErrorMessage(error.message);
                // Ensure state is correct on error (user is not logged in)
                setIsLoggedIn(false); 
                setCurrentUser(null);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleLogout = async () => {
        try {
            const response = await fetch('http://127.0.0.1:5000/api/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                setIsLoggedIn(false);
                setCurrentUser(null);
                console.log("Logout successful");
            } else {
                console.error("Logout failed");
            }
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    const handleCloseMessage = () => {
        setSuccessMessage(null);
    };

    return (
        <div className="relative min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e293b] flex items-center justify-center text-white overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute top-1/2 -right-48 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-pulse"></div>
            </div>

            <div className="text-center z-10 px-4 max-w-3xl">
                <h1 className="text-5xl md:text-7xl font-extrabold mb-6 animate-fade-in-down tracking-tight">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                        GEMINIBITES
                    </span>
                </h1>
                <p className="text-xl md:text-2xl mb-10 animate-fade-in text-gray-300 max-w-2xl mx-auto">
                    Your AI-Powered Kitchen Companion for Discovering Perfect Recipes
                </p>
                <div className="space-x-6">
                    {!isLoggedIn ? (
                        <>
                            <button
                                onClick={() => setShowLogin(true)}
                                className="px-8 py-3 bg-transparent border-2 border-white rounded-full font-semibold hover:bg-white hover:text-gray-800 transform hover:-translate-y-1 transition-all duration-300"
                            >
                                Login
                            </button>
                            <button
                                onClick={() => setShowSignup(true)}
                                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full font-semibold hover:shadow-lg hover:shadow-purple-500/50 transform hover:-translate-y-1 transition-all duration-300"
                            >
                                Sign Up
                            </button>
                        </>
                    ) : (
                        <>
                            <span className="text-lg mr-4">Welcome, {currentUser?.name}!</span>
                            <button
                                onClick={handleLogout}
                                className="px-8 py-3 bg-red-500 hover:bg-red-600 rounded-full font-semibold transform hover:-translate-y-1 transition-all duration-300"
                            >
                                Logout
                            </button>
                        </>
                    )}
                </div>
            </div>

            {successMessage && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={handleCloseMessage}>
                    <div 
                        className="animate-slide-in-right" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                                    <span className="text-green-500 mr-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </span>
                                    {successMessage.title}
                                </h2>
                                <button 
                                    onClick={handleCloseMessage}
                                    className="text-gray-500 hover:text-gray-800 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            <p className="text-gray-600 text-center">
                                {successMessage.title === 'Login Successful' ? 'Welcome back!' : 'Your account is ready.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {showLogin && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowLogin(false)}>
                    <div 
                        className="animate-slide-in-right" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">Welcome Back</h2>
                                <button 
                                    onClick={() => setShowLogin(false)}
                                    className="text-gray-500 hover:text-gray-800 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            {errorMessage && (
                                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                                    {errorMessage}
                                </div>
                            )}
                            
                            <form onSubmit={handleLoginSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-gray-700 text-sm font-medium mb-2">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={loginForm.email}
                                        onChange={handleLoginChange}
                                        placeholder="your@email.com"
                                        className={`w-full px-4 py-3 border ${formErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900`}
                                    />
                                    {formErrors.email && <p className="mt-1 text-sm text-red-500">{formErrors.email}</p>}
                                </div>
                                <div>
                                    <label className="block text-gray-700 text-sm font-medium mb-2">Password</label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={loginForm.password}
                                        onChange={handleLoginChange}
                                        placeholder="••••••••"
                                        className={`w-full px-4 py-3 border ${formErrors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900`}
                                    />
                                    {formErrors.password && <p className="mt-1 text-sm text-red-500">{formErrors.password}</p>}
                                </div>
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center">
                                        <input type="checkbox" className="h-4 w-4 text-purple-600" />
                                        <span className="ml-2 text-sm text-gray-600">Remember me</span>
                                    </label>
                                    <a href="#" className="text-sm text-purple-600 hover:text-purple-800">Forgot password?</a>
                                </div>
                                <button 
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-r from-purple-500 to-blue-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition duration-300 flex justify-center items-center"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                                    ) : null}
                                    {isLoading ? 'Logging in...' : 'Login'}
                                </button>
                                <p className="text-sm text-gray-600 text-center mt-4">
                                    Don't have an account? <a href="#" onClick={(e) => {
                                        e.preventDefault();
                                        setShowLogin(false);
                                        setShowSignup(true);
                                    }} className="text-purple-600 hover:text-purple-800">Sign up</a>
                                </p>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {showSignup && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowSignup(false)}>
                    <div 
                        className="animate-slide-in-left" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">Create Account</h2>
                                <button 
                                    onClick={() => setShowSignup(false)}
                                    className="text-gray-500 hover:text-gray-800 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            {errorMessage && (
                                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                                    {errorMessage}
                                </div>
                            )}
                            
                            <form onSubmit={handleSignupSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-gray-700 text-sm font-medium mb-2">Full Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={signupForm.name}
                                        onChange={handleSignupChange}
                                        placeholder="John Doe"
                                        className={`w-full px-4 py-3 border ${formErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900`}
                                    />
                                    {formErrors.name && <p className="mt-1 text-sm text-red-500">{formErrors.name}</p>}
                                </div>
                                <div>
                                    <label className="block text-gray-700 text-sm font-medium mb-2">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={signupForm.email}
                                        onChange={handleSignupChange}
                                        placeholder="your@email.com"
                                        className={`w-full px-4 py-3 border ${formErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900`}
                                    />
                                    {formErrors.email && <p className="mt-1 text-sm text-red-500">{formErrors.email}</p>}
                                </div>
                                <div>
                                    <label className="block text-gray-700 text-sm font-medium mb-2">Password</label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={signupForm.password}
                                        onChange={handleSignupChange}
                                        placeholder="Create a strong password"
                                        className={`w-full px-4 py-3 border ${formErrors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900`}
                                    />
                                    {formErrors.password && <p className="mt-1 text-sm text-red-500">{formErrors.password}</p>}
                                </div>
                                <div>
                                    <label className={`flex items-center ${formErrors.agreeTerms ? 'text-red-500' : ''}`}>
                                        <input 
                                            type="checkbox" 
                                            name="agreeTerms"
                                            checked={signupForm.agreeTerms}
                                            onChange={handleSignupChange}
                                            className={`h-4 w-4 ${formErrors.agreeTerms ? 'text-red-500 border-red-500' : 'text-purple-600'}`} 
                                        />
                                        <span className="ml-2 text-sm text-gray-600">I agree to the <a href="#" className="text-purple-600 hover:text-purple-800">Terms of Service</a> and <a href="#" className="text-purple-600 hover:text-purple-800">Privacy Policy</a></span>
                                    </label>
                                    {formErrors.agreeTerms && <p className="mt-1 text-sm text-red-500">{formErrors.agreeTerms}</p>}
                                </div>
                                <button 
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition duration-300 flex justify-center items-center"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                                    ) : null}
                                    {isLoading ? 'Creating Account...' : 'Sign Up'}
                                </button>
                                <p className="text-sm text-gray-600 text-center mt-4">
                                    Already have an account? <a href="#" onClick={(e) => {
                                        e.preventDefault();
                                        setShowSignup(false);
                                        setShowLogin(true);
                                    }} className="text-purple-600 hover:text-purple-800">Login</a>
                                </p>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HeroSection;