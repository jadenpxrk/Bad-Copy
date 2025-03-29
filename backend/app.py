from flask import Flask, jsonify
from flask_cors import CORS


def create_app():
    app = Flask(__name__)
    CORS(app)

    @app.route("/health", methods=["GET"])
    def health_check():
        return jsonify(status="ok")

    @app.errorhandler(404)
    def not_found(error):
        return jsonify(error="Resource not found"), 404

    @app.errorhandler(500)
    def server_error(error):
        return jsonify(error="Internal server error"), 500

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=5000)
