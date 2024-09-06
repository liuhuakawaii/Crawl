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
      // Wait for the page to load
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);

          // Execute the scraping after a short delay
          setTimeout(() => {
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              function: scrapeData,
            }, (injectionResults) => {
              chrome.tabs.remove(tab.id);
              if (injectionResults && injectionResults[0] && injectionResults[0].result) {
                resolve(injectionResults[0].result);
              } else {
                reject(new Error('Failed to scrape data'));
              }
            });
          }, 2000);  // 2 seconds delay
        }
      });
    });
  });
}

function scrapeData() {
  const url = window.location.href;
  if (url.includes("youtube.com")) {
    return scrapeYouTube();
  } else if (url.includes("twitter.com") || url.includes("x.com")) {
    return scrapeTwitter();
  } else if (url.includes("facebook.com")) {
    return scrapeFacebook();
  } else if (url.includes("bilibili.com")) {
    return scrapeBilibili();
  } else if (url.includes("xiaohongshu.com")) {
    return scrapeXiaohongshu();
  }
  return null;
}

function scrapeYouTube() {
  const url = window.location.href;
  const ytInitialData = JSON.parse(document.body.innerHTML.match(/var ytInitialData = (.+?);<\/script>/)[1]);
  const videoId = new URL(url).searchParams.get('v');
  const videoTitle = ytInitialData.playerOverlays?.playerOverlayRenderer?.videoDetails?.playerOverlayVideoDetailsRenderer?.title?.simpleText;
  let videoDescription = '';
  let authorAvatar = '';
  let authorName = '';
  let authorEmail = '';
  let viewCount = '';
  let date = ''

  const contents = ytInitialData.contents?.twoColumnWatchNextResults?.results?.results?.contents;
  if (contents) {
    const primaryData = contents.find(item => item.videoPrimaryInfoRenderer);
    const secondaryData = contents.find(item => item.videoSecondaryInfoRenderer);
    if (primaryData) {
      viewCount = primaryData.videoPrimaryInfoRenderer.viewCount?.videoViewCountRenderer?.viewCount?.simpleText || '';
      date = primaryData.videoPrimaryInfoRenderer.dateText?.simpleText || '';
    }
    if (secondaryData) {
      const videoSecondaryInfoRenderer = secondaryData.videoSecondaryInfoRenderer;
      videoDescription = videoSecondaryInfoRenderer.attributedDescription?.content || '';
      authorAvatar = videoSecondaryInfoRenderer.owner?.videoOwnerRenderer?.thumbnail?.thumbnails?.[0]?.url || '';
      authorName = videoSecondaryInfoRenderer.owner?.videoOwnerRenderer?.title?.runs?.[0]?.text || '';
      authorEmail = videoSecondaryInfoRenderer.owner?.videoOwnerRenderer?.title?.runs?.[0]?.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url?.slice(1) || '';
      thumbnailUrl = `https://img.youtube.com/vi/${videoId}/0.jpg`
    }
  }

  return {
    type: 'YouTube',
    videoId,
    videoTitle,
    videoDescription,
    authorAvatar,
    authorName,
    authorEmail,
    thumbnailUrl,
    viewCount,
    date,
  };
}

function scrapeTwitter() {
  const date = document.querySelector('time').getAttribute('datetime');
  const url = window.location.href;
  const match = url.match(/\/status\/(\d+)/);
  const videoId = (match && match[1]) ? match[1] : null;
  return { type: 'Twitter', date, videoId };
}

function scrapeFacebook() {
  const html = document.body.innerHTML
  const endIndex = html.indexOf('<span>赞</span>');
  const truncatedHtml = endIndex !== -1 ? html.substring(0, endIndex) : html;
  const authorName = document.querySelector('strong span')?.textContent.trim() || ''
  const regex = /<div dir="auto" style="text-align:start">(.+?)<\/div>/g;
  const matches = [];
  let match;

  while ((match = regex.exec(truncatedHtml)) !== null) {
    const text = match[1].trim()
    if (!text.includes('<span')) {
      matches.push(match[1].trim());
    }
  }
  console.log(matches)
  // const authorName = await page.$eval('strong span', el => el.textContent.trim())
  return {
    type: 'Facebook',
    authorName,
    matches
  }
}

function scrapeBilibili() {
  const videoTitle = document.querySelector('.video-title').textContent.trim();
  const authorName = document.querySelector('.up-name').textContent.trim();
  const date = document.querySelector('.pubdate-ip-text').textContent.trim();
  const videoDescription = document.querySelector('.desc-info-text').textContent.trim();
  let thumbnailUrl = document.querySelector('#wxwork-share-pic')?.getAttribute('src') || '';
  let authorUrl = document.querySelector('.up-avatar')?.href || '';
  let authorAvatar = document.querySelector('.bili-avatar-img')?.getAttribute('data-src') || '';
  thumbnailUrl = thumbnailUrl.split('@')[0];
  authorAvatar = authorAvatar.split('@')[0];
  return {
    type: 'Bilibili',
    videoTitle,
    authorName,
    authorAvatar,
    thumbnailUrl,
    videoDescription,
    date,
    authorUrl
  };
}

function scrapeXiaohongshu() {
  const thumbnailUrl = document.querySelector('.note-slider-img')?.getAttribute('src') || ''
  const element = document.querySelector('.xgplayer-poster');
  let videolUrl
  if (element) {
    const style = window.getComputedStyle(element);
    const backgroundImage = style.getPropertyValue('background-image');
    const urlMatch = backgroundImage.match(/url\(["']?(.*?)["']?\)/);
    if (urlMatch && urlMatch[1]) {
      videolUrl = urlMatch[1];
    }
  }
  const videoTitle = document.querySelector('#detail-title')?.textContent.trim() || ''
  const authorName = document.querySelector('.username')?.textContent.trim() || ''
  const date = document.querySelector('.date')?.textContent.trim() || '';
  const authorAvatar = document.querySelector('.avatar-item')?.getAttribute('src') || ''
  const videoDescription = document.querySelector('#detail-desc')?.children[0]?.textContent.trim() || ''
  return {
    type: 'Xiaohongshu',
    thumbnailUrl,
    videoTitle,
    authorName,
    date,
    authorAvatar,
    videoDescription,
    videolUrl
  }
}