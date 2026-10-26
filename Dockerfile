FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt && useradd --uid 10001 --create-home app
COPY --chown=app:app . /app/
RUN mkdir -p /app/var/static /app/var/media /app/var/cache && chown -R app:app /app/var && chmod +x /app/deploy/entrypoint.sh
USER app
EXPOSE 8000
ENTRYPOINT ["/app/deploy/entrypoint.sh"]
