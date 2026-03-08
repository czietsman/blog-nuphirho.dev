/* nuphirho.dev -- api.js
 * Hashnode GraphQL API client with sessionStorage caching.
 */
(function () {
  'use strict';

  var API_URL = 'https://gql.hashnode.com';
  var PUBLICATION_HOST = 'nuphirho.hashnode.dev';
  var CACHE_PREFIX = 'nuphirho-api-';

  function cacheGet(key) {
    try {
      var raw = sessionStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      var entry = JSON.parse(raw);
      // Cache entries expire after 10 minutes
      if (Date.now() - entry.ts > 10 * 60 * 1000) {
        sessionStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }
      return entry.data;
    } catch (e) {
      return null;
    }
  }

  function cacheSet(key, data) {
    try {
      sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
        ts: Date.now(),
        data: data
      }));
    } catch (e) {
      // sessionStorage full or unavailable; degrade gracefully
    }
  }

  function gqlQuery(query, variables) {
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query, variables: variables })
    })
      .then(function (res) {
        if (!res.ok) {
          throw new Error('API request failed (HTTP ' + res.status + ')');
        }
        return res.json();
      })
      .then(function (json) {
        if (json.errors && json.errors.length > 0) {
          throw new Error(json.errors[0].message || 'GraphQL error');
        }
        return json.data;
      });
  }

  /**
   * Fetch published posts for the publication.
   * Returns an array of post objects.
   */
  function fetchPosts(first, after) {
    first = first || 20;
    var cacheKey = 'posts-' + first + '-' + (after || 'start');
    var cached = cacheGet(cacheKey);
    if (cached) return Promise.resolve(cached);

    var query = [
      'query FetchPosts($host: String!, $first: Int!, $after: String) {',
      '  publication(host: $host) {',
      '    posts(first: $first, after: $after) {',
      '      edges {',
      '        node {',
      '          id',
      '          title',
      '          slug',
      '          brief',
      '          publishedAt',
      '          tags { name slug }',
      '        }',
      '        cursor',
      '      }',
      '      pageInfo { hasNextPage endCursor }',
      '    }',
      '  }',
      '}'
    ].join('\n');

    var variables = { host: PUBLICATION_HOST, first: first };
    if (after) variables.after = after;

    return gqlQuery(query, variables).then(function (data) {
      var result = data.publication.posts;
      cacheSet(cacheKey, result);
      return result;
    });
  }

  /**
   * Fetch a single post by slug.
   * Returns a post object with full HTML content.
   */
  function fetchPost(slug) {
    var cacheKey = 'post-' + slug;
    var cached = cacheGet(cacheKey);
    if (cached) return Promise.resolve(cached);

    var query = [
      'query FetchPost($host: String!, $slug: String!) {',
      '  publication(host: $host) {',
      '    post(slug: $slug) {',
      '      id',
      '      title',
      '      slug',
      '      brief',
      '      publishedAt',
      '      tags { name slug }',
      '      content { html }',
      '      seo { title description }',
      '      ogMetaData { image }',
      '      coverImage { url }',
      '    }',
      '  }',
      '}'
    ].join('\n');

    return gqlQuery(query, { host: PUBLICATION_HOST, slug: slug }).then(function (data) {
      var post = data.publication.post;
      cacheSet(cacheKey, post);
      return post;
    });
  }

  // Expose API functions globally
  window.nuphirhoApi = {
    fetchPosts: fetchPosts,
    fetchPost: fetchPost
  };
})();
