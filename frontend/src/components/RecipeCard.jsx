import React from 'react';

const RecipeCard = ({ recipe, onClick, onToggleFavorite, isFavorite }) => (
    <div
        className="bg-white rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-300 cursor-pointer animate-fade-in"
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

export default RecipeCard;
