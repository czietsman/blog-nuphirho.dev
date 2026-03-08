/* nuphirho.dev -- post.js
 * Renders a single post on the post page.
 */
(function () {
  'use strict';

  function formatDate(isoString) {
    var date = new Date(isoString);
    var months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getSlugFromUrl() {
    var params = new URLSearchParams(window.location.search);
    return params.get('slug');
  }

  function renderTags(tags) {
    if (!tags || tags.length === 0) return '';
    return '<div class="tags">' +
      tags.map(function (tag) {
        return '<span class="tag">' + escapeHtml(tag.name) + '</span>';
      }).join('') +
      '</div>';
  }

  function renderSkeleton() {
    return '<div aria-hidden="true">' +
      '<div class="skeleton" style="block-size:2.5rem;inline-size:80%;margin-block-end:1rem"></div>' +
      '<div class="skeleton skeleton-meta"></div>' +
      '<div style="margin-block-start:2.5rem">' +
        '<div class="skeleton skeleton-text"></div>' +
        '<div class="skeleton skeleton-text"></div>' +
        '<div class="skeleton skeleton-text"></div>' +
        '<div class="skeleton skeleton-text"></div>' +
        '<div class="skeleton skeleton-text"></div>' +
        '<div class="skeleton skeleton-text"></div>' +
        '<div class="skeleton skeleton-text"></div>' +
        '<div class="skeleton skeleton-text"></div>' +
        '<div class="skeleton skeleton-text-short"></div>' +
      '</div>' +
    '</div>';
  }

  function renderError(message) {
    return '<div class="error-state" role="alert">' +
      '<p class="error-heading">Something went wrong</p>' +
      '<p>' + escapeHtml(message) + '</p>' +
      '<button class="retry-button" onclick="window.location.reload()">Try again</button>' +
    '</div>';
  }

  function renderNotFound() {
    return '<div class="error-state" role="alert">' +
      '<p class="error-heading">Post not found</p>' +
      '<p>The post you are looking for does not exist or may have been removed.</p>' +
      '<a href="/" class="back-link">Back to all posts</a>' +
    '</div>';
  }

  function updateMetaTags(post) {
    var seoTitle = (post.seo && post.seo.title) || post.title;
    var seoDesc = (post.seo && post.seo.description) || post.brief || '';
    var ogImage = (post.ogMetaData && post.ogMetaData.image) ||
                  (post.coverImage && post.coverImage.url) || '';
    var canonical = 'https://blog.nuphirho.dev/' + encodeURIComponent(post.slug);

    document.title = seoTitle + ' | nuphirho';

    setMeta('description', seoDesc);
    setMeta('og:title', seoTitle);
    setMeta('og:description', seoDesc);
    setMeta('og:url', canonical);
    setMeta('og:type', 'article');
    if (ogImage) setMeta('og:image', ogImage);

    var link = document.querySelector('link[rel="canonical"]');
    if (link) link.setAttribute('href', canonical);
  }

  function setMeta(nameOrProp, content) {
    var selector = 'meta[name="' + nameOrProp + '"], meta[property="' + nameOrProp + '"]';
    var el = document.querySelector(selector);
    if (el) {
      el.setAttribute('content', content);
    } else {
      var meta = document.createElement('meta');
      if (nameOrProp.indexOf('og:') === 0) {
        meta.setAttribute('property', nameOrProp);
      } else {
        meta.setAttribute('name', nameOrProp);
      }
      meta.setAttribute('content', content);
      document.head.appendChild(meta);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('post-content');
    if (!container) return;

    var slug = getSlugFromUrl();
    if (!slug) {
      container.innerHTML = renderNotFound();
      return;
    }

    // Show loading skeleton
    container.innerHTML = renderSkeleton();

    window.nuphirhoApi.fetchPost(slug).then(function (post) {
      if (!post) {
        container.innerHTML = renderNotFound();
        return;
      }

      updateMetaTags(post);

      var html =
        '<header class="post-header">' +
          '<h1 class="post-title">' + escapeHtml(post.title) + '</h1>' +
          '<div class="post-meta">' +
            '<time datetime="' + post.publishedAt + '">' + formatDate(post.publishedAt) + '</time>' +
            renderTags(post.tags) +
          '</div>' +
        '</header>' +
        '<div class="post-content">' +
          post.content.html +
        '</div>' +
        '<a href="/" class="back-link">Back to all posts</a>';

      container.innerHTML = html;
    }).catch(function (err) {
      container.innerHTML = renderError(err.message || 'Failed to load post.');
    });
  });
})();
