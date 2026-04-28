---
title: IdentiFace Server
emoji: 🆔
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
---

# IdentiFace Attendance Server

This is the backend server for the IdentiFace Flutter application.
It handles face recognition, attendance logging, and biometric requests.

## Tech Stack
- Flask
- SQLAlchemy (PostgreSQL via Supabase)
- Supabase Storage (Buckets)
- Face Recognition (dlib/face_recognition)
- YOLOv8 (Object Detection)

## Deployment
Deployed on Hugging Face Spaces using Docker.
Synced automatically from GitHub via GitHub Actions.
