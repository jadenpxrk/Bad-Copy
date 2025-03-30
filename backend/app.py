from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import uuid
import random
from dotenv import load_dotenv
import os
import tensorflow as tf
import numpy as np
from PIL import Image
import io
import base64
from scipy.spatial.distance import cosine
import requests
from io import BytesIO

load_dotenv()

# Game state
games = {}  # Dictionary to store active games by ID

# Load reference images from environment variables
reference_images = [
    os.getenv("REFERENCE_IMAGE_1"),
    os.getenv("REFERENCE_IMAGE_2"),
    os.getenv("REFERENCE_IMAGE_3"),
    os.getenv("REFERENCE_IMAGE_4"),
]
# Filter out None values (in case some environment variables are missing)
reference_images = [img for img in reference_images if img]


# Load the model once at startup
def load_model():
    # Use EfficientNetV2B0 without top layer (no classification head)
    base_model = tf.keras.applications.EfficientNetV2B0(
        include_top=False, weights="imagenet", input_shape=(224, 224, 3), pooling="avg"
    )

    # We'll use the model up to the global average pooling layer
    model = tf.keras.Model(inputs=base_model.input, outputs=base_model.output)
    return model


# Initialize the model
model = None


# Image preprocessing
def preprocess_image(image_data, is_url=False):
    if is_url:
        response = requests.get(image_data)
        img = Image.open(BytesIO(response.content))
    else:
        # Remove the base64 prefix if present
        if "base64," in image_data:
            image_data = image_data.split("base64,")[1]

        # Decode base64 image
        img_bytes = base64.b64decode(image_data)
        img = Image.open(BytesIO(img_bytes))

    # Convert to RGB if needed
    if img.mode != "RGB":
        img = img.convert("RGB")

    # Resize to the required input shape
    img = img.resize((224, 224))

    # Convert to array and preprocess for EfficientNet
    img_array = tf.keras.preprocessing.image.img_to_array(img)
    img_array = tf.expand_dims(img_array, 0)
    img_array = tf.keras.applications.efficientnet_v2.preprocess_input(img_array)

    return img_array


# Extract embeddings
def get_embedding(image_data, is_url=False):
    global model

    # Load model if it hasn't been loaded yet
    if model is None:
        model = load_model()

    # Preprocess the image
    processed_img = preprocess_image(image_data, is_url)

    # Get embeddings
    embedding = model.predict(processed_img)

    # Normalize the embedding (L2 norm)
    embedding = embedding / np.linalg.norm(embedding)

    return embedding


# Calculate similarity score
def get_similarity_score(embedding1, embedding2):
    # Calculate cosine similarity (1 - cosine distance)
    similarity = 1 - cosine(embedding1.flatten(), embedding2.flatten())

    # Convert to a 0-100 score, ensuring it's never negative
    score = max(0, int(similarity * 100))

    return score


# Load the model once at startup
def load_model():
    # Use EfficientNetV2B0 without top layer (no classification head)
    base_model = tf.keras.applications.EfficientNetV2B0(
        include_top=False, weights="imagenet", input_shape=(224, 224, 3), pooling="avg"
    )

    # We'll use the model up to the global average pooling layer
    model = tf.keras.Model(inputs=base_model.input, outputs=base_model.output)
    return model


# Initialize the model
model = None


# Image preprocessing
def preprocess_image(image_data, is_url=False):
    if is_url:
        response = requests.get(image_data)
        img = Image.open(BytesIO(response.content))
    else:
        # Remove the base64 prefix if present
        if "base64," in image_data:
            image_data = image_data.split("base64,")[1]

        # Decode base64 image
        img_bytes = base64.b64decode(image_data)
        img = Image.open(BytesIO(img_bytes))

    # Convert to RGB if needed
    if img.mode != "RGB":
        img = img.convert("RGB")

    # Resize to the required input shape
    img = img.resize((224, 224))

    # Convert to array and preprocess for EfficientNet
    img_array = tf.keras.preprocessing.image.img_to_array(img)
    img_array = tf.expand_dims(img_array, 0)
    img_array = tf.keras.applications.efficientnet_v2.preprocess_input(img_array)

    return img_array


# Extract embeddings
def get_embedding(image_data, is_url=False):
    global model

    # Load model if it hasn't been loaded yet
    if model is None:
        model = load_model()

    # Preprocess the image
    processed_img = preprocess_image(image_data, is_url)

    # Get embeddings
    embedding = model.predict(processed_img)

    # Normalize the embedding (L2 norm)
    embedding = embedding / np.linalg.norm(embedding)

    return embedding


