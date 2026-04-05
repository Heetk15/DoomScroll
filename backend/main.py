import json
import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import redis
import requests
from dotenv import load_dotenv
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import Float, String, DateTime, Integer, create_engine, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, Session, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is required")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class SentimentHistory(Base):
    __tablename__ = "sentiment_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    panic_score: Mapped[float] = mapped_column(Float, nullable=False)
    top_headline: Mapped[str] = mapped_column(String(2000), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="DoomScroll API", lifespan=lifespan)

redis_client = redis.Redis.from_url(
    os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    decode_responses=True,
)

FINNHUB_NEWS_URL = "https://finnhub.io/api/v1/news"
HF_FINBERT_URL = "https://router.huggingface.co/hf-inference/models/ProsusAI/finbert"
HEADLINE_LIMIT = 10
HF_MAX_ATTEMPTS = 6
HF_RETRY_BASE_SEC = 5.0


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class SentimentHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    panic_score: float
    top_headline: str
    timestamp: datetime


def _require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise ValueError(f"missing required environment variable: {name}")
    return value


def fetch_general_headlines() -> list[str]:
    token = _require_env("FINNHUB_API_KEY")
    response = requests.get(
        FINNHUB_NEWS_URL,
        params={"category": "general", "token": token},
        timeout=30,
    )
    response.raise_for_status()
    articles = response.json()
    if not isinstance(articles, list):
        raise ValueError("unexpected Finnhub response shape")
    headlines: list[str] = []
    for item in articles:
        if not isinstance(item, dict):
            continue
        headline = item.get("headline")
        if isinstance(headline, str) and headline.strip():
            headlines.append(headline.strip())
        if len(headlines) >= HEADLINE_LIMIT:
            break
    if not headlines:
        raise ValueError("no headlines returned from Finnhub for category general")
    return headlines


def _unwrap_classification(payload: object) -> list[dict]:
    if isinstance(payload, dict) and "error" in payload:
        raise ValueError(str(payload.get("error", "Hugging Face API error")))
    if isinstance(payload, list) and payload:
        first = payload[0]
        if isinstance(first, dict):
            return [x for x in payload if isinstance(x, dict)]
        if isinstance(first, list):
            return [x for x in first if isinstance(x, dict)]
    return []


def _label_bucket(label: str) -> str | None:
    lower = label.lower().strip()
    if lower in ("label_0", "0"):
        return "positive"
    if lower in ("label_1", "1"):
        return "negative"
    if lower in ("label_2", "2"):
        return "neutral"
    if "negative" in lower:
        return "negative"
    if "neutral" in lower:
        return "neutral"
    if "positive" in lower:
        return "positive"
    return None


def panic_score_from_finbert_probs(classification: list[dict]) -> float:
    probs = {"negative": 0.0, "neutral": 0.0, "positive": 0.0}
    for item in classification:
        label = str(item.get("label", ""))
        bucket = _label_bucket(label)
        if bucket is None:
            continue
        probs[bucket] = float(item.get("score", 0.0))
    total = probs["negative"] + probs["neutral"] + probs["positive"]
    if total <= 0:
        return 50.0
    neg = probs["negative"] / total
    neu = probs["neutral"] / total
    pos = probs["positive"] / total
    return 100.0 * neg + 50.0 * neu + 0.0 * pos


def score_headline_finbert(text: str, hf_token: str) -> float:
    truncated = text if len(text) <= 2000 else text[:2000]
    headers = {"Authorization": f"Bearer {hf_token}"}
    body = {
        "inputs": truncated,
        "parameters": {"return_all_scores": True},
    }
    last_error: str | None = None
    for attempt in range(HF_MAX_ATTEMPTS):
        response = requests.post(
            HF_FINBERT_URL,
            headers=headers,
            json=body,
            timeout=120,
        )
        if response.status_code == 503:
            last_error = response.text or "model is loading"
            wait = HF_RETRY_BASE_SEC * (attempt + 1)
            time.sleep(wait)
            continue
        if response.status_code >= 400:
            raise ValueError(
                f"Hugging Face API error {response.status_code}: {response.text}",
            )
        data = response.json()
        items = _unwrap_classification(data)
        if not items:
            raise ValueError(f"could not parse FinBERT response: {data!r}")
        return panic_score_from_finbert_probs(items)
    raise ValueError(f"FinBERT unavailable after retries: {last_error}")


def fetch_and_score_news(db: Session) -> None:
    hf_token = _require_env("HUGGINGFACE_TOKEN")
    headlines = fetch_general_headlines()
    line_scores: list[float] = []
    for headline in headlines:
        line_scores.append(score_headline_finbert(headline, hf_token))
    panic_score = round(sum(line_scores) / len(line_scores), 2)
    recorded_at = datetime.now(timezone.utc)
    top_headline = headlines[0]
    if len(top_headline) > 2000:
        top_headline = top_headline[:2000]
    record = SentimentHistory(
        panic_score=panic_score,
        top_headline=top_headline,
        timestamp=recorded_at,
    )
    db.add(record)
    db.commit()
    payload = {
        "panic_score": panic_score,
        "headlines": headlines,
        "timestamp": recorded_at.timestamp(),
    }
    redis_client.setex("current_sentiment", 900, json.dumps(payload))


@app.get("/api/sentiment")
def get_sentiment(
    _background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict:
    cached = redis_client.get("current_sentiment")
    if cached is not None:
        return json.loads(cached)
    try:
        fetch_and_score_news(db)
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    fresh = redis_client.get("current_sentiment")
    if fresh is None:
        raise HTTPException(
            status_code=500,
            detail="failed to persist sentiment after refresh",
        )
    return json.loads(fresh)


@app.get("/api/history", response_model=list[SentimentHistoryRead])
def get_history(db: Session = Depends(get_db)):
    rows = db.scalars(
        select(SentimentHistory).order_by(SentimentHistory.timestamp.asc()),
    ).all()
    return rows
