import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import RecipeCard from './RecipeCard'; // Assuming RecipeCard is in the same folder or adjust path
import RecipeDetailModal from './RecipeDetailModal'; // You'll create this

const PreviousRecipesPage = () => {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [recipes, setRecipes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [favoriteRecipeIds, setFavoriteRecipeIds] = useState(new Set());

    const fetchAuthAndRecipes = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Check Auth
            const authResponse = await fetch('http://127.0.0.1:5000/api/check_auth', {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!authResponse.ok) {
                navigate('/'); // Redirect if not authenticated
                return;
            }
            const authData = await authResponse.json();
            if (!authData.logged_in) {
                navigate('/');
                return;
            }
            setCurrentUser(authData.user);

            // Fetch Previous Recipes
            const recipesResponse = await fetch('http://127.0.0.1:5000/api/recipe', {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!recipesResponse.ok) {
                throw new Error('Failed to fetch previous recipes');
            }
            const recipesData = await recipesResponse.json();
            setRecipes(recipesData);

            // Fetch Favorite Recipe IDs
            const favResponse = await fetch('http://127.0.0.1:5000/api/recipe/favorite', {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });
            if (favResponse.ok) {
                const favData = await favResponse.json();
                setFavoriteRecipeIds(new Set(favData.map(r => r.id)));
            }

        } catch (err) {
            console.error("Error fetching data:", err);
            setError(err.message || "Failed to load recipes.");
            // Potentially navigate away or show a more user-friendly error
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchAuthAndRecipes();
    }, [fetchAuthAndRecipes]);

    const handleRecipeClick = (recipe) => {
        setSelectedRecipe(recipe);
    };

    const handleCloseModal = () => {
        setSelectedRecipe(null);
    };

    const toggleFavorite = async (recipeId) => {
        const isCurrentlyFavorite = favoriteRecipeIds.has(recipeId);
        const originalFavorites = new Set(favoriteRecipeIds);

        // Optimistically update UI
        const updatedFavorites = new Set(favoriteRecipeIds);
        if (isCurrentlyFavorite) {
            updatedFavorites.delete(recipeId);
        } else {
            updatedFavorites.add(recipeId);
        }
        setFavoriteRecipeIds(updatedFavorites);

        try {
            const response = await fetch(`http://127.0.0.1:5000/api/recipe/favorite/${recipeId}`, {
                method: 'POST', // Backend handles toggle logic (add/remove)
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                // Revert UI on failure
                setFavoriteRecipeIds(originalFavorites);
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${isCurrentlyFavorite ? 'unfavorite' : 'favorite'} recipe`);
            }
            // Optionally, re-fetch favorites or update based on response
            // For now, optimistic update is fine.

        } catch (err) {
            console.error("Favorite toggle error:", err);
            setError(err.message);
            setFavoriteRecipeIds(originalFavorites); // Revert on error
        }
    };
    
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
            navigate('/'); 
        }
    };


    if (isLoading) {
        return <div className="flex justify-center items-center min-h-screen bg-gray-50">Loading recipes...</div>;
    }

    if (error) {
        return <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 text-red-600">
            <p>Error: {error}</p>
            <button onClick={() => navigate('/main')} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                Back to Main
            </button>
        </div>;
    }
    
    if (!currentUser) {
        return <div className="flex justify-center items-center min-h-screen">Redirecting...</div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
            <header className="mb-10">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                        My Recipe Collection
                    </h1>
                    <div>
                        <button
                            onClick={() => navigate('/main')}
                            className="mr-4 px-6 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition duration-300"
                        >
                            Generate New
                        </button>
                         <button
                            onClick={() => navigate('/favorites')}
                            className="mr-4 px-6 py-2 bg-pink-500 text-white rounded-lg shadow hover:bg-pink-600 transition duration-300"
                        >
                            View Favorites
                        </button>
                        <button
                            onClick={handleLogout}
                            className="px-6 py-2 bg-gray-700 text-white rounded-lg shadow hover:bg-gray-800 transition duration-300"
                        >
                            Logout ({currentUser.name})
                        </button>
                    </div>
                </div>
            </header>

            {recipes.length === 0 ? (
                <div className="text-center">
                    <p className="text-xl text-gray-600 mb-4">You haven't generated any recipes yet.</p>
                    <button
                        onClick={() => navigate('/main')}
                        className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-transform duration-300"
                    >
                        Generate Your First Recipe!
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {recipes.map(recipe => (
                        <RecipeCard
                            key={recipe.id}
                            recipe={recipe}
                            onClick={handleRecipeClick}
                            onToggleFavorite={toggleFavorite}
                            isFavorite={favoriteRecipeIds.has(recipe.id)}
                        />
                    ))}
                </div>
            )}

            {selectedRecipe && (
                <RecipeDetailModal
                    recipe={selectedRecipe}
                    onClose={handleCloseModal}
                    onToggleFavorite={toggleFavorite}
                    isFavorite={favoriteRecipeIds.has(selectedRecipe.id)}
                />
            )}
        </div>
    );
};

export default PreviousRecipesPage;

