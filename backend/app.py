from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import uuid
import random
from dotenv import load_dotenv
import os

load_dotenv()

# Game state
games = {}  # Dictionary to store active games by ID
reference_images = [
    "https://images.unsplash.com/photo-1575936123452-b67c3203c357?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1591871937573-74dbba515c4c?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1529778873920-4da4926a72c2?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1598755257130-c2aaca1f061c?q=80&w=1000&auto=format&fit=crop",
]


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

            # Ensure we pick a different reference image than the previous one
            current_image = game["reference_image"]
            available_images = [img for img in reference_images if img != current_image]
            if not available_images:  # Fallback if somehow we only have one image
                available_images = reference_images

            game["reference_image"] = random.choice(available_images)

    @app.errorhandler(404)
    def not_found(error):
        return jsonify(error="Resource not found"), 404

    @app.errorhandler(500)
    def server_error(error):
        return jsonify(error="Internal server error"), 500

    def calculate_results(game):
        # Placeholder for similarity calculation
        # For now, just assign random scores
        player1_id = game["players"][0]["id"]
        player2_id = game["players"][1]["id"]

        # Static scores for testing
        player1_score = 75
        player2_score = 68

        winner = player1_id if player1_score > player2_score else player2_id

        return {
            "scores": {player1_id: player1_score, player2_id: player2_score},
            "winner": winner,
            "reference_image": game["reference_image"],
            "drawings": game["drawings"],
        }

    return socketio, app


if __name__ == "__main__":
    socketio, app = create_app()
    port = int(os.environ.get("PORT", 8080))
    socketio.run(app, debug=True, host="0.0.0.0", port=port)
