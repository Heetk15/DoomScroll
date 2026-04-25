import pytest
from fastapi.testclient import TestClient

# We have to adjust the path to import from the parent directory
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from main import app, calculate_panic_score, get_top_headline

client = TestClient(app)

def test_read_root():
    """
    Tests if the root endpoint returns a successful response and the expected welcome message.
    """
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the DoomScroll API"}

def test_calculate_panic_score_positive():
    """
    Tests the panic score calculation with a majority of positive headlines.
    The score should be low (closer to 0).
    """
    sentiments = [
        {"label": "positive", "score": 0.9},
        {"label": "positive", "score": 0.8},
        {"label": "neutral", "score": 0.7},
        {"label": "negative", "score": 0.6},
    ]
    score = calculate_panic_score(sentiments)
    assert 0 <= score <= 100
    # Expect a lower score due to positive sentiment
    assert score < 50

def test_calculate_panic_score_negative():
    """
    Tests the panic score calculation with a majority of negative headlines.
    The score should be high (closer to 100).
    """
    sentiments = [
        {"label": "negative", "score": 0.9},
        {"label": "negative", "score": 0.8},
        {"label": "neutral", "score": 0.7},
        {"label": "positive", "score": 0.6},
    ]
    score = calculate_panic_score(sentiments)
    assert 0 <= score <= 100
    # Expect a higher score due to negative sentiment
    assert score > 50

def test_get_top_headline():
    """
    Tests that the function correctly identifies the headline with the highest negative score
    as the "top headline".
    """
    headlines = [
        {"headline": "Markets soar on good news", "sentiment": {"label": "positive", "score": 0.95}},
        {"headline": "Interest rates remain stable", "sentiment": {"label": "neutral", "score": 0.8}},
        {"headline": "Warning signs in the tech sector", "sentiment": {"label": "negative", "score": 0.7}},
        {"headline": "Economic collapse imminent, experts say", "sentiment": {"label": "negative", "score": 0.98}},
    ]
    top_headline = get_top_headline(headlines)
    assert top_headline == "Economic collapse imminent, experts say"

def test_get_top_headline_no_negative():
    """
    Tests the behavior when there are no negative headlines.
    It should return the first headline as a fallback.
    """
    headlines = [
        {"headline": "Everything is awesome", "sentiment": {"label": "positive", "score": 0.99}},
        {"headline": "A perfectly normal day", "sentiment": {"label": "neutral", "score": 0.9}},
    ]
    top_headline = get_top_headline(headlines)
    assert top_headline == "Everything is awesome"
