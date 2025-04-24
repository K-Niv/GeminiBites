import os
import requests
from app import app, db
from flask import request, jsonify
from models import User, Recipe, Tutorial
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Gemini setup
import google.generativeai as genai
from google.ai.generativelanguage_v1beta.types import content

# YouTube API setup
from googleapiclient.discovery import build

# Configure APIs
genai.configure(api_key=os.environ["GEMINI_API_KEY"])
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)

# Configure rate limiter
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day"],
    storage_uri="memory://"
)

generation_config = {
    "temperature": 1,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 8192,
    "response_schema": content.Schema(
        type=content.Type.OBJECT,
        required=["dish_name", "instructions"],
        properties={
            "dish_name": content.Schema(
                type=content.Type.STRING,
                description="The name of the dish",
            ),
            "instructions": content.Schema(
                type=content.Type.ARRAY,
                description="Step-by-step instructions to prepare the dish",
                items=content.Schema(type=content.Type.STRING),
            ),
        },
    ),
    "response_mime_type": "application/json",
}

system_instruction = """You are Gemini Chef — a master of culinary creativity and expert in global cuisines.

You can work in two ways:
1. When given INGREDIENTS: Suggest the best dish that can be made and provide detailed cooking instructions.
2. When given a DISH NAME: Provide the necessary ingredients list and detailed cooking instructions.

Your Guidelines:
- Begin with the dish name as the title, followed by the instructions.
- Instructions must be step-by-step, each step on a new line, numbered, and written in precise language.
- Always use standard measurement units (e.g., grams, tablespoons, cups, °C).
- When given ingredients, only suggest dishes that can reasonably be prepared using those ingredients.
- When given a dish name, provide a comprehensive ingredients list with precise quantities.
- Focus on optimizing taste, feasibility, and cultural authenticity."""

model = genai.GenerativeModel(
    model_name="gemini-2.0-flash-lite",
    generation_config=generation_config,
    system_instruction=system_instruction,
)

# Helper function to search YouTube videos
def search_youtube_recipes(dish_name):
    try:
        search_query = f"{dish_name} recipe tutorial"
        
        # Call the YouTube API search.list method
        search_response = youtube.search().list(
            q=search_query,
            part="snippet",
            maxResults=3,
            type="video"
        ).execute()
        
        # Extract video information
        videos = []
        for item in search_response.get('items', []):
            video_data = {
                'title': item['snippet']['title'],
                'video_id': item['id']['videoId'],
                'thumbnail': item['snippet']['thumbnails']['medium']['url'],
                'channel': item['snippet']['channelTitle']
            }
            videos.append(video_data)
            
        return videos
    except Exception as e:
        print(f"YouTube API error: {str(e)}")
        return []


def get_meal_image_url(dish_name):
    try:
        # Make request to TheMealDB API
        response = requests.get(f"https://www.themealdb.com/api/json/v1/1/search.php?s={dish_name}")
        data = response.json()
        
        # Check if any meals were found
        if data['meals'] and len(data['meals']) > 0:
            return data['meals'][0]['strMealThumb']
        else:
            # Fallback to a default food image if no match found
            return f"https://placehold.co/600x400?text={dish_name}"
            
    except Exception as e:
        print(f"MealDB API error: {str(e)}")
        # Fallback to a default image
        return f"https://placehold.co/600x400?text={dish_name}"

# ------------------- AUTH ----------------------

