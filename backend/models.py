from app import app, db

favourites = db.Table('favourites',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id')),
    db.Column('recipe_id', db.Integer, db.ForeignKey('recipe.id'))
)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False, unique=True)
    password = db.Column(db.String(120), nullable=False)
    recipes = db.relationship('Recipe', backref='creator', lazy=True)
    favourite_recipes = db.relationship('Recipe', secondary=favourites, back_populates='liked_by_users')

    def to_json(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email
        }


class Recipe(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    instructions = db.Column(db.Text, nullable=False)
    ingredients = db.Column(db.Text, nullable=False) # Store the ingredients list
    image_url = db.Column(db.String(200), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    liked_by_users = db.relationship('User', secondary=favourites, back_populates='favourite_recipes')
    tutorials = db.relationship('Tutorial', backref='recipe', lazy=True, cascade="all, delete-orphan")

    def to_json(self):
        return {
            "id": self.id,
            "name": self.name,
            "instructions": self.instructions,
            "ingredients": self.ingredients,
            "image_url": self.image_url,
            "user_id": self.user_id,
            "tutorials": [tutorial.to_json() for tutorial in self.tutorials]
        }


class Tutorial(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    video_id = db.Column(db.String(20), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    thumbnail_url = db.Column(db.String(200), nullable=True)
    channel_name = db.Column(db.String(100), nullable=True)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipe.id'), nullable=False)

    def to_json(self):
        return {
            "id": self.id,
            "video_id": self.video_id,
            "title": self.title,
            "thumbnail_url": self.thumbnail_url,
            "channel_name": self.channel_name,
            "url": f"https://www.youtube.com/watch?v={self.video_id}"
        }

