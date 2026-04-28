FROM python:3.11-slim

# Force pip to NEVER use cache, which is the #1 cause of OOM kills on Hugging Face
ENV PIP_NO_CACHE_DIR=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 user
WORKDIR /app
RUN mkdir -p known_faces pending_faces profile_photos static templates

# Copy requirements
COPY --chown=user requirements.txt .

# -----------------------------------------------------------------------------
# THE FIX: Split the pip install into steps and force face-recognition to ignore
# dlib dependency compilation!
# -----------------------------------------------------------------------------

# Step 1: Install PyTorch (The heaviest package)
RUN pip install --upgrade pip && \
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Step 2: Install Ultralytics and OpenCV (Heavy image processing)
RUN pip install ultralytics==8.4.7 opencv-python==4.13.0.90 opencv-contrib-python==4.13.0.90

# Step 3: Install the rest of the requirements (Flask, dlib-bin, etc.)
RUN pip install -r requirements.txt

# Step 4: Install face-recognition WITHOUT triggering dlib source compilation
RUN pip install face-recognition==1.3.0 --no-deps

# -----------------------------------------------------------------------------

# Copy application
COPY --chown=user . .
RUN chown -R user:user /app

USER user
EXPOSE 7860
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "--timeout", "120", "run:app"]
