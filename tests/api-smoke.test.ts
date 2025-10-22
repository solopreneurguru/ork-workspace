/**
 * api-smoke.test.ts
 *
 * Backend API smoke tests using Supertest
 *
 * Tests:
 * - Health endpoint responds
 * - Root endpoint returns API info
 * - Auth endpoints exist (if auth enabled)
 * - Subscription endpoints exist (if monetization enabled)
 *
 * Usage:
 *   API_BASE_URL=http://localhost:3000 npx jest tests/api-smoke.test.ts
 */

import request from 'supertest';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

describe('Backend API Smoke Tests', () => {
  describe('Health Check', () => {
    it('should return 200 from /health endpoint', async () => {
      const response = await request(API_BASE_URL)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('healthy');
    });

    it('should include service info in health response', async () => {
      const response = await request(API_BASE_URL)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('service');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Root Endpoint', () => {
    it('should return 200 from / endpoint', async () => {
      const response = await request(API_BASE_URL)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('version');
    });

    it('should list available endpoints', async () => {
      const response = await request(API_BASE_URL)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('API Endpoints', () => {
    it('should respond to /api endpoint', async () => {
      const response = await request(API_BASE_URL)
        .get('/api')
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  // Optional: Auth endpoints (if auth is enabled in BuildSpec)
  describe.skip('Auth Endpoints', () => {
    it('should have /api/auth/signup endpoint', async () => {
      await request(API_BASE_URL)
        .post('/api/auth/signup')
        .expect((res) => {
          // Accept 200, 400, 401, or 405 (endpoint exists)
          expect([200, 400, 401, 405]).toContain(res.status);
        });
    });

    it('should have /api/auth/login endpoint', async () => {
      await request(API_BASE_URL)
        .post('/api/auth/login')
        .expect((res) => {
          expect([200, 400, 401, 405]).toContain(res.status);
        });
    });
  });

  // Optional: Subscription endpoints (if monetization is enabled)
  describe.skip('Subscription Endpoints', () => {
    it('should have /api/subscription endpoint', async () => {
      await request(API_BASE_URL)
        .get('/api/subscription')
        .expect((res) => {
          expect([200, 401]).toContain(res.status);
        });
    });
  });
});
