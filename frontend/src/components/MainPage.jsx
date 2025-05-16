import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const MainPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true); // Start loading until auth check finishes
    const [error, setError] = useState(null);

    // Input state
    const [inputType, setInputType] = useState('ingredients'); // 'ingredients' or 'dish_name'
    const [inputValue, setInputValue] = useState('');

    // Recipe display state
    const [generatedRecipe, setGeneratedRecipe] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState(null);

    // Sidebar state
    const [activeTab, setActiveTab] = useState('previous'); // 'previous' or 'favorites'
    const [previousRecipes, setPreviousRecipes] = useState([]);
    const [favoriteRecipes, setFavoriteRecipes] = useState([]);
    const [isFetchingRecipes, setIsFetchingRecipes] = useState(false);
    const [favoriteRecipeIds, setFavoriteRecipeIds] = useState(new Set()); // To track IDs of favorite recipes

    // Authentication Check
    const checkAuth = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('http://127.0.0.1:5000/api/check_auth', {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.logged_in) {
                    setCurrentUser(data.user);
                } else {
                    // Not logged in, redirect to home
                    navigate('/');
                }
            } else {
                 // Auth check failed, redirect to home
                 navigate('/');
            }
        } catch (err) {
            console.error("Auth check failed:", err);
            setError("Failed to verify login status. Please try logging in again.");
            // Redirect to home on error
            navigate('/');
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // Fetch Recipes based on active tab
    const fetchRecipes = useCallback(async () => {
        if (!currentUser) return; // Don't fetch if user isn't loaded

        setIsFetchingRecipes(true);
        const endpoint = activeTab === 'previous' ? '/api/recipe' : '/api/recipe/favorite';
        try {
            const response = await fetch(`http://127.0.0.1:5000${endpoint}`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch ${activeTab} recipes`);
            }
            const data = await response.json();
            if (activeTab === 'previous') {
                setPreviousRecipes(data);
            } else {
                setFavoriteRecipes(data);
            }
        } catch (err) {
            console.error(`Error fetching ${activeTab} recipes:`, err);
            // Handle error display if needed
        } finally {
            setIsFetchingRecipes(false);
        }
    }, [activeTab, currentUser]); // Depend on activeTab and currentUser

    useEffect(() => {
        fetchRecipes();
    }, [fetchRecipes]); // Fetch when the fetchRecipes function changes (due to activeTab or currentUser)

    // Fetch Favorite Recipe IDs
    const fetchFavoriteIds = useCallback(async () => {
        if (!currentUser) return;
        try {
            const response = await fetch('http://127.0.0.1:5000/api/recipe/favorite', {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });
            if (response.ok) {
                const favData = await response.json();
                setFavoriteRecipeIds(new Set(favData.map(r => r.id)));
            }
        } catch (err) {
            console.error("Error fetching favorite IDs:", err);
        }
    }, [currentUser]);

    useEffect(() => {
        if (currentUser) {
            fetchFavoriteIds();
        }
    }, [currentUser, fetchFavoriteIds]);

    // Handle AI Recipe Generation
    const handleGenerateRecipe = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        setIsGenerating(true);
        setGenerationError(null);
        setGeneratedRecipe(null); // Clear previous result

        const payload = inputType === 'ingredients' 
            ? { ingredients: inputValue } 
            : { dish_name: inputValue };

        try {
            const response = await fetch('http://127.0.0.1:5000/api/recipe/ai', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate recipe');
            }

            setGeneratedRecipe(data.recipe);
            setInputValue(''); // Clear input field on success
            fetchRecipes(); // Refresh recipes in the sidebar (if it shows previous recipes)
            fetchFavoriteIds(); // Refresh favorite IDs in case the new recipe was already a favorite (edge case)
        } catch (err) {
            console.error("Generation error:", err);
            setGenerationError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };
    
    // Handle Logout
    const handleLogout = async () => {
        try {
            await fetch('http://127.0.0.1:5000/api/logout', {
                method: 'POST',
                credentials: 'include',
            });
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            setCurrentUser(null);
            setFavoriteRecipeIds(new Set()); // Clear favorite IDs on logout
            navigate('/'); // Redirect to home after logout
        }
    };

    const toggleFavorite = async (recipeId) => {
        if (!currentUser || !recipeId) return;

        const originalFavoriteIds = new Set(favoriteRecipeIds);
        const isCurrentlyFavorite = favoriteRecipeIds.has(recipeId);

        // Optimistic UI update
        const updatedIds = new Set(favoriteRecipeIds);
        if (isCurrentlyFavorite) {
            updatedIds.delete(recipeId);
        } else {
            updatedIds.add(recipeId);
        }
        setFavoriteRecipeIds(updatedIds);

        // Update generatedRecipe if it's the one being toggled
        if (generatedRecipe && generatedRecipe.id === recipeId) {
            setGeneratedRecipe(prev => ({ ...prev, is_favorite: !isCurrentlyFavorite }));
        }

        try {
            const response = await fetch(`http://127.0.0.1:5000/api/recipe/favorite/${recipeId}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                setFavoriteRecipeIds(originalFavoriteIds); // Revert on failure
                if (generatedRecipe && generatedRecipe.id === recipeId) { // Revert generatedRecipe too
                    setGeneratedRecipe(prev => ({ ...prev, is_favorite: isCurrentlyFavorite }));
                }
                const errorData = await response.json();
                console.error("Failed to toggle favorite:", errorData.error);
                setGenerationError(errorData.error || `Failed to ${isCurrentlyFavorite ? 'unfavorite' : 'favorite'} recipe`);
            } else {
                // Success, UI already updated optimistically
                if (activeTab === 'favorites') {
                    fetchRecipes(); // Re-fetch if viewing favorites in sidebar
                }
            }
        } catch (err) {
            setFavoriteRecipeIds(originalFavoriteIds); // Revert on error
            if (generatedRecipe && generatedRecipe.id === recipeId) { // Revert generatedRecipe too
                setGeneratedRecipe(prev => ({ ...prev, is_favorite: isCurrentlyFavorite }));
            }
            console.error("Toggle favorite API error:", err);
            setGenerationError("An error occurred while updating favorites.");
        }
    };

    const isFavorite = (recipeId) => favoriteRecipeIds.has(recipeId);

    // --- Render Logic ---
    if (isLoading) {
        return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
    }

    if (error) {
         return <div className="flex justify-center items-center min-h-screen text-red-500">{error}</div>;
    }
    
    if (!currentUser) {
        // This should ideally not be reached due to redirects, but acts as a fallback
        return <div className="flex justify-center items-center min-h-screen">Not logged in.</div>;
    }

    const recipesToShow = activeTab === 'previous' ? previousRecipes : favoriteRecipes;

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-100 to-sky-100">
            {/* Sidebar */}
            <aside className="w-72 bg-gradient-to-b from-gray-800 to-gray-900 text-white p-5 flex flex-col shadow-2xl">
                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 py-2">
                        GeminiBites
                    </h2>
                </div>
                <nav className="flex-grow space-y-3">
                    <button
                        onClick={() => navigate('/main')} // Navigate to main recipe generation
                        className={`flex items-center space-x-3 w-full text-left px-4 py-3 rounded-lg transition-all duration-300 ease-in-out 
                                    ${location.pathname === '/main' 
                                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg' 
                                        : 'hover:bg-gray-700 hover:shadow-md'}`}
                    >
                        <span>🍳</span>
                        <span>Generate Recipe</span>
                    </button>
                    <button
                        onClick={() => navigate('/previous-recipes')} // Navigate to previous recipes page
                        className={`flex items-center space-x-3 w-full text-left px-4 py-3 rounded-lg transition-all duration-300 ease-in-out 
                                    ${location.pathname === '/previous-recipes' 
                                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg' 
                                        : 'hover:bg-gray-700 hover:shadow-md'}`}
                    >
                        <span>📚</span>
                        <span>My Recipe Collection</span>
                    </button>
                    <button
                        onClick={() => navigate('/favorites')} // Navigate to favorites page
                        className={`flex items-center space-x-3 w-full text-left px-4 py-3 rounded-lg transition-all duration-300 ease-in-out 
                                    ${location.pathname === '/favorites' 
                                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg' 
                                        : 'hover:bg-gray-700 hover:shadow-md'}`}
                    >
                        <span>❤️</span>
                        <span>Favorite Recipes</span>
                    </button>
                </nav>
                
                {/* User Info and Logout at the bottom */}
                <div className="mt-auto border-t border-gray-700 pt-5">
                     <div className="flex items-center mb-3 px-2">
                        <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-semibold mr-3">
                            {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                            <p className="text-sm font-medium">Welcome,</p>
                            <p className="text-md font-semibold truncate">{currentUser?.name || 'User'}!</p>
                        </div>
                     </div>
                    <button
                        onClick={handleLogout}
                        className="w-full bg-gradient-to-r from-red-500 to-pink-700 hover:from-red-600 hover:to-pink-800 text-white py-3 px-4 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-300 ease-in-out flex items-center justify-center space-x-2"
                    >
                        <span>📤</span>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 md:p-10 overflow-y-auto bg-slate-50">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-5xl font-extrabold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                            Craft Your Next Meal
                        </h1>
                        <p className="text-lg text-gray-600">
                            Let AI be your sous-chef! Enter ingredients or a dish name below.
                        </p>
                    </div>
                    
                    {/* Input Form */}
                    <form onSubmit={handleGenerateRecipe} className="bg-white p-8 rounded-xl shadow-2xl mb-10 transform hover:shadow-3xl transition-shadow duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                            <div className="md:col-span-2">
                                <label htmlFor="recipeInput" className="block text-sm font-medium text-gray-700 mb-1">Your Input</label>
                                <textarea
                                    id="recipeInput"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder={inputType === 'ingredients' ? 'E.g., chicken breast, broccoli, soy sauce...' : 'E.g., Spaghetti Carbonara'}
                                    className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow hover:shadow-md text-gray-700"
                                    rows="4"
                                    required
                                />
                            </div>
                            <div className="flex flex-col space-y-3">
                                <div>
                                    <label htmlFor="inputTypeSelect" className="block text-sm font-medium text-gray-700 mb-1">Input Type</label>
                                    <select
                                        id="inputTypeSelect"
                                        value={inputType}
                                        onChange={(e) => setInputType(e.target.value)}
                                        className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 h-full bg-white text-gray-700 hover:shadow-md"
                                    >
                                        <option value="ingredients">Ingredients</option>
                                        <option value="dish_name">Dish Name</option>
                                    </select>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isGenerating}
                                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-lg font-semibold hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-60 disabled:transform-none flex items-center justify-center space-x-2"
                                >
                                    {isGenerating ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Generating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>✨</span>
                                            <span>Generate Recipe</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                         {generationError && <p className="text-red-500 mt-4 text-center p-3 bg-red-50 rounded-lg border border-red-300">Error: {generationError}</p>}
                    </form>

                    {/* Display Generated/Selected Recipe */}
                    {generatedRecipe && (
                        <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl animate-fade-in">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-3xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 py-1">{generatedRecipe.name}</h2>
                                <button 
                                    onClick={() => toggleFavorite(generatedRecipe.id)} // Make sure toggleFavorite is defined and handles API calls
                                    className={`text-3xl p-2 rounded-full transition-all duration-300 ease-in-out transform hover:scale-110 
                                                ${isFavorite(generatedRecipe.id) ? 'text-red-500 bg-red-100' : 'text-gray-400 hover:text-red-400 hover:bg-red-50'}`}
                                    title={isFavorite(generatedRecipe.id) ? 'Remove from favorites' : 'Add to favorites'}
                                >
                                    {isFavorite(generatedRecipe.id) ? '♥' : '♡'}
                                </button>
                            </div>

                            {generatedRecipe.image_url && (
                                <img 
                                    src={generatedRecipe.image_url} 
                                    alt={generatedRecipe.name} 
                                    className="w-full h-72 object-cover rounded-lg mb-6 shadow-md border border-gray-200"
                                    onError={(e) => { e.target.src = 'https://placehold.co/600x400?text=Beautiful+Food'; e.target.classList.add('italic', 'text-gray-400'); }} // Improved fallback
                                />
                            )}

                            <div className="mb-6">
                                <h3 className="text-xl font-semibold mb-2 text-purple-700">Ingredients:</h3>
                                <pre className="bg-purple-50 p-4 rounded-lg text-sm whitespace-pre-wrap font-sans text-gray-700 shadow-inner border border-purple-100">{generatedRecipe.ingredients || 'Not specified'}</pre>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-xl font-semibold mb-2 text-purple-700">Instructions:</h3>
                                <pre className="bg-purple-50 p-4 rounded-lg text-sm whitespace-pre-wrap font-sans text-gray-700 shadow-inner border border-purple-100">{generatedRecipe.instructions || 'Not specified'}</pre>
                            </div>

                            {/* Display YouTube Tutorials */}
                            {generatedRecipe.tutorials && generatedRecipe.tutorials.length > 0 && (
                                <div className="mt-8">
                                    <h3 className="text-2xl font-semibold mb-4 text-purple-700">Watch & Learn:</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        {generatedRecipe.tutorials.map(tutorial => (
                                            <a 
                                                key={tutorial.id} 
                                                href={tutorial.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="block bg-white p-4 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 border border-purple-200 hover:border-purple-400 group"
                                            >
                                                <div className="relative mb-3">
                                                    <img src={tutorial.thumbnail_url} alt={tutorial.title} className="w-full h-40 object-cover rounded-md shadow-sm"/>
                                                    <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-10 transition-opacity duration-300 flex items-center justify-center">
                                                        <svg className="w-12 h-12 text-white opacity-80 group-hover:opacity-100 transition-opacity duration-300" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-14a6 6 0 100 12 6 6 0 000-12zm-1 10V6l5 4-5 4z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                </div>
                                                <h4 className="text-md font-semibold text-purple-800 group-hover:text-pink-600 transition-colors duration-300 truncate" title={tutorial.title}>{tutorial.title}</h4>
                                                <p className="text-xs text-gray-600">By: {tutorial.channel_name}</p>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

const RecipeCard = ({ recipe, onClick, onToggleFavorite, isFavorite }) => (
    <div 
        className="bg-white rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-300 cursor-pointer"
        onClick={() => onClick(recipe)}
    >
        <img 
            src={recipe.image_url || 'https://placehold.co/600x400?text=Recipe'} 
            alt={recipe.name} 
            className="w-full h-48 object-cover"
            onError={(e) => { e.target.src = 'https://placehold.co/600x400?text=No+Image'; }}
        />
        <div className="p-5">
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-800 truncate" title={recipe.name}>
                    {recipe.name}
                </h3>
                <button 
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent card click when clicking heart
                        onToggleFavorite(recipe.id);
                    }}
                    className={`text-2xl ${isFavorite ? 'text-red-500' : 'text-gray-400'} hover:text-red-500 transition-colors`}
                >
                    {isFavorite ? '♥' : '♡'}
                </button>
            </div>
            <p className="text-sm text-gray-600 h-10 overflow-hidden">
                {recipe.ingredients ? recipe.ingredients.split('\n').slice(0, 2).join(', ') + '...' : 'No ingredients listed.'}
            </p>
        </div>
    </div>
);

export default MainPage;