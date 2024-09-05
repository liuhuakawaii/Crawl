chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "scrapeMultipleUrls") {
    scrapeUrls(request.urls).then(data => {
      sendResponse({ success: true, data: data });
    }).catch(error => {
      console.error(error);
      sendResponse({ success: false, error: error.message });
    });
    return true;  // Indicates that the response is sent asynchronously
  }
});

async function scrapeUrls(urls) {
  let results = [];
  for (let url of urls) {
    try {
      let result = await scrapeUrl(url);
      results.push(result);
    } catch (error) {
      console.error(`Error scraping ${url}: ${error.message}`);
      results.push({ error: error.message, url: url });
    }
  }
  return results;
}

async function scrapeUrl(url) {
  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url: url, active: false }, function (tab) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: scrapeData,
      }, (injectionResults) => {
        for (const frameResult of injectionResults) {
          if (frameResult.result) {
            resolve(frameResult.result);
          }
        }
        chrome.tabs.remove(tab.id);
        reject(new Error('Failed to scrape data'));
      });
    });
  });
}

function scrapeData() {
  const url = window.location.href;
  if (url.includes("youtube.com")) {
    return scrapeYouTube();
  } else if (url.includes("twitter.com")) {
    return scrapeTwitter();
  } else if (url.includes("facebook.com")) {
    return scrapeFacebook();
  }
  return null;
}

function scrapeYouTube() {
  const title = document.querySelector('h1.title')?.innerText;
  const views = document.querySelector('span.view-count')?.innerText;
  const likes = document.querySelector('yt-formatted-string#text.ytd-toggle-button-renderer')?.getAttribute('aria-label');
  return { site: 'YouTube', title, views, likes };
}

function scrapeTwitter() {
  const tweet = document.querySelector('div[data-testid="tweetText"]')?.innerText;
  const likes = document.querySelector('div[data-testid="like"]')?.getAttribute('aria-label');
  const retweets = document.querySelector('div[data-testid="retweet"]')?.getAttribute('aria-label');
  return { site: 'Twitter', tweet, likes, retweets };
}

function scrapeFacebook() {
  const post = document.querySelector('div[data-ad-preview="message"]')?.innerText;
  const likes = document.querySelector('span[data-testid="like_count"]')?.innerText;
  const comments = document.querySelector('span[data-testid="comment_count"]')?.innerText;
  return { site: 'Facebook', post, likes, comments };
}