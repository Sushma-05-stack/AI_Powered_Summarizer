const axios = require('axios');
const cheerio = require('cheerio');

async function extractTextFromURL(url) {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      maxContentLength: 5 * 1024 * 1024
    });

    const $ = cheerio.load(response.data);

    // Remove unwanted elements
    $('script, style, nav, footer, header, aside, .ad, .advertisement, .sidebar, iframe, noscript').remove();

    // Extract article content
    let text = '';
    const articleSelectors = ['article', 'main', '.article-content', '.post-content', '.entry-content', '#content', '.content'];
    
    for (const selector of articleSelectors) {
      if ($(selector).length) {
        text = $(selector).text();
        break;
      }
    }

    if (!text || text.length < 100) {
      text = $('body').text();
    }

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();

    const title = $('title').text() || $('h1').first().text() || 'Article';
    const description = $('meta[name="description"]').attr('content') || '';

    if (text.length < 50) {
      throw new Error('Could not extract meaningful content from this URL. The page may require JavaScript or be behind a paywall.');
    }

    return {
      text,
      title: title.trim(),
      description: description.trim(),
      url,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      contentLength: text.length
    };
  } catch (err) {
    if (err.code === 'ENOTFOUND') throw new Error('URL not found. Please check the URL and try again.');
    if (err.code === 'ETIMEDOUT') throw new Error('Request timed out. The website is taking too long to respond.');
    if (err.response?.status === 403) throw new Error('Access denied. This website blocks automated requests.');
    if (err.response?.status === 404) throw new Error('Page not found (404). Please check the URL.');
    throw err;
  }
}

module.exports = { extractTextFromURL };
