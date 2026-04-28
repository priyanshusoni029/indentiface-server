"""
Face recognition service.
Owns all module-level globals (known_names, encoding matrix, etc.)
Uses sqlite3 directly so it can run in background threads without Flask app context.
"""

import os
import cv2
import sqlite3
import numpy as np
from collections import Counter
from config import Config

# ── Module-level globals shared across all requests ──
known_names:     list  = []
known_encodings: list  = []
known_filenames: list  = []
name_to_image:   dict  = {}
_encoding_matrix       = None   # shape: (N, 128), pre-normalized


def load_data() -> tuple:
    """Read all face encodings from database. Safe to call from any thread."""
    from sqlalchemy import create_engine, text
    names, enc, filenames = [], [], []
    engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)
    try:
        with engine.connect() as conn:
            # Note: We rely on Flask's db.create_all() to create the table structure.
            result = conn.execute(text("SELECT name, filename, encoding FROM face_encodings"))
            for row in result:
                names.append(row[0])
                filenames.append(row[1])
                # row[2] is the encoding BLOB
                enc.append(np.frombuffer(row[2], dtype=np.float64).astype(np.float32))
    except Exception as e:
        print(f"Error loading face encodings: {e}")
    print(f"Loaded {len(names)} known faces from DB")
    return names, enc, filenames


def _rebuild_name_to_image():
    """Mutates name_to_image in-place so all importers see the updated dict."""
    name_to_image.clear()
    for name, fname in zip(known_names, known_filenames):
        if name not in name_to_image:
            name_to_image[name] = fname if '/' in fname else f"{name}/{fname}"


def _rebuild_encoding_matrix():
    global _encoding_matrix
    if known_encodings:
        mat   = np.array(known_encodings, dtype=np.float32)   # (N, 128)
        norms = np.linalg.norm(mat, axis=1, keepdims=True)
        norms[norms == 0] = 1e-10
        _encoding_matrix = mat / norms   # pre-normalized rows
        print(f"Encoding matrix built: {_encoding_matrix.shape}")
    else:
        _encoding_matrix = None


def reload_face_data():
    """Public API — reload all face globals and rebuild the encoding matrix."""
    global known_names, known_encodings, known_filenames
    known_names, known_encodings, known_filenames = load_data()
    _rebuild_name_to_image()
    _rebuild_encoding_matrix()


def recognise_face_vectorized(current_encoding) -> tuple:
    """
    Vectorized cosine similarity — ONE numpy matrix multiply instead of N loops.
    Returns (name, confidence).
    """
    if _encoding_matrix is None or len(_encoding_matrix) == 0:
        return "Unknown", 0.0

    q    = np.array(current_encoding, dtype=np.float32)
    norm = np.linalg.norm(q)
    if norm == 0:
        return "Unknown", 0.0
    q = q / norm

    similarities = _encoding_matrix @ q                         # (N,)
    k        = min(Config.K_NEIGHBORS, len(similarities))
    top_idxs = np.argpartition(similarities, -k)[-k:]
    top_idxs = top_idxs[np.argsort(similarities[top_idxs])[::-1]]

    votes = Counter()
    for idx in top_idxs:
        if float(similarities[idx]) >= Config.COSINE_THRESHOLD:
            votes[known_names[idx]] += 1

    if votes:
        winner, winner_votes = votes.most_common(1)[0]
        if winner_votes >= Config.KNN_VOTE_THRESHOLD:
            return winner, float(similarities[top_idxs[0]])

    best_idx = top_idxs[0]
    best_sim = float(similarities[best_idx])
    if best_sim >= Config.COSINE_THRESHOLD:
        return known_names[best_idx], best_sim

    return "Unknown", best_sim


def resize_for_recognition(img):
    """Downscale to MAX_IMAGE_DIM before face detection (~4-8x speed gain)."""
    h, w = img.shape[:2]
    if max(h, w) <= Config.MAX_IMAGE_DIM:
        return img
    scale = Config.MAX_IMAGE_DIM / max(h, w)
    return cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)