/**
 * Luke Young Portfolio — résumé sync
 *
 * Reads the live, editable Google Doc résumé and returns it as JSON so the
 * portfolio site (thelukester.net) can render it directly on the page —
 * no iframe, and no manual copy/paste when the résumé changes.
 *
 * Deployment: see README.md in this folder for step-by-step instructions.
 *
 * The Doc uses a table for layout (a two-column résumé template), so this
 * walks the whole document tree — not just top-level paragraphs — including
 * into every table cell, in reading order (row by row, left cell then right
 * cell within each row).
 *
 * Confirmed structure (from a real debugDump run against the live Doc):
 *   - Section headings are paragraphs whose text is exactly one of: Summary,
 *     Experience, Education, Skills, Interests (case-insensitive). There's no
 *     literal "Contact"/"Skills" heading in the sidebar — that content is
 *     detected automatically by shape instead (see below).
 *   - Inside Experience/Education, each entry is TWO consecutive heading
 *     paragraphs — company/school name, then job title/degree — followed by
 *     a dates line (contains a 4-digit year) and then the description.
 *   - The sidebar (no heading) has, in order: email, a "website | LinkedIn"
 *     line, a phone number, then four skill categories each followed by
 *     "Label: value, value, ..." lines. LinkedIn is a hyperlink on the word
 *     "LinkedIn", not visible URL text, so real link URLs are read directly
 *     off the text rather than guessed from what's on screen.
 *
 * If your Doc's content changes shape (e.g. you restructure the sidebar),
 * run `debugDump()` (bottom of this file), check View > Logs, and adjust the
 * rules below to match — it prints every paragraph and any link URLs found.
 */

var DOC_ID = '1LvTQ4WgiWH1Xbu-ibSoj_SDjpI465uLUam5TP9wan9k';

var SECTION_NAMES = ['summary', 'experience', 'education', 'skills', 'interests', 'contact'];