# Calculate similarity score
def get_similarity_score(embedding1, embedding2):
    # Calculate cosine similarity (1 - cosine distance)
    similarity = 1 - cosine(embedding1.flatten(), embedding2.flatten())

    # Convert to a 0-100 score
    score = int(similarity * 100)

    return score


def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": "*"}})
    socketio = SocketIO(app, cors_allowed_origins="*")

    @app.route("/health", methods=["GET"])
    def health_check():
        return jsonify(status="ok")

    @app.route("/api/create-game", methods=["POST"])
    def create_game():
        game_id = str(uuid.uuid4())
        reference_image = random.choice(reference_images)

        games[game_id] = {
            "id": game_id,
            "players": [],
            "status": "waiting",
            "reference_image": reference_image,
            "drawings": {},
            "ready_for_next": set(),
        }

        return jsonify({"game_id": game_id})

    @app.route("/api/game/<game_id>", methods=["GET"])
    def get_game(game_id):
        if game_id not in games:
            return jsonify({"error": "Game not found"}), 404

        game = games[game_id]
        return jsonify(
            {
                "id": game["id"],
                "status": game["status"],
                "players": game["players"],
                "reference_image": (
                    game["reference_image"] if game["status"] == "active" else None
                ),
            }
        )

    @socketio.on("connect")
    def handle_connect():
        print("Client connected")

    @socketio.on("disconnect")
    def handle_disconnect():
        print("Client disconnected")

    @socketio.on("join_game")
    def handle_join_game(data):
        game_id = data.get("game_id")
        player_name = data.get("player_name", "Player")

        if game_id not in games:
            emit("error", {"message": "Game not found"})
            return

        game = games[game_id]

        if len(game["players"]) >= 2:
            emit("error", {"message": "Game is full"})
            return

        player_id = str(uuid.uuid4())
        player = {"id": player_id, "name": player_name}

        join_room(game_id)
        game["players"].append(player)

        emit("player_joined", player, to=game_id)

        # Update game status to ready when two players have joined
        if len(game["players"]) == 2:
            game["status"] = "ready"

        return {"player_id": player_id}

    @socketio.on("start_game")
    def handle_start_game(data):
        game_id = data.get("game_id")
        player_id = data.get("player_id")

        if game_id not in games:
            emit("error", {"message": "Game not found"})
            return

        game = games[game_id]

        # Verify this is from the first player (creator)
        if not game["players"] or player_id != game["players"][0]["id"]:
            emit("error", {"message": "Only the game creator can start the game"})
            return

        if len(game["players"]) < 2:
            emit("error", {"message": "Need at least 2 players to start"})
            return

        game["status"] = "active"
        reference_image = game["reference_image"]
        socketio.emit("game_start", {"reference_image": reference_image}, to=game_id)

        # Set timer for 30 seconds
        socketio.sleep(30)
        game["status"] = "finished"
        socketio.emit("time_up", to=game_id)

    @socketio.on("submit_drawing")
    def handle_submit_drawing(data):
        game_id = data.get("game_id")
        player_id = data.get("player_id")
        drawing_data = data.get("drawing_data")

        if game_id not in games:
            emit("error", {"message": "Game not found"})
            return

        game = games[game_id]

        if player_id not in [p["id"] for p in game["players"]]:
            emit("error", {"message": "Player not in this game"})
            return

        game["drawings"][player_id] = drawing_data

        if len(game["drawings"]) == 2:
            results = calculate_results(game)
            socketio.emit("game_results", results, to=game_id)

    @socketio.on("play_again")
    def handle_play_again(data):
        game_id = data.get("game_id")
        player_id = data.get("player_id")

        if game_id not in games:
            emit("error", {"message": "Game not found"})
            return

        game = games[game_id]

        if player_id not in [p["id"] for p in game["players"]]:
            emit("error", {"message": "Player not in this game"})
            return

        game["ready_for_next"].add(player_id)

        # Notify all players about who wants to play again
        player_name = next(
            (p["name"] for p in game["players"] if p["id"] == player_id), "Unknown"
        )
        socketio.emit(
            "player_ready",
            {"player_id": player_id, "player_name": player_name},
            to=game_id,
        )

        # If both players are ready and one is the creator, set status to ready
        if len(game["ready_for_next"]) == 2:
            # Reset game for new round but require manual start
            game["status"] = "ready"
            game["drawings"] = {}
            # Reset the ready_for_next set
            game["ready_for_next"] = set()

            # Ensure we pick a different reference image than the previous one
            current_image = game["reference_image"]
            available_images = [img for img in reference_images if img != current_image]
            if not available_images:  # Fallback if somehow we only have one image
                available_images = reference_images

            game["reference_image"] = random.choice(available_images)

            # Start the new game
            socketio.emit(
                "game_start", {"reference_image": game["reference_image"]}, to=game_id
            )

            # Set timer for 30 seconds in a non-blocking way
            def end_game_after_timeout():
                socketio.sleep(30)
                if game_id in games:  # Check if game still exists
                    games[game_id]["status"] = "finished"
                    socketio.emit("time_up", to=game_id)

            # Start the timer in a background thread
            import threading

            timer_thread = threading.Thread(target=end_game_after_timeout)
            timer_thread.daemon = True
            timer_thread.start()

    @app.route("/test/semantic", methods=["GET"])
    def test_semantic():
        try:
            # Create a white test image
            test_image1 = Image.new("RGB", (224, 224), "white")
            buffered1 = io.BytesIO()
            test_image1.save(buffered1, format="PNG")
            drawing_data1 = base64.b64encode(buffered1.getvalue()).decode()

            # Create a black test image
            test_image2 = Image.new("RGB", (224, 224), "black")
            buffered2 = io.BytesIO()
            test_image2.save(buffered2, format="PNG")
            drawing_data2 = base64.b64encode(buffered2.getvalue()).decode()

            # Get reference image
            ref_image_url = reference_images[0]

            # Get embeddings
            ref_embedding = get_embedding(ref_image_url, is_url=True)
            drawing1_embedding = get_embedding(drawing_data1)
            drawing2_embedding = get_embedding(drawing_data2)

            # Calculate scores
            score1 = get_similarity_score(ref_embedding, drawing1_embedding)
            score2 = get_similarity_score(ref_embedding, drawing2_embedding)

            return jsonify(
                {
                    "reference_image": ref_image_url,
                    "white_square_score": score1,
                    "black_square_score": score2,
                    "status": "success",
                }
            )

        except Exception as e:
            return jsonify({"error": str(e), "status": "error"}), 500

    @app.errorhandler(404)
    def not_found(error):
        return jsonify(error="Resource not found"), 404

    @app.errorhandler(500)
    def server_error(error):
        return jsonify(error="Internal server error"), 500

    def calculate_results(game):
        global model

        # Ensure model is loaded
        if model is None:
            model = load_model()

        player1_id = game["players"][0]["id"]
        player2_id = game["players"][1]["id"]

        # Get the reference image
        ref_image_url = game["reference_image"]

        try:
            # Get embeddings for the reference image
            ref_embedding = get_embedding(ref_image_url, is_url=True)

            # Get embeddings for player drawings
            player1_drawing = game["drawings"].get(player1_id)
            player2_drawing = game["drawings"].get(player2_id)

            # Calculate scores
            player1_score = 0
            player2_score = 0

            if player1_drawing:
                player1_embedding = get_embedding(player1_drawing)
                player1_score = get_similarity_score(ref_embedding, player1_embedding)

            if player2_drawing:
                player2_embedding = get_embedding(player2_drawing)
                player2_score = get_similarity_score(ref_embedding, player2_embedding)

            # Determine winner
            winner = player1_id if player1_score > player2_score else player2_id

            return {
                "scores": {player1_id: player1_score, player2_id: player2_score},
                "winner": winner,
                "reference_image": game["reference_image"],
                "drawings": game["drawings"],
            }

        except Exception as e:
            print(f"Error calculating results: {str(e)}")
            # Fallback to random scores in case of error
            player1_score = 75
            player2_score = 68
            winner = player1_id if player1_score > player2_score else player2_id

            return {
                "scores": {player1_id: player1_score, player2_id: player2_score},
                "winner": winner,
                "reference_image": game["reference_image"],
                "drawings": game["drawings"],
                "error": str(e),
            }

    return socketio, app


if __name__ == "__main__":
    socketio, app = create_app()
    port = int(os.environ.get("PORT", 8080))
    socketio.run(
        app, debug=False, host="0.0.0.0", port=port, allow_unsafe_werkzeug=True
    )
