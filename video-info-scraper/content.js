chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "scrape") {
    try {
      const data = scrapeData();
      sendResponse({ success: true, data: data });
    } catch (error) {
      console.error('Scraping error:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // 保持通道开放，以便异步发送响应
  }
});


const scrapers = {
  'youtube.com': scrapeYouTube,
  'twitter.com': scrapeTwitter,
  'x.com': scrapeTwitter,
  'facebook.com': scrapeFacebook,
  'bilibili.com': scrapeBilibili,
  'xiaohongshu.com': scrapeXiaohongshu,
  'instagram.com': scrapeIns,
};

function scrapeData() {
  const url = window.location.href;
  const scraper = Object.entries(scrapers).find(([domain]) => url.includes(domain))?.[1];
  return scraper ? scraper(url) : null;
}

function scrapeYouTube(url) {
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
    url
  };
}

function scrapeTwitter(url) {
  const date = document.querySelector('time').getAttribute('datetime');
  const match = url.match(/\/status\/(\d+)/);
  const videoId = (match && match[1]) ? match[1] : null;
  return {
    type: 'Twitter',
    date,
    videoId,
    url
  };
}

function scrapeFacebook(url) {
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
    matches,
    url
  }
}

function scrapeBilibili(url) {
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
    authorUrl,
    url
  };
}

function scrapeXiaohongshu(url) {
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
    videolUrl,
    url
  }
}


function scrapeIns(url) {
  let data = new Promise((resolve, reject) => {
    const date = document.querySelector('time').getAttribute('datetime');
    const authorName = document.querySelector('._ap3a._aaco._aacw._aacx._aad7._aade').textContent.trim() || '';
    const videoDescription = document.querySelector('span.x193iq5w.xeuugli.x1fj9vlw.x13faqbe.x1vvkbs.xt0psk2.x1i0vuye.xvs91rp.xo1l8bm.x5n08af.x10wh9bi.x1wdrske.x8viiok.x18hxmgj').textContent.trim() || '';
    const authorAvatar = document.querySelector('img.xpdipgo.x972fbf.xcfux6l.x1qhh985.xm0m39n.xk390pu.x5yr21d.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xl1xv1r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x11njtxf.xh8yej3')?.getAttribute('src') || '';
    const videoElement = document.querySelector('video');
    const videoUrl = videoElement?.getAttribute('src') || '';
    let thumbnailUrl = document.querySelector('img.x5yr21d.xu96u03.x10l6tqk.x13vifvy.x87ps6o.xh8yej3')?.getAttribute('src') || '';
    console.log(videoUrl, thumbnailUrl);

    if (videoUrl && !thumbnailUrl) {
      // 如果有视频但没有缩略图，则从视频创建缩略图
      const canvas = document.createElement('canvas');
      canvas.width = 320;  // 设置缩略图宽度
      canvas.height = 180; // 设置缩略图高度

      videoElement.addEventListener('loadeddata', () => {

      });

      videoElement.addEventListener('error', (e) => {
        console.error('Error loading video:', e);
        resolve({
          type: "ins",
          url,
          date,
          videoUrl,
          authorName,
          authorAvatar,
          thumbnailUrl: '',
          videoDescription,
        });
      });
    } else {
      // 如果没有视频或已经有缩略图，直接返回结果
      resolve({
        type: "ins",
        url,
        date,
        videoUrl,
        authorName,
        authorAvatar,
        thumbnailUrl,
        videoDescription,
      });
    }
  })
  return data
}