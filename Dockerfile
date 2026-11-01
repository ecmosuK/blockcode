FROM espressif/idf:v6.1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends espeak-ng ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN . "$IDF_PATH/export.sh" >/dev/null && python -m pip install --no-cache-dir -r requirements.txt

COPY . .

ENV BLOCKCODE_BUILD_CACHE=/tmp/blockcode-build \
    PYTHONUNBUFFERED=1
EXPOSE 10000

CMD ["python", "-m", "gunicorn", "--bind", "0.0.0.0:10000", "--workers", "1", "--worker-class", "gthread", "--threads", "4", "--timeout", "60", "tools.render_app:app"]
