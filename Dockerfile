FROM caddy:alpine
ENV PORT=3000
WORKDIR /srv
COPY . .
EXPOSE 3000
CMD ["caddy", "run", "--config", "/srv/Caddyfile", "--adapter", "caddyfile"]
