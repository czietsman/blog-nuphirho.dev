/* nuphirho.dev -- home.js
 * Renders the post listing on the home page.
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

  function renderTags(tags) {
    if (!tags || tags.length === 0) return '';
    return '<span class="tags">' +
      tags.map(function (tag) {
        return '<span class="tag">' + escapeHtml(tag.name) + '</span>';
      }).join('') +
      '</span>';
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderPost(node) {
    return '<article class="post-item">' +
      '<h2 class="post-item-title">' +
        '<a href="post.html?slug=' + encodeURIComponent(node.slug) + '">' +
          escapeHtml(node.title) +
        '</a>' +
      '</h2>' +
      '<div class="post-item-meta">' +
        '<time datetime="' + node.publishedAt + '">' + formatDate(node.publishedAt) + '</time>' +
        renderTags(node.tags) +
      '</div>' +
      (node.brief
        ? '<p class="post-item-excerpt">' + escapeHtml(node.brief) + '</p>'
        : '') +
    '</article>';
  }

  function renderSkeleton() {
    var items = '';
    for (var i = 0; i < 3; i++) {
      items +=
        '<div class="post-item" aria-hidden="true">' +
          '<div class="skeleton skeleton-title"></div>' +
          '<div class="skeleton skeleton-meta"></div>' +
          '<div class="skeleton skeleton-text"></div>' +
          '<div class="skeleton skeleton-text-short"></div>' +
        '</div>';
    }
    return items;
  }

  function renderError(message) {
    return '<div class="error-state" role="alert">' +
      '<p class="error-heading">Something went wrong</p>' +
      '<p>' + escapeHtml(message) + '</p>' +
      '<button class="retry-button" onclick="window.location.reload()">Try again</button>' +
    '</div>';
  }

  function renderEmpty() {
    return '<div class="empty-state">' +
      '<p>No posts published yet. Check back soon.</p>' +
    '</div>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('post-list');
    if (!container) return;

    // Show loading skeleton
    container.innerHTML = renderSkeleton();

    window.nuphirhoApi.fetchPosts(20).then(function (result) {
      var edges = result.edges;
      if (!edges || edges.length === 0) {
        container.innerHTML = renderEmpty();
        return;
      }

      var html = edges.map(function (edge) {
        return renderPost(edge.node);
      }).join('');

      container.innerHTML = html;
    }).catch(function (err) {
      container.innerHTML = renderError(err.message || 'Failed to load posts.');
    });
  });
})();
