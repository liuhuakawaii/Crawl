let scrapedData = [];

document.addEventListener('DOMContentLoaded', function () {
  const scrapeButton = document.getElementById('scrapeButton');
  const downloadButton = document.getElementById('downloadButton');
  const resultDiv = document.getElementById('resultDiv');

  // Load existing data from storage
  chrome.storage.local.get(['scrapedData'], function (result) {
    if (result.scrapedData) {
      scrapedData = result.scrapedData;
      updateResultDiv();
    }
  });

  scrapeButton.addEventListener('click', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "scrape" }, function (response) {
        if (response && response.success) {
          scrapedData.push(response.data);
          chrome.storage.local.set({ scrapedData: scrapedData }, function () {
            updateResultDiv();
          });
        }
      });
    });
  });

  downloadButton.addEventListener('click', function () {
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
      resultDiv.innerHTML += `<p>Item ${index + 1}: ${item.title}</p>`;
    });
  }
});