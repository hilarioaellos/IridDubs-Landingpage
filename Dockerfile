FROM caddy:alpine
WORKDIR /srv
COPY . .
EXPOSE 3000
CMD ["caddy", "run", "--config", "/srv/Caddyfile", "--adapter", "caddyfile"]
