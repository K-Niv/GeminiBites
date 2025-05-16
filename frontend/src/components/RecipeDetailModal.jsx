import React from 'react';

const RecipeDetailModal = ({ recipe, onClose, onToggleFavorite, isFavorite }) => {
    if (!recipe) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={onClose} // Close modal on backdrop click
        >
            <div 
                className="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-in-left"
                onClick={e => e.stopPropagation()} // Prevent closing when clicking inside modal content
            >
                <div className="flex justify-between items-start mb-6">
                    <h2 className="text-3xl font-bold text-gray-800">{recipe.name}</h2>
                    <button 
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-800 transition-colors text-2xl"
                    >
                        &times;
                    </button>
                </div>

                {recipe.image_url && (
                    <img 
                        src={recipe.image_url} 
                        alt={recipe.name} 
                        className="w-full h-72 object-cover rounded-lg mb-6 shadow-md"
                        onError={(e) => e.target.style.display='none'} 
                    />
                )}

                <div className="flex justify-end mb-4">
                     <button 
                        onClick={() => onToggleFavorite(recipe.id)}
                        className={`px-4 py-2 rounded-lg flex items-center font-semibold transition-all duration-300 ease-in-out 
                                    ${isFavorite 
                                        ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
                                    transform hover:scale-105`}
                    >
                        {isFavorite ? '♥ Favorited' : '♡ Add to Favorites'}
                    </button>
                </div>

                <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-2 text-purple-700">Ingredients:</h3>
                    <pre className="bg-purple-50 p-4 rounded-lg text-sm whitespace-pre-wrap font-sans text-gray-700 shadow-inner">{recipe.ingredients || 'Not specified'}</pre>
                </div>

                <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-2 text-purple-700">Instructions:</h3>
                    <pre className="bg-purple-50 p-4 rounded-lg text-sm whitespace-pre-wrap font-sans text-gray-700 shadow-inner">{recipe.instructions || 'Not specified'}</pre>
                </div>

                {recipe.tutorials && recipe.tutorials.length > 0 && (
                    <div className="mt-8">
                        <h3 className="text-2xl font-semibold mb-4 text-purple-700">Recipe Tutorials:</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {recipe.tutorials.map(tutorial => (
                                <a 
                                    key={tutorial.id} 
                                    href={tutorial.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="block bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-purple-200 hover:border-purple-400"
                                >
                                    <img src={tutorial.thumbnail_url} alt={tutorial.title} className="w-full h-40 object-cover rounded-md mb-3"/>
                                    <h4 className="text-md font-semibold text-purple-800 truncate mb-1" title={tutorial.title}>{tutorial.title}</h4>
                                    <p className="text-xs text-gray-600">Channel: {tutorial.channel_name}</p>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
                 <button 
                    onClick={onClose}
                    className="mt-8 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:shadow-xl transition duration-300"
                >
                    Close
                </button>
            </div>
        </div>
    );
};

export default RecipeDetailModal;
