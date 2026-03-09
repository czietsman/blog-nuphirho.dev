/* nuphirho.dev -- preview.js
 * Local markdown preview. Parses frontmatter and converts
 * markdown to HTML for previewing posts before publishing.
 */
(function () {
  'use strict';

  var container = document.getElementById('post-content');
  var dropzone = document.getElementById('dropzone');
  var fileInput = document.getElementById('file-input');

  // Dropzone interaction
  dropzone.addEventListener('click', function () { fileInput.click(); });
  dropzone.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropzone.classList.add('preview-dropzone-active');
  });
  dropzone.addEventListener('dragleave', function () {
    dropzone.classList.remove('preview-dropzone-active');
  });
  dropzone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropzone.classList.remove('preview-dropzone-active');
    var file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
  fileInput.addEventListener('change', function () {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  function handleFile(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      renderPreview(e.target.result);
    };
    reader.readAsText(file);
  }

  function renderPreview(raw) {
    var parsed = parseFrontmatter(raw);
    var frontmatter = parsed.frontmatter;
    var content = parsed.content;

    // Strip leading H1 if it matches the title (same as pipeline)
    var titlePattern = '# ' + (frontmatter.title || '');
    var lines = content.split('\n');
    if (lines.length > 0 && lines[0].trim() === titlePattern.trim()) {
      lines.shift();
      content = lines.join('\n').replace(/^\n+/, '');
    }

    var html = markdownToHtml(content);
    var title = frontmatter.title || 'Untitled';
    var tags = parseTags(frontmatter.tags);
    var isDraft = frontmatter.draft === 'true' || frontmatter.draft === true;

    document.title = title + ' | nuphirho (preview)';

    container.innerHTML =
      '<header class="post-header">' +
        (isDraft ? '<span class="tag" style="margin-block-end:0.75rem;display:inline-block;background:#d4a017;color:#1a1a1a">DRAFT</span>' : '') +
        '<h1 class="post-title">' + escapeHtml(title) + '</h1>' +
        (frontmatter.subtitle ? '<p style="color:var(--colour-text-secondary);font-size:1.125rem;margin-block-end:0.75rem">' + escapeHtml(frontmatter.subtitle) + '</p>' : '') +
        '<div class="post-meta">' +
          '<time>Preview</time>' +
          renderTags(tags) +
        '</div>' +
      '</header>' +
      '<div class="post-content">' + html + '</div>' +
      '<div style="margin-block-start:2rem;padding-block-start:1rem;border-block-start:1px solid var(--colour-border)">' +
        '<button class="retry-button" onclick="location.reload()">Load another file</button>' +
      '</div>';
  }

  function parseFrontmatter(raw) {
    var frontmatter = {};
    var content = raw;

    if (raw.indexOf('---') === 0) {
      var end = raw.indexOf('\n---', 3);
      if (end !== -1) {
        var fm = raw.substring(3, end).trim();
        content = raw.substring(end + 4).trim();

        fm.split('\n').forEach(function (line) {
          var colon = line.indexOf(':');
          if (colon === -1) return;
          var key = line.substring(0, colon).trim();
          var value = line.substring(colon + 1).trim();
          // Strip surrounding quotes
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          frontmatter[key] = value;
        });
      }
    }

    return { frontmatter: frontmatter, content: content };
  }

  function parseTags(tagString) {
    if (!tagString) return [];
    return tagString.replace(/[\[\]]/g, '').split(',').map(function (t) {
      return t.trim();
    }).filter(function (t) { return t.length > 0; });
  }

  function renderTags(tags) {
    if (tags.length === 0) return '';
    return '<div class="tags">' +
      tags.map(function (tag) {
        return '<span class="tag">' + escapeHtml(tag) + '</span>';
      }).join('') +
      '</div>';
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Minimal markdown to HTML converter
  function markdownToHtml(md) {
    var lines = md.split('\n');
    var html = [];
    var inCodeBlock = false;
    var codeBlockContent = [];
    var inList = false;
    var listType = '';
    var inBlockquote = false;
    var blockquoteContent = [];
    var inTable = false;
    var tableRows = [];
    var paragraph = [];

    function flushParagraph() {
      if (paragraph.length > 0) {
        html.push('<p>' + inlineFormat(paragraph.join('\n')) + '</p>');
        paragraph = [];
      }
    }

    function flushList() {
      if (inList) {
        html.push('</' + listType + '>');
        inList = false;
        listType = '';
      }
    }

    function flushBlockquote() {
      if (inBlockquote) {
        html.push('<blockquote>' + markdownToHtml(blockquoteContent.join('\n')) + '</blockquote>');
        blockquoteContent = [];
        inBlockquote = false;
      }
    }

    function flushTable() {
      if (!inTable) return;
      inTable = false;
      if (tableRows.length < 2) return;

      var headerCells = splitTableRow(tableRows[0]);
      var out = '<table><thead><tr>';
      headerCells.forEach(function (cell) {
        out += '<th>' + inlineFormat(cell.trim()) + '</th>';
      });
      out += '</tr></thead><tbody>';

      for (var i = 2; i < tableRows.length; i++) {
        var cells = splitTableRow(tableRows[i]);
        out += '<tr>';
        cells.forEach(function (cell) {
          out += '<td>' + inlineFormat(cell.trim()) + '</td>';
        });
        out += '</tr>';
      }
      out += '</tbody></table>';
      html.push(out);
      tableRows = [];
    }

    function splitTableRow(row) {
      return row.replace(/^\|/, '').replace(/\|$/, '').split('|');
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      // Fenced code blocks
      if (line.match(/^```/)) {
        if (inCodeBlock) {
          html.push('<pre><code>' + escapeHtml(codeBlockContent.join('\n')) + '</code></pre>');
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          flushParagraph();
          flushList();
          flushBlockquote();
          flushTable();
          inCodeBlock = true;
        }
        continue;
      }
      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // Table rows
      if (line.match(/^\|/)) {
        flushParagraph();
        flushList();
        flushBlockquote();
        if (!inTable) inTable = true;
        tableRows.push(line);
        continue;
      } else {
        flushTable();
      }

      // Blockquotes
      if (line.match(/^>\s?/)) {
        flushParagraph();
        flushList();
        if (!inBlockquote) inBlockquote = true;
        blockquoteContent.push(line.replace(/^>\s?/, ''));
        continue;
      } else {
        flushBlockquote();
      }

      // Blank line
      if (line.trim() === '') {
        flushParagraph();
        flushList();
        continue;
      }

      // Headings
      var headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        flushParagraph();
        flushList();
        var level = headingMatch[1].length;
        html.push('<h' + level + '>' + inlineFormat(headingMatch[2]) + '</h' + level + '>');
        continue;
      }

      // Horizontal rule
      if (line.match(/^(---|\*\*\*|___)\s*$/)) {
        flushParagraph();
        flushList();
        html.push('<hr>');
        continue;
      }

      // Unordered list
      var ulMatch = line.match(/^[\-\*]\s+(.+)$/);
      if (ulMatch) {
        flushParagraph();
        if (!inList || listType !== 'ul') {
          flushList();
          html.push('<ul>');
          inList = true;
          listType = 'ul';
        }
        html.push('<li>' + inlineFormat(ulMatch[1]) + '</li>');
        continue;
      }

      // Ordered list
      var olMatch = line.match(/^\d+\.\s+(.+)$/);
      if (olMatch) {
        flushParagraph();
        if (!inList || listType !== 'ol') {
          flushList();
          html.push('<ol>');
          inList = true;
          listType = 'ol';
        }
        html.push('<li>' + inlineFormat(olMatch[1]) + '</li>');
        continue;
      }

      // Otherwise accumulate as paragraph
      flushList();
      paragraph.push(line);
    }

    // Flush remaining state
    flushParagraph();
    flushList();
    flushBlockquote();
    flushTable();
    if (inCodeBlock) {
      html.push('<pre><code>' + escapeHtml(codeBlockContent.join('\n')) + '</code></pre>');
    }

    return html.join('\n');
  }

  // Inline formatting
  function inlineFormat(text) {
    // Images (before links to avoid conflict)
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
    // Links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    // Bold + italic
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    return text;
  }
})();
