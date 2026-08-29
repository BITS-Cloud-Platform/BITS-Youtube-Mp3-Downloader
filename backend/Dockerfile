# Stage 1: Build dependencies
FROM python:3.12-slim@sha256:57cd7c3a7a273101a6485ba99423ee568157882804b1124b4dd04266317710de AS builder

RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Deno for yt-dlp anti-bot - with retry and fallback to GitHub release
RUN curl -fsSL --retry 5 --retry-delay 10 --retry-all-errors https://deno.land/install.sh | DENO_INSTALL=/root/.deno sh || \
    (echo "deno.land 503, fallback to GitHub release..." && \
     curl -fsSL --retry 5 --retry-delay 10 -o /tmp/deno.zip https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip && \
     mkdir -p /root/.deno/bin && unzip /tmp/deno.zip -d /root/.deno/bin && chmod +x /root/.deno/bin/deno && rm /tmp/deno.zip) && \
    ls -lh /root/.deno/bin/deno && /root/.deno/bin/deno --version

WORKDIR /app

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip pip install --no-cache-dir -r requirements.txt

COPY . .

# Stage 2: Production runtime
FROM python:3.12-slim@sha256:57cd7c3a7a273101a6485ba99423ee568157882804b1124b4dd04266317710de

RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# yt-dlp config: enable EJS JS-challenge solver (needs deno, copied below)
RUN mkdir -p /root/.config/yt-dlp
COPY yt-dlp.conf /root/.config/yt-dlp/config

# Copy Deno from builder
COPY --from=builder /root/.deno/bin/deno /usr/local/bin/deno
# Copy Python packages
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
# Copy binaries
COPY --from=builder /usr/local/bin /usr/local/bin
# Copy application code
COPY --from=builder /app .

ENV PATH="/usr/local/bin:${PATH}"

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
