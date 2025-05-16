import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import RecipeCard from './RecipeCard';
import RecipeDetailModal from './RecipeDetailModal';

const FavoriteRecipesPage = () => {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [favoriteRecipes, setFavoriteRecipes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    // No need for a separate favoriteRecipeIds set here, as all recipes on this page are favorites.
    // We'll filter the list directly when a recipe is unfavorited.

    const fetchAuthAndFavorites = useCallback(async () => {
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

            // Fetch Favorite Recipes
            const favResponse = await fetch('http://127.0.0.1:5000/api/recipe/favorite', {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!favResponse.ok) {
                throw new Error('Failed to fetch favorite recipes');
            }
            const favData = await favResponse.json();
            setFavoriteRecipes(favData);

        } catch (err) {
            console.error("Error fetching data:", err);
            setError(err.message || "Failed to load favorite recipes.");
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchAuthAndFavorites();
    }, [fetchAuthAndFavorites]);

    const handleRecipeClick = (recipe) => {
        setSelectedRecipe(recipe);
    };

    const handleCloseModal = () => {
        setSelectedRecipe(null);
    };

    const toggleFavorite = async (recipeId) => {
        // On this page, "toggling" a favorite means removing it.
        const originalFavorites = [...favoriteRecipes];

        // Optimistically update UI by removing the recipe
        setFavoriteRecipes(prevFavorites => prevFavorites.filter(recipe => recipe.id !== recipeId));
        if (selectedRecipe && selectedRecipe.id === recipeId) {
            setSelectedRecipe(null); // Close modal if the unfavorited recipe was open
        }

        try {
            const response = await fetch(`http://127.0.0.1:5000/api/recipe/favorite/${recipeId}`, {
                method: 'POST', // Backend handles toggle logic (add/remove)
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                // Revert UI on failure
                setFavoriteRecipes(originalFavorites);
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to unfavorite recipe');
            }
            // If successful, the optimistic update is correct.
            // If the modal was showing the unfavorited recipe, it should reflect it or close.
            // We might need to refresh the selectedRecipe if it's the one being unfavorited.
            if (selectedRecipe && selectedRecipe.id === recipeId) {
                 // Update the selected recipe to reflect its new favorite status (which is false)
                 // Or simply close the modal as done above.
                 // For simplicity, if an open recipe is unfavorited, it's removed from the list and modal closes.
            }


        } catch (err) {
            console.error("Unfavorite error:", err);
            setError(err.message);
            setFavoriteRecipes(originalFavorites); // Revert on error
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
        return <div className="flex justify-center items-center min-h-screen bg-gray-50">Loading your favorite recipes...</div>;
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
        <div className="min-h-screen bg-gradient-to-br from-pink-100 via-red-50 to-rose-100 py-8 px-4 sm:px-6 lg:px-8">
            <header className="mb-10">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-500">
                        My Favorite Recipes
                    </h1>
                    <div>
                        <button
                            onClick={() => navigate('/main')}
                            className="mr-4 px-6 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition duration-300"
                        >
                            Generate New
                        </button>
                        <button
                            onClick={() => navigate('/previous-recipes')}
                            className="mr-4 px-6 py-2 bg-indigo-500 text-white rounded-lg shadow hover:bg-indigo-600 transition duration-300"
                        >
                            All My Recipes
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

            {favoriteRecipes.length === 0 ? (
                <div className="text-center py-10">
                    <svg className="mx-auto h-24 w-24 text-pink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <h2 className="mt-6 text-2xl font-semibold text-gray-700">No Favorites Yet!</h2>
                    <p className="mt-2 text-gray-500">
                        Looks like you haven't added any recipes to your favorites.
                        <br />
                        Generate some recipes or browse your collection to find some you love!
                    </p>
                    <button
                        onClick={() => navigate('/main')}
                        className="mt-8 px-8 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-transform duration-300"
                    >
                        Discover Recipes
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {favoriteRecipes.map(recipe => (
                        <RecipeCard
                            key={recipe.id}
                            recipe={recipe}
                            onClick={handleRecipeClick}
                            onToggleFavorite={toggleFavorite} // This will remove it from favorites
                            isFavorite={true} // All recipes on this page are initially favorites
                        />
                    ))}
                </div>
            )}

            {selectedRecipe && (
                <RecipeDetailModal
                    recipe={selectedRecipe}
                    onClose={handleCloseModal}
                    onToggleFavorite={toggleFavorite}
                    // Check if the selected recipe is still in the favoriteRecipes list after a potential toggle
                    isFavorite={favoriteRecipes.some(favRecipe => favRecipe.id === selectedRecipe.id)}
                />
            )}
        </div>
    );
};

export default FavoriteRecipesPage;
