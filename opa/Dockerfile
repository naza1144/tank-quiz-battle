FROM openpolicyagent/opa:latest-static

WORKDIR /app
COPY policies /policies

EXPOSE 8181

CMD ["run", "--server", "--log-level", "info", "--addr", "0.0.0.0:8181", "/policies"]
