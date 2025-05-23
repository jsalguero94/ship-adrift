import Fastify from "fastify";

const fastify = Fastify({ logger: true });

// Session-like store keyed by client IP
const clientSessions: Record<string, { damagedSystem?: string }> = {};

const systemCodes: Record<string, string> = {
  navigation: "NAV-01",
  communications: "COM-02",
  life_support: "LIFE-03",
  engines: "ENG-04",
  deflector_shield: "SHLD-05",
};

// Use these keys to choose random system
const SYSTEMS = Object.keys(systemCodes);

// Helper to pick random system
function getRandomSystem(): string {
  return SYSTEMS[Math.floor(Math.random() * SYSTEMS.length)];
}

// GET /status - generate and store damagedSystem for IP
fastify.get("/status", async (request, reply) => {
  const clientIP = request.ip;
  const damagedSystem = getRandomSystem();

  clientSessions[clientIP] = { damagedSystem };

  return reply.send({ damaged_system: damagedSystem });
});

// GET /repair-bay - return HTML with code for damaged system stored by IP
fastify.get("/repair-bay", async (request, reply) => {
  const clientIP = request.ip;
  const session = clientSessions[clientIP];

  if (!session?.damagedSystem) {
    return reply.status(404).send({
      error:
        "No damaged system found for this client. Please GET /status first.",
    });
  }

  const code = systemCodes[session.damagedSystem];
  if (!code) {
    return reply.status(500).send({ error: "Invalid damaged system stored." });
  }

  // Send HTML with anchor-point div
  reply.type("text/html").send(`
    <!DOCTYPE html>
    <html>
    <head><title>Repair</title></head>
    <body>
      <div class="anchor-point">${code}</div>
    </body>
    </html>
  `);
});

// POST /teapot - respond with HTTP 418
fastify.post("/teapot", async (_request, reply) => {
  reply.status(418).send("I'm a teapot");
});

// Start the Fastify server using Render-compatible settings
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`Server running on http://0.0.0.0:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