@app.route('/api/user', methods=["POST"])
def create_user():
    try:
        data = request.json
        required_fields = ["name", "email", "password"]

        for field in required_fields:
            if field not in data:
                return jsonify({"error": "Missing required fields"}), 400

        name = data["name"]
        email_user = data["email"]
        password = data["password"]

        if User.query.filter_by(email=email_user).first():
            return jsonify({"error": "Email already exists"}), 409

        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        new_user = User(name=name, email=email_user, password=hashed_password)

        db.session.add(new_user)
        db.session.commit()

        return jsonify({"msg": "User created!"}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route('/api/login', methods=["POST"])
@limiter.limit("5 per minute")
def login():
    try:
        data = request.json
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400

        user = User.query.filter_by(email=email).first()
        if not user or not check_password_hash(user.password, password):
            return jsonify({"error": "Invalid email or password"}), 401

        # Convert user.id to string when creating token
        token = create_access_token(identity=str(user.id))
        return jsonify({
            "msg": "Login successful",
            "token": token,
            "user": user.to_json()
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/user', methods=["GET"])
def get_users():
    users = User.query.all()
    return jsonify([u.to_json() for u in users])


@app.route('/api/recipe', methods=["GET"])
@jwt_required()
def get_recipes():
        try:
            user_id = get_jwt_identity()
            user = User.query.get(user_id)

            if not user:
                return jsonify({"error": "User not found"}), 404

            recipes = Recipe.query.filter_by(user_id=user_id).all()
            return jsonify([r.to_json() for r in recipes])

        except Exception as e:
            return jsonify({"error": str(e)}), 500


@app.route('/api/user/<int:id>', methods=["DELETE"])
@jwt_required()
def delete_user(id):
    try:
        current_user_id = int(get_jwt_identity())
        if current_user_id != id:
            return jsonify({"error": "Unauthorized"}), 403

        user = User.query.get(id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        db.session.delete(user)
        db.session.commit()
        return jsonify({"msg": "User deleted!"})

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# ------------------- AI Recipe Generation ----------------------

@app.route('/api/recipe/ai', methods=["POST"])
@jwt_required()
@limiter.limit("3 per minute; 60 per day")
def generate_recipe():
    try:
        user_id = get_jwt_identity()
        data = request.json
        ingredients = data.get("ingredients")
        dish_name_request = data.get("dish_name")
        
        # Validate that at least one input type is provided
        if not ingredients and not dish_name_request:
            return jsonify({"error": "Please provide either ingredients or a dish name"}), 400
            
        # Validate input length
        if ingredients and len(ingredients) > 500:
            return jsonify({"error": "Ingredients list is too long. Please limit to 500 characters."}), 400
        if dish_name_request and len(dish_name_request) > 100:
            return jsonify({"error": "Dish name is too long. Please limit to 100 characters."}), 400

        # Set appropriate prompt based on input type
        if ingredients:
            prompt = f"Ingredients available: {ingredients}. Suggest the best dish and preparation steps."
            original_input = ingredients
        else:
            prompt = f"Provide the ingredients and cooking instructions for: {dish_name_request}"
            original_input = dish_name_request

        # Generate recipe
        chat_session = model.start_chat(history=[])
        gemini_response = chat_session.send_message(prompt)
        
        recipe_json = gemini_response.candidates[0].content.parts[0].text
        import json
        recipe_data = json.loads(recipe_json)
        
        dish_name = recipe_data["dish_name"]
        
        # Get ingredients list - either from input or from AI response
        final_ingredients = original_input
        if dish_name_request and "ingredients_list" in recipe_data:
            final_ingredients = "\n".join(recipe_data["ingredients_list"])
        
        # Search YouTube for tutorial videos
        youtube_tutorials = search_youtube_recipes(dish_name)
        
        # Get meal image URL from TheMealDB
        image_url = get_meal_image_url(dish_name)
        
        recipe = Recipe(
            name=dish_name,
            instructions="\n".join(recipe_data["instructions"]),
            ingredients=final_ingredients,
            user_id=user_id,
            image_url=image_url
        )
        
        db.session.add(recipe)
        db.session.commit()
        
        # Save YouTube tutorials
        for video in youtube_tutorials:
            tutorial = Tutorial(
                recipe_id=recipe.id,
                title=video['title'],
                video_id=video['video_id'],
                thumbnail_url=video['thumbnail'],
                channel_name=video['channel']
            )
            db.session.add(tutorial)
        
        db.session.commit()
        
        return jsonify({
            "msg": "Recipe generated and saved!",
            "recipe": recipe.to_json()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# ------------------- Favorites ----------------------

@app.route('/api/recipe/favorite/<int:recipe_id>', methods=["POST"])
@jwt_required()
def add_to_favorites(recipe_id):
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        recipe = Recipe.query.get(recipe_id)

        if not recipe:
            return jsonify({"error": "Recipe not found"}), 404
        
        # Check if the recipe belongs to this user
        if str(recipe.user_id) != user_id:
            return jsonify({"error": "You can only favorite your own recipes"}), 403
            
        # Check if the recipe already exists in user's favorites
        if recipe in user.favourite_recipes:
            return jsonify({"msg": "Already in favorites"}), 200
            
        # Add the recipe to user's favorites
        user.favourite_recipes.append(recipe)
        db.session.commit()

        return jsonify({
            "msg": "Recipe added to favorites!",
            "recipe": recipe.to_json()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/recipe/favorite', methods=["GET"])
@jwt_required()
def get_favorites():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    favorites = [r.to_json() for r in user.favourite_recipes]
    return jsonify(favorites)
