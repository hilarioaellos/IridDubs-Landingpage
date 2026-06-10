const http = require("http");
const fs = require("fs");
const path = require("path");
const { URLSearchParams } = require("url");

const rootDir = __dirname;
const port = Number(process.env.PORT || 3000);
const maxBodyBytes = 1024 * 1024;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let body = "";

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        reject(new Error("request_too_large"));
        req.destroy();
        return;
      }
      body += chunk;
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function parseContactPayload(req, body) {
  const contentType = req.headers["content-type"] || "";

  if (contentType.includes("application/json")) {
    return JSON.parse(body || "{}");
  }

  const params = new URLSearchParams(body);
  return Object.fromEntries(params.entries());
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function handleContact(req, res) {
  try {
    const body = await readRequestBody(req);
    const payload = parseContactPayload(req, body);
    const name = String(payload.nombre || "").trim();
    const email = String(payload.email || "").trim();
    const message = String(payload.mensaje || "").trim();

    if (!name || !email || !message) {
      sendJson(res, 400, { ok: false, message: "Completa nombre, email y mensaje." });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      sendJson(res, 400, { ok: false, message: "Escribe un email valido." });
      return;
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.CONTACT_FROM_EMAIL;
    const toEmail = process.env.CONTACT_TO_EMAIL;

    if (!apiKey || !fromEmail || !toEmail) {
      sendJson(res, 503, {
        ok: false,
        message: "El formulario aun no tiene configuradas las variables de email."
      });
      return;
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: email,
        subject: `Nuevo mensaje de ${name} desde irisdubs.com`,
        html: `
          <h2>Nuevo mensaje desde la landing de Iris Dubs</h2>
          <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Mensaje:</strong></p>
          <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
        `
      })
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Resend error:", errorText);
      sendJson(res, 502, {
        ok: false,
        message: "No se pudo enviar el mensaje. Intenta nuevamente."
      });
      return;
    }

    sendJson(res, 200, { ok: true, message: "Mensaje enviado. Gracias por escribir." });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { ok: false, message: "Ocurrio un error al enviar el mensaje." });
  }
}

function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const cleanPath = decodeURIComponent(requestUrl.pathname);
  const relativePath = cleanPath === "/" ? "index.html" : cleanPath.replace(/^\/+/, "");
  const filePath = path.resolve(rootDir, relativePath);

  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      fs.readFile(path.join(rootDir, "index.html"), (fallbackError, fallbackContent) => {
        if (fallbackError) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, { "Content-Type": contentTypes[".html"] });
        res.end(fallbackContent);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream"
    });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/contact") {
    handleContact(req, res);
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    serveStatic(req, res);
    return;
  }

  res.writeHead(405);
  res.end("Method not allowed");
});

server.listen(port, () => {
  console.log(`Iris Dubs landing listening on port ${port}`);
});
