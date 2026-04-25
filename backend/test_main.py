import os

# Ensure backend/main.py can be imported in isolation during CI tests.
os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")

from main import _extract_headlines_from_articles, normalize_ticker, panic_score_from_finbert_probs


def test_normalize_ticker_defaults_to_all() -> None:
    assert normalize_ticker(None) == "ALL"
    assert normalize_ticker("") == "ALL"
    assert normalize_ticker("   ") == "ALL"


def test_normalize_ticker_strips_and_uppercases() -> None:
    assert normalize_ticker(" tsla ") == "TSLA"


def test_extract_headlines_ignores_invalid_items() -> None:
    articles = [
        {"headline": "  First headline  "},
        {"headline": ""},
        {"headline": None},
        {"title": "Missing headline field"},
        "not-a-dict",
        {"headline": "Second headline"},
    ]
    assert _extract_headlines_from_articles(articles) == ["First headline", "Second headline"]


def test_panic_score_from_finbert_probs_weights_negative_higher() -> None:
    classification = [
        {"label": "negative", "score": 0.7},
        {"label": "neutral", "score": 0.2},
        {"label": "positive", "score": 0.1},
    ]
    score = panic_score_from_finbert_probs(classification)
    assert round(score, 1) == 80.0
