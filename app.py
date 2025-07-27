import os
import google.generativeai as genai
from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv

# Load environment variables from a .env file if it exists
load_dotenv()

app = Flask(__name__, static_folder='static', template_folder='static')

# --- Gemini API Configuration ---
try:
    # Securely fetch the API key from environment variables
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not found in environment variables.")
    
    genai.configure(api_key=GEMINI_API_KEY)
    
    # Initialize the Gemini model
    model = genai.GenerativeModel('gemini-1.5-flash')

except ValueError as e:
    # This will be caught if the app is run without the API key set.
    # The routes will return an error message.
    print(f"Error initializing Gemini: {e}")
    model = None

# --- Route to Serve Frontend ---
@app.route('/')
def index():
    """Serves the main HTML page of the application."""
    return render_template('index.html')

# --- API Endpoint for Affirmation Generation ---
@app.route('/generate', methods=['POST'])
def generate_affirmations():
    """
    Handles the POST request to generate affirmations.
    Accepts a JSON payload with 'theme' and 'count'.
    Returns a JSON response with a list of affirmations or an error.
    """
    if not model:
        return jsonify({"error": "Server configuration error: Gemini API key not set."}), 500

    # --- Input Validation ---
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request: No data provided."}), 400

    theme = data.get('theme', '').strip()
    try:
        count = int(data.get('count', 5))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid 'count'. Must be a number."}), 400

    if not theme:
        return jsonify({"error": "Theme cannot be empty."}), 400
    if len(theme) > 50:
        return jsonify({"error": "Theme is too long (max 50 characters)."}), 400
    if not (1 <= count <= 10):
        return jsonify({"error": "Number of affirmations must be between 1 and 10."}), 400

    # --- Prompt Engineering ---
    prompt = f"""
    Generate {count} unique, positive, and concise affirmations about "{theme}".
    Each affirmation must:
    - Be 120 characters or less.
    - Start with a capital letter.
    - Not contain any special symbols or emojis.
    - Be empowering, varied, and suitable for all ages.
    - Be listed on a separate line.

    Example for 'confidence': I am worthy of success and happiness.
    """

    # --- Gemini API Call and Error Handling ---
    try:
        response = model.generate_content(prompt)
        
        if not response.parts:
             raise ValueError("Received an empty response from the API.")

        # --- Response Parsing ---
        raw_text = response.text
        affirmations = [line.strip() for line in raw_text.split('\n') if line.strip()]
        
        # Additional filtering to ensure clean output
        cleaned_affirmations = []
        for aff in affirmations:
            # Simple check to remove potential list markers from the model's output
            if aff.startswith('- '):
                aff = aff[2:]
            if aff:
                cleaned_affirmations.append(aff)

        if not cleaned_affirmations:
            return jsonify({"error": "The AI could not generate affirmations for this theme. Please try another."}), 500

        return jsonify({"affirmations": cleaned_affirmations})

    except Exception as e:
        # This catches API errors, quota issues, content filtering, etc.
        print(f"An error occurred: {e}")
        return jsonify({"error": "Failed to generate affirmations. The API may be unavailable or the request may have been blocked. Please try again later."}), 503


if __name__ == '__main__':
    # Use 0.0.0.0 to make it accessible on your local network
    app.run(host='0.0.0.0', port=5000, debug=True)
