import Fastify from "fastify";

const systemCodes: Record<string, string> = {
  navigation: "NAV-01",
  communications: "COM-02",
  life_support: "LIFE-03",
  engines: "ENG-04",
  deflector_shield: "SHLD-05",
};

const SYSTEMS = Object.keys(systemCodes);

function getRandomSystem(): string {
  return SYSTEMS[Math.floor(Math.random() * SYSTEMS.length)];
}

function buildFastify() {
  const fastify = Fastify();

  const clientSessions: Record<string, { damagedSystem?: string }> = {};

  fastify.get("/status", async (request, reply) => {
    const clientIP = request.ip;
    const damagedSystem = getRandomSystem();

    clientSessions[clientIP] = { damagedSystem };

    return reply.send({ damaged_system: damagedSystem });
  });

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
      return reply
        .status(500)
        .send({ error: "Invalid damaged system stored." });
    }

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

  fastify.post("/teapot", async (_request, reply) => {
    reply.status(418).send("I'm a teapot");
  });

  return fastify;
}

describe("Fastify API tests", () => {
  let fastify: any;

  beforeAll(async () => {
    fastify = buildFastify();
    await fastify.listen({ port: 0 });
  });

  afterAll(async () => {
    await fastify.close();
  });

  test("GET /status returns damaged_system", async () => {
    const response = await fastify.inject({
      method: "GET",
      url: "/status",
    });
    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(SYSTEMS).toContain(json.damaged_system);
  });

  test("GET /repair-bay without prior /status returns 404", async () => {
    // Create a new instance without calling /status first for this IP
    const newFastify = buildFastify();
    await newFastify.listen({ port: 0 });

    const response = await newFastify.inject({
      method: "GET",
      url: "/repair-bay",
    });
    expect(response.statusCode).toBe(404);

    await newFastify.close();
  });

  test("GET /repair-bay returns HTML with code after /status", async () => {
    // First call /status to set session
    const statusResponse = await fastify.inject({
      method: "GET",
      url: "/status",
    });

    const damagedSystem = statusResponse.json().damaged_system;
    const expectedCode = systemCodes[damagedSystem];

    const repairResponse = await fastify.inject({
      method: "GET",
      url: "/repair-bay",
    });

    expect(repairResponse.statusCode).toBe(200);
    expect(repairResponse.headers["content-type"]).toMatch(/text\/html/);
    expect(repairResponse.body).toContain(
      `<div class="anchor-point">${expectedCode}</div>`,
    );
  });

  test("POST /teapot returns 418", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/teapot",
    });
    expect(response.statusCode).toBe(418);
    expect(response.body).toBe("I'm a teapot");
  });
});
