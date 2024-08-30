chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'crawl') {
    const crawledData = crawlPage();
    sendResponse({ data: crawledData });
  }
  return true;
});

function crawlPage() {
  // This is where you implement your crawling logic
  // For example:
  const data = {
    title: document.title,
    h1: Array.from(document.getElementsByTagName('h1')).map(h => h.textContent),
    images: Array.from(document.getElementsByTagName('img')).map(img => ({
      src: img.src,
      alt: img.alt
    })),
    // Add more fields as needed
  };

  return data;
}