function doGet(e) {
  var data = buildResumeData();
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Recursively walks a container (document body, table cell, etc.) and
 * returns a flat, ordered list of { heading, text, links } for every
 * paragraph and list item found, descending into tables (and tables nested
 * inside tables). `links` is every hyperlink URL attached to any run of text
 * within that paragraph.
 */
function collectParagraphs(container) {
  var out = [];
  var n = container.getNumChildren();

  for (var i = 0; i < n; i++) {
    var child = container.getChild(i);
    var type = child.getType();

    if (type === DocumentApp.ElementType.PARAGRAPH || type === DocumentApp.ElementType.LIST_ITEM) {
      var el = type === DocumentApp.ElementType.PARAGRAPH ? child.asParagraph() : child.asListItem();
      var text = el.getText().trim();
      if (text) out.push({ heading: el.getHeading(), text: text, links: extractLinks(el) });
    } else if (type === DocumentApp.ElementType.TABLE) {
      var table = child.asTable();
      for (var r = 0; r < table.getNumRows(); r++) {
        var row = table.getRow(r);
        for (var c = 0; c < row.getNumCells(); c++) {
          out = out.concat(collectParagraphs(row.getCell(c)));
        }
      }
    } else if (typeof child.getNumChildren === 'function') {
      out = out.concat(collectParagraphs(child));
    }
  }

  return out;
}

function extractLinks(paragraphOrListItem) {
  var links = [];
  var n = paragraphOrListItem.getNumChildren();
  for (var i = 0; i < n; i++) {
    var child = paragraphOrListItem.getChild(i);
    if (child.getType() === DocumentApp.ElementType.TEXT) {
      var url = child.asText().getLinkUrl();
      if (url) links.push(url);
    }
  }
  return links;
}

function looksLikePhone(text) {
  return /\d{3}\D{0,3}\d{3}\D{0,3}\d{4}/.test(text);
}

// True if the line is *only* a phone number (digits + separators, no words) —
// as opposed to a line that merely contains a phone-shaped substring.
function isPhoneOnlyLine(text) {
  return looksLikePhone(text) && text.replace(/[\d\s•\-.()+]/g, '').length === 0;
}

function applyContactPiece(contact, piece) {
  if (!piece) return;
  if (piece.indexOf('@') !== -1) {
    contact.email = piece.replace(/^mailto:/i, '');
  } else if (piece.toLowerCase().indexOf('linkedin') !== -1) {
    if (!contact.linkedin && piece.indexOf('http') === 0) contact.linkedin = piece;
    // otherwise it's the bare word "LinkedIn" with no URL info in the plain
    // text — leave it for the link-based detection below to fill in.
  } else if (looksLikePhone(piece)) {
    contact.phone = piece;
  } else if (/\.[a-z]{2,}/i.test(piece)) {
    // Looks like it contains a domain (has a dot followed by letters).
    contact.website = piece.replace(/^https?:\/\//, '');
  }
  // else: an unrecognized short label (e.g. a stray category header) — ignore.
}

function applyContactLinks(contact, links) {
  links.forEach(function (url) {
    if (/linkedin\.com/i.test(url)) {
      contact.linkedin = url;
    } else if (/^mailto:/i.test(url)) {
      contact.email = url.replace(/^mailto:/i, '');
    } else if (!contact.website) {
      contact.website = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }
  });
}

function buildResumeData() {
  var doc = DocumentApp.openById(DOC_ID);
  var paragraphs = collectParagraphs(doc.getBody());

  var result = {
    summary: '',
    experience: [],
    education: [],
    skills: [],
    interests: '',
    contact: { email: '', phone: '', website: '', linkedin: '' },
    updated: new Date().toISOString(),
  };

  var currentSection = null;
  var currentEntry = null;
  var lastOrg = '';

  for (var i = 0; i < paragraphs.length; i++) {
    var text = paragraphs[i].text;
    var links = paragraphs[i].links || [];
    var isHeading = paragraphs[i].heading !== DocumentApp.ParagraphHeading.NORMAL;
    var normalized = text.toLowerCase().replace(/[:\s]+$/, '');

    // Explicit section heading?
    if (SECTION_NAMES.indexOf(normalized) !== -1) {
      currentSection = normalized;
      currentEntry = null;
      lastOrg = '';
      continue;
    }

    // Sidebar content (skills/contact) often has no literal heading above it —
    // detect it by shape instead. Eligible any time we're not mid-way through
    // a structured Experience/Education/Skills block (those only end at an
    // explicit heading above).
    if (!currentSection || currentSection === 'summary' || currentSection === 'interests' || currentSection === 'contact') {
      var looksLikeSkillLine = /^[^:]{2,40}:\s+\S/.test(text);
      var looksLikeContactLine = text.indexOf('@') !== -1
        || links.some(function (u) { return /linkedin\.com|^mailto:/i.test(u); })
        || looksLikePhone(text);

      if (looksLikeContactLine) {
        currentSection = 'contact';
      } else if (looksLikeSkillLine) {
        currentSection = 'skills';
      } else if (!currentSection) {
        continue; // nothing recognizable yet (e.g. name/title lines up top)
      }
    }

    if (currentSection === 'summary' || currentSection === 'interests') {
      result[currentSection] = result[currentSection] ? result[currentSection] + ' ' + text : text;
      continue;
    }

    if (currentSection === 'experience' || currentSection === 'education') {
      var looksLikeDates = /\d{4}/.test(text) && text.length < 60;

      if (isHeading && !looksLikeDates) {
        // Company/school name and job title/degree are each their own heading
        // line, back to back. Pair this one with the next if it's also a
        // (non-date) heading; otherwise treat this single line as the title.
        var next = paragraphs[i + 1];
        var nextIsPairedHeading = next
          && next.heading !== DocumentApp.ParagraphHeading.NORMAL
          && !(/\d{4}/.test(next.text) && next.text.length < 60);

        if (nextIsPairedHeading) {
          currentEntry = { title: next.text, org: text, dates: '', description: '' };
          lastOrg = text;
          i++; // consumed the title line already
        } else {
          // A title-only heading with no company/school line of its own —
          // e.g. a second role at the same employer, where the company name
          // only appears once above the first role. Inherit it.
          currentEntry = { title: text, org: lastOrg, dates: '', description: '' };
        }
        result[currentSection].push(currentEntry);
      } else if (currentEntry && looksLikeDates && !currentEntry.dates) {
        currentEntry.dates = text;
      } else if (currentEntry) {
        currentEntry.description = currentEntry.description ? currentEntry.description + ' ' + text : text;
      }
      continue;
    }

    if (currentSection === 'skills') {
      var colonIndex = text.indexOf(':');
      if (colonIndex > -1) {
        result.skills.push({
          label: text.slice(0, colonIndex).trim(),
          value: text.slice(colonIndex + 1).trim(),
        });
      }
      continue;
    }

    if (currentSection === 'contact') {
      // Real hyperlink targets first (most reliable — visible text like the
      // word "LinkedIn" doesn't tell us the actual URL), then also try the
      // visible text so any un-linked piece (e.g. a plain-text domain) still
      // gets picked up. applyContactPiece never overwrites with junk — it
      // only touches a field when the piece actually looks like that kind of
      // value.
      applyContactLinks(result.contact, links);
      if (isPhoneOnlyLine(text)) {
        result.contact.phone = text;
      } else {
        text.split('|').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (piece) {
          applyContactPiece(result.contact, piece);
        });
      }
      continue;
    }
  }

  // "LinkedIn" appears in the sidebar as plain text with no actual hyperlink,
  // so there's no URL anywhere in the Doc to extract for it. Fall back to the
  // known profile URL if parsing didn't find a real one (if you ever turn
  // "LinkedIn" into a real hyperlink in the Doc, that will take precedence —
  // this only fills in when the field is still empty).
  if (!result.contact.linkedin) {
    result.contact.linkedin = 'https://www.linkedin.com/in/the-lukester/';
  }

  return result;
}

/**
 * Run this manually from the Apps Script editor (select debugDump in the
 * function dropdown, then Run), then check View > Logs. It prints every
 * paragraph found anywhere in the Doc — including inside tables — along with
 * its heading style and any hyperlink URLs, followed by the JSON that would
 * be returned.
 */
function debugDump() {
  var doc = DocumentApp.openById(DOC_ID);
  var paragraphs = collectParagraphs(doc.getBody());
  paragraphs.forEach(function (p) {
    Logger.log('[%s] %s %s', p.heading, p.text, p.links.length ? JSON.stringify(p.links) : '');
  });
  Logger.log('---');
  Logger.log(JSON.stringify(buildResumeData(), null, 2));
}
