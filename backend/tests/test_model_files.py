"""
ML-03 local verification.

Asserts that every .pkl the RecommenderService loads at startup is present in
the repo. These files are committed to git (the ml/models .gitignore line is
intentionally commented out) so they deploy with the code to Railway.

This is a local check -- it does NOT validate deploy presence; Plan 03's
smoke test hits /health on the live Railway URL for that.
"""
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = REPO_ROOT / "backend" / "ml" / "models"

EXPECTED_MODELS = [
    "tfidf_vectorizer.pkl",
    "tfidf_matrix.pkl",
    "movie_ids.pkl",
    "svd_model.pkl",
    "cf_trainset.pkl",
]


def test_model_dir_exists():
    assert MODEL_DIR.is_dir(), f"Expected model dir at {MODEL_DIR}"


@pytest.mark.parametrize("filename", EXPECTED_MODELS)
def test_model_file_present(filename):
    path = MODEL_DIR / filename
    assert path.is_file(), f"Missing required model artifact: {path}"
    # Sanity: files should be non-empty. The smallest (movie_ids.pkl) is ~1KB in git.
    assert path.stat().st_size > 0, f"Model file is empty: {path}"
