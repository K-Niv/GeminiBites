import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const MainPage = () => {
    const navigate = useNavigate();
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
            // Refresh previous recipes list after generating a new one
            if (activeTab === 'previous') {
                fetchRecipes(); 
            } else {
                // Optionally switch to previous tab or just add to the current view if needed
                setActiveTab('previous'); // Switch to show the new recipe
            }

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
            navigate('/'); // Redirect to home after logout
        }
    };

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
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-800 text-white p-4 flex flex-col">
                <h2 className="text-2xl font-semibold mb-6">GeminiBites</h2>
                <nav className="flex-grow">
                    <button
                        onClick={() => setActiveTab('previous')}
                        className={`block w-full text-left px-4 py-2 mb-2 rounded ${activeTab === 'previous' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
                    >
                        Previous Recipes
                    </button>
                    <button
                        onClick={() => setActiveTab('favorites')}
                        className={`block w-full text-left px-4 py-2 mb-2 rounded ${activeTab === 'favorites' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
                    >
                        Favourites
                    </button>
                </nav>
                {/* Display recipes in sidebar */}
                <div className="overflow-y-auto flex-grow mb-4 border-t border-gray-700 pt-4">
                    <h3 className="text-lg font-medium mb-2 px-4">{activeTab === 'previous' ? 'Previous' : 'Favourites'}</h3>
                    {isFetchingRecipes ? (
                        <p className="px-4 text-gray-400">Loading...</p>
                    ) : recipesToShow.length === 0 ? (
                        <p className="px-4 text-gray-400">No recipes found.</p>
                    ) : (
                        recipesToShow.map(recipe => (
                            <button 
                                key={recipe.id} 
                                onClick={() => setGeneratedRecipe(recipe)} // Show recipe details on click
                                className="block w-full text-left px-4 py-1 text-sm hover:bg-gray-600 rounded truncate"
                                title={recipe.name}
                            >
                                {recipe.name}
                            </button>
                        ))
                    )}
                </div>
                <div className="mt-auto border-t border-gray-700 pt-4">
                     <p className="text-sm mb-2 px-4">Welcome, {currentUser.name}!</p>
                    <button
                        onClick={handleLogout}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
                    >
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 md:p-10 overflow-y-auto">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-3xl font-bold mb-6 text-gray-800">Generate a New Recipe</h1>
                    
                    {/* Input Form */}
                    <form onSubmit={handleGenerateRecipe} className="bg-white p-6 rounded-lg shadow-md mb-8">
                        <div className="flex items-center space-x-4 mb-4">
                            <textarea
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={inputType === 'ingredients' ? 'Enter ingredients (e.g., chicken, rice, onions)' : 'Enter dish name (e.g., Chicken Curry)'}
                                className="flex-grow p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                rows="3"
                                required
                            />
                            <div className="flex flex-col space-y-2">
                                <select
                                    value={inputType}
                                    onChange={(e) => setInputType(e.target.value)}
                                    className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 h-full"
                                >
                                    <option value="ingredients">Ingredients</option>
                                    <option value="dish_name">Dish Name</option>
                                </select>
                                <button
                                    type="submit"
                                    disabled={isGenerating}
                                    className="bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 px-6 rounded-md font-semibold hover:shadow-lg transition duration-300 disabled:opacity-50 h-full"
                                >
                                    {isGenerating ? 'Generating...' : 'Generate'}
                                </button>
                            </div>
                        </div>
                         {generationError && <p className="text-red-500 mt-2">{generationError}</p>}
                    </form>

                    {/* Display Generated/Selected Recipe */}
                    {generatedRecipe && (
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h2 className="text-2xl font-semibold mb-4 text-gray-800">{generatedRecipe.name}</h2>
                            {generatedRecipe.image_url && (
                                <img 
                                    src={generatedRecipe.image_url} 
                                    alt={generatedRecipe.name} 
                                    className="w-full h-64 object-cover rounded-md mb-4" 
                                    onError={(e) => e.target.style.display='none'} // Hide if image fails to load
                                />
                            )}
                            <div className="mb-4">
                                <h3 className="text-lg font-medium mb-2 text-gray-700">Ingredients:</h3>
                                <pre className="bg-gray-100 p-3 rounded-md text-sm whitespace-pre-wrap font-sans">{generatedRecipe.ingredients || 'Not specified'}</pre>
                            </div>
                            <div>
                                <h3 className="text-lg font-medium mb-2 text-gray-700">Instructions:</h3>
                                <pre className="bg-gray-100 p-3 rounded-md text-sm whitespace-pre-wrap font-sans">{generatedRecipe.instructions || 'Not specified'}</pre>
                            </div>
                            {/* TODO: Add Tutorials if available */}
                            {/* TODO: Add Favorite button */}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default MainPage;