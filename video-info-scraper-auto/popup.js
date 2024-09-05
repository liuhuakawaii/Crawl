let scrapedData = [];

document.addEventListener('DOMContentLoaded', function () {
  const scrapeButton = document.getElementById('scrapeButton');
  const downloadButton = document.getElementById('downloadButton');
  const urlInput = document.getElementById('urlInput');
  const resultDiv = document.getElementById('resultDiv');

  scrapeButton.addEventListener('click', function () {
    const urls = urlInput.value.split('\n').filter(url => url.trim() !== '');
    if (urls.length === 0) {
      resultDiv.textContent = 'Please enter at least one URL.';
      return;
    }

    resultDiv.textContent = 'Scraping in progress...';
    scrapedData = [];

    chrome.runtime.sendMessage({ action: "scrapeMultipleUrls", urls: urls }, function (response) {
      if (response && response.success) {
        scrapedData = response.data;
        updateResultDiv();
      } else {
        resultDiv.textContent = 'An error occurred during scraping.';
      }
    });
  });

  downloadButton.addEventListener('click', function () {
    if (scrapedData.length === 0) {
      resultDiv.textContent = 'No data to download. Please scrape some URLs first.';
      return;
    }

    const jsonString = JSON.stringify(scrapedData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
      url: url,
      filename: "scraped_data.json"
    });
  });

  function updateResultDiv() {
    resultDiv.innerHTML = `<p>Scraped ${scrapedData.length} items.</p>`;
    scrapedData.forEach((item, index) => {
      resultDiv.innerHTML += `<p>Item ${index + 1}: ${item.title || item.tweet || item.post}</p>`;
    });
  }
});