FROM python:3.11-slim

# No .pyc files, and unbuffered stdout so container logs appear as they happen
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Every module, not just main.py — the service is split across several files
COPY *.py ./

# Run unprivileged. The signing key is the crown jewel here; a compromised
# process should not be able to rewrite the key it signs with.
RUN useradd --create-home --uid 10001 tokensvc \
    && mkdir -p /keys \
    && chown -R tokensvc:tokensvc /app /keys
USER tokensvc

EXPOSE 8100

CMD ["python", "main.py"]
