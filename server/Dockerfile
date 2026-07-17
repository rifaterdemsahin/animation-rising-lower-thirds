# Build stage — compile the Go binary.
FROM golang:1.26-bookworm AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/server .

# Runtime stage — headless Chromium (for chromedp) + the Go binary.
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium ca-certificates fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

ENV CHROMEDP_EXEC_PATH=/usr/bin/chromium
ENV PORT=8080

COPY --from=build /out/server /usr/local/bin/server

EXPOSE 8080
CMD ["/usr/local/bin/server"]
