const features = [
  {
    title: "Smart Recipe Suggestions",
    desc: "Just tell us what's in your kitchen — we'll handle the rest.",
    icon: "🧠",
  },
  {
    title: "Save Your Favorites",
    desc: "Easily bookmark recipes for later, synced to your account.",
    icon: "❤️",
  },
  {
    title: "AI-Powered Instructions",
    desc: "Gemini crafts personalized instructions that are easy to follow.",
    icon: "🤖",
  },
];

const FeaturesSection = () => {
  return (
    <div className="bg-gradient-to-b from-white to-gray-100 py-20 px-6 text-gray-800">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">What GEMINIBITES Offers</h2>
        <p className="text-center text-lg text-gray-600 mb-16 max-w-2xl mx-auto">Discover how our AI-powered platform transforms your cooking experience</p>
        
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-10">
          {features.map((feature, i) => (
            <div 
              key={i} 
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-100 group"
            >
              <div className="text-4xl mb-4 bg-purple-100 h-16 w-16 flex items-center justify-center rounded-xl group-hover:bg-purple-200 transition-colors duration-300">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3 group-hover:text-purple-600 transition-colors duration-300">{feature.title}</h3>
              <p className="text-gray-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturesSection;
