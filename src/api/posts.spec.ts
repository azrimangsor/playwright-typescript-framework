import { test, expect } from '../utils/fixtures';

test.describe('JSONPlaceholder posts (read-only)', () => {
  test('[P1] ZEPHYR-TODO-API-001 - retrieves a post', {
    tag: ['@smoke', '@regression'],
  }, async ({ request, testData }) => {
    const response = await request.get(`/posts/${testData.api.postId}`);

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(await response.json()).toEqual({
      id: testData.api.postId,
      userId: testData.api.userId,
      title: expect.any(String),
      body: expect.any(String),
    });
  });

  test('[P2] ZEPHYR-TODO-API-002 - filters posts by user', {
    tag: '@regression',
  }, async ({ request, testData }) => {
    const response = await request.get('/posts', {
      params: { userId: testData.api.userId },
    });

    expect(response.status()).toBe(200);
    const posts: unknown = await response.json();
    expect(Array.isArray(posts)).toBe(true);
    if (!Array.isArray(posts)) {
      throw new Error('Expected the posts endpoint to return an array');
    }
    expect(posts.length).toBeGreaterThan(0);
    for (const post of posts) {
      expect(post).toEqual({
        id: expect.any(Number),
        userId: testData.api.userId,
        title: expect.any(String),
        body: expect.any(String),
      });
    }
  });

  test('[P3] ZEPHYR-TODO-API-003 - returns not found for a missing post', {
    tag: '@regression',
  }, async ({ request, testData }) => {
    const response = await request.get(`/posts/${testData.api.missingPostId}`);

    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({});
  });
});
