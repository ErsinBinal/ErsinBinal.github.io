import { env, exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

const WORKER_URL = 'https://convivium-oracle.test';
const ALLOWED_ORIGIN = 'http://localhost:8000';

const workerFetch = (path = '/', init = {}) => exports.default.fetch(
  new Request(`${WORKER_URL}${path}`, init)
);

const apiHeaders = (extra = {}) => ({
  Origin: ALLOWED_ORIGIN,
  'CF-Connecting-IP': `198.51.100.${Math.floor(Math.random() * 200) + 1}`,
  'Content-Type': 'application/json',
  ...extra
});

describe('RequestRateLimiter', () => {
  it('persists a bucket limit and isolates different actors', async () => {
    const actorA = env.REQUEST_RATE_LIMITER.getByName(`actor-a-${crypto.randomUUID()}`);
    const actorB = env.REQUEST_RATE_LIMITER.getByName(`actor-b-${crypto.randomUUID()}`);

    expect(await actorA.check('oracle', 2, 60_000)).toMatchObject({ allowed: true, remaining: 1 });
    expect(await actorA.check('oracle', 2, 60_000)).toMatchObject({ allowed: true, remaining: 0 });
    expect(await actorA.check('oracle', 2, 60_000)).toMatchObject({ allowed: false, remaining: 0 });
    expect(await actorB.check('oracle', 2, 60_000)).toMatchObject({ allowed: true, remaining: 1 });
  });
});

describe('Oracle Worker HTTP boundary', () => {
  it('exposes a no-store health response with version metadata', async () => {
    const response = await workerFetch('/health');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(body).toMatchObject({ status: 'ok', service: 'convivium-oracle' });
    expect(typeof body.version.id).toBe('string');
  });

  it('answers allowed CORS preflight and permits Authorization', async () => {
    const response = await workerFetch('/', {
      method: 'OPTIONS',
      headers: { Origin: ALLOWED_ORIGIN }
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED_ORIGIN);
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
  });

  it('rejects an untrusted origin before processing the request', async () => {
    const response = await workerFetch('/', {
      method: 'POST',
      headers: apiHeaders({ Origin: 'https://attacker.example' }),
      body: JSON.stringify({ question: 'test' })
    });

    expect(response.status).toBe(403);
  });

  it('requires application/json', async () => {
    const response = await workerFetch('/', {
      method: 'POST',
      headers: apiHeaders({ 'Content-Type': 'text/plain' }),
      body: 'test'
    });

    expect(response.status).toBe(415);
  });

  it('rejects a streamed body above the byte limit', async () => {
    const response = await workerFetch('/', {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ question: 'x'.repeat(5000) })
    });

    expect(response.status).toBe(413);
  });

  it('rejects malformed JSON', async () => {
    const response = await workerFetch('/', {
      method: 'POST',
      headers: apiHeaders(),
      body: '{'
    });

    expect(response.status).toBe(400);
  });

  it('returns 429 and Retry-After when the persistent quota is exhausted', async () => {
    const headers = apiHeaders({
      'CF-Connecting-IP': '198.51.100.250',
      'Content-Type': 'text/plain'
    });
    let response;
    for (let index = 0; index < 13; index += 1) {
      response = await workerFetch('/', { method: 'POST', headers, body: 'test' });
    }

    expect(response.status).toBe(429);
    expect(Number(response.headers.get('Retry-After'))).toBeGreaterThan(0);
  });

  it('rejects profile enrichment without a Supabase access token', async () => {
    const response = await workerFetch('/enrich-profile', {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ first_name: 'Ada', last_name: 'Lovelace' })
    });

    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toBe('Bearer');
  });

  it('restricts beacon to safe methods', async () => {
    const response = await workerFetch('/beacon', {
      method: 'POST',
      headers: { 'CF-Connecting-IP': '203.0.113.10' }
    });

    expect(response.status).toBe(405);
  });

  it('returns the pixel for malformed and unknown beacon contexts without provider work', async () => {
    const malformed = await workerFetch('/beacon?h=bad%2Fhost&p=javascript%3A', {
      headers: { 'CF-Connecting-IP': '203.0.113.11' }
    });
    const unknown = await workerFetch('/beacon?h=clone.example&p=https%3A&u=https%3A%2F%2Fclone.example%2Fcopy%3Ftoken%3Dsecret', {
      headers: { 'CF-Connecting-IP': '203.0.113.12' }
    });

    expect(malformed.status).toBe(200);
    expect(malformed.headers.get('Content-Type')).toBe('image/gif');
    expect(unknown.status).toBe(200);
    expect(unknown.headers.get('Content-Type')).toBe('image/gif');
  });

  it('returns 404 for unknown routes', async () => {
    const response = await workerFetch('/unknown');
    expect(response.status).toBe(404);
  });
});
