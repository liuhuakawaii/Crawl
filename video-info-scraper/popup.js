document.addEventListener('DOMContentLoaded', function () {
  const scrapeButton = document.getElementById('scrapeButton');
  const downloadButton = document.getElementById('downloadButton');
  const resultDiv = document.getElementById('resultDiv');

  // Load existing data from storage
  chrome.storage.local.get(['scrapedData'], function (result) {
    if (result.scrapedData) {
      updateResultDiv(result.scrapedData);
    }
  });

  scrapeButton.addEventListener('click', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const currentTab = tabs[0];
      const currentUrl = currentTab.url;

      chrome.storage.local.get(['scrapedData'], function (result) {
        const existingData = result.scrapedData || [];

        const existingEntryIndex = existingData.findIndex(entry => entry.url === currentUrl);
        if (existingEntryIndex !== -1) {
          if (confirm(`This URL already has data. Do you want to crawl and update it again?`)) {
            existingData.splice(existingEntryIndex, 1);
            sendScrapeMessage(currentTab, existingData);
          }
        } else {
          sendScrapeMessage(currentTab, existingData);
        }
      });
    });
  });

  function sendScrapeMessage(tab, existingData) {
    chrome.tabs.sendMessage(tab.id, { action: "scrape" }, function (response) {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError.message);
        alert('An error occurred: ' + chrome.runtime.lastError.message);
        return;
      }
      handleScrapeResponse(response, existingData);
    });
  }

  function handleScrapeResponse(response, existingData) {
    console.log(response, 'response');

    if (response && response.success) {
      const newData = response.data;
      existingData.push(newData);

      chrome.storage.local.set({ scrapedData: existingData }, function () {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError.message);
          alert('Failed to save data: ' + chrome.runtime.lastError.message);
          return;
        }
        chrome.storage.local.get(['scrapedData'], function (result) {
          scrapedData = result.scrapedData || [];
          updateResultDiv(scrapedData);
        });
      });
    } else {
      console.error('Scraping failed:', response ? response.error : 'Unknown error');
      alert('URL crawling failed: ' + (response ? response.error : 'Unknown error'));
    }
  }

  function parseDate(dateString) {
    const formats = [
      /(\d{4})年(\d{1,2})月(\d{1,2})日/, // "2024年6月12日"
      /(\d{4})-(\d{1,2})-(\d{1,2})/, // "2024-06-18"
      /(\d{1,2}):(\d{1,2}) · (\d{4})年(\d{1,2})月(\d{1,2})日/, // "上午10:59 · 2024年8月20日"
      /(\d{2})-(\d{2})/, // "07-29"
    ];
    let formattedDate = ''
    for (const format of formats) {
      if (dateString) {
        const match = dateString.match(format);
        console.log(dateString, match, 'dateString', format);
        if (match) {
          let year, month, day
          if (match.length === 3) {
            year = new Date().getFullYear()
            month = parseInt(match[1], 10) - 1;
            day = parseInt(match[2], 10);
          } else {
            year = parseInt(match[1], 10);
            month = parseInt(match[2], 10) - 1; // JavaScript 月份是从 0 开始的
            day = parseInt(match[3], 10);
          }
          formattedDate = new Date(year, month, day);
          break
        }
      }
    }
    return formattedDate
  }

  function sortByDate(arr, descending = true) {
    console.log(parseDate('上午10:59 · 2024年8月20日'), 'test');

    return arr.map(item => {
      const parsedDate = parseDate(item.date);
      console.log(parsedDate, 'parsedDate');

      if (parsedDate) {
        item.formattedDate = parsedDate?.toISOString()?.substring(0, 10);
      }
      return item;
    }).sort((a, b) => {
      const dateA = new Date(a.formattedDate);
      const dateB = new Date(b.formattedDate);

      if (descending) {
        return dateB - dateA; // 降序
      } else {
        return dateA - dateB; // 升序
      }
    });
  }

  downloadButton.addEventListener('click', function () {
    chrome.storage.local.get(['scrapedData'], function (result) {
      scrapedData = result.scrapedData || [];
      const sortedResults = sortByDate(scrapedData);
      console.log(sortedResults, 'sortedResults');
      const jsonString = JSON.stringify(sortedResults, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      chrome.downloads.download({
        url: url,
        filename: "scraped_data.json"
      });
    });
  });

  function updateResultDiv(data) {
    resultDiv.innerHTML = `<p>Scraped ${data.length} items.</p>`;
    console.log(data, 'scrapedData');

    data.forEach((item, index) => {
      resultDiv.innerHTML += `<p>Item ${index + 1} - ${item.url}</p>`;
    });
  }
  document.getElementById('clearButton').addEventListener('click', clearStorage);
  // 清除存储函数
  function clearStorage() {
    chrome.storage.local.clear(function () {
      alert('clear success!');
      resultDiv.innerHTML = '';
    });
  }
});