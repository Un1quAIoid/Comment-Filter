document.getElementById("saveBtn").addEventListener("click", () => {
    const key = document.getElementById("apiKey").value;
    chrome.storage.sync.set({ apiKey: key }, () => {
      alert("已保存 API Key！");
    });
});