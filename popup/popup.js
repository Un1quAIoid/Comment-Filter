document.addEventListener("DOMContentLoaded", () => {
  const disclaimerOverlay = document.getElementById("disclaimerOverlay");
  const agreeBtn = document.getElementById("agreeBtn");
  const mainContainer = document.getElementById("mainContainer");

  // 点击免责声明同意按钮
  agreeBtn.addEventListener("click", () => {
    disclaimerOverlay.style.display = "none";
    mainContainer.classList.remove("hidden");
    // 记录用户同意，避免下次弹出
    localStorage.setItem("disclaimerAgreed", "true");
  });

  // 如果之前已经同意，直接显示主设置区
  if (localStorage.getItem("disclaimerAgreed") === "true") {
    disclaimerOverlay.style.display = "none";
    mainContainer.classList.remove("hidden");
  }

  // 1. 初始化时，确保所有平台自定义设置都隐藏
  document.querySelectorAll(".platform-custom-settings").forEach(el => {
    el.classList.remove("visible");
  });

  // 2. 点击“自定义设置”按钮，切换显示状态
  document.querySelectorAll(".btn-custom-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const platform = btn.dataset.platform;
      const settingEl = document.getElementById(`custom-${platform}`);
      if (settingEl) {
        settingEl.classList.toggle("visible");
      }
    });
  });

  // 辅助函数：创建关键词标签
  function createKeywordItem(text) {
    const span = document.createElement("span");
    span.className = "keyword-item";
    span.textContent = text;
    const delBtn = document.createElement("button");
    delBtn.textContent = "×";
    delBtn.title = "删除关键词";
    delBtn.addEventListener("click", () => {
      span.remove();
    });
    span.appendChild(delBtn);
    return span;
  }

  // 自定义关键词添加
  document.querySelectorAll(".add-custom-keyword").forEach(btn => {
    btn.addEventListener("click", () => {
      const container = btn.closest(".platform-custom-settings");
      const input = container.querySelector(".custom-keyword-input");
      const keywordsList = container.querySelector(".custom-keywords-list");
      const val = input.value.trim();
      if (val) {
        const item = createKeywordItem(val);
        keywordsList.appendChild(item);
        input.value = "";
      }
    });
  });

  // 全局关键词添加
  const addGlobalKeywordBtn = document.getElementById("addGlobalKeywordBtn");
  const globalKeywordInput = document.getElementById("globalKeywordInput");
  const globalKeywordsList = document.getElementById("globalKeywordsList");

  addGlobalKeywordBtn.addEventListener("click", () => {
    const val = globalKeywordInput.value.trim();
    if (val) {
      const item = createKeywordItem(val);
      globalKeywordsList.appendChild(item);
      globalKeywordInput.value = "";
    }
  });

  // 滑块联动显示值
  function bindRangeValue(rangeInput) {
    const span = rangeInput.nextElementSibling;
    if (!span) return;
    span.textContent = rangeInput.value;
    rangeInput.addEventListener("input", () => {
      span.textContent = rangeInput.value;
    });
  }

  document.querySelectorAll("input[type=range]").forEach(bindRangeValue);

  // 高级设置切换
  const toggleAdvancedBtn = document.getElementById("toggleAdvanced");
  const advancedSection = document.getElementById("advancedSection");

  toggleAdvancedBtn.addEventListener("click", () => {
    if (advancedSection.style.display === "none" || advancedSection.style.display === "") {
      advancedSection.style.display = "block";
      toggleAdvancedBtn.textContent = "隐藏高级设置";
    } else {
      advancedSection.style.display = "none";
      toggleAdvancedBtn.textContent = "显示高级设置";
    }
  });

  // 保存数据到 localStorage
  const saveBtn = document.getElementById("saveBtn");
  saveBtn.addEventListener("click", () => {
    const data = {};

    // 选中平台及自定义设置
    data.platforms = {};
    document.querySelectorAll("#platforms .platform-row").forEach(row => {
      const checkbox = row.querySelector("input[type=checkbox]");
      const platform = checkbox.value;
      if (checkbox.checked) {
        const settingsDiv = document.getElementById(`custom-${platform}`);
        // 关键词
        const keywords = Array.from(settingsDiv.querySelectorAll(".keyword-item"))
          .map(item => item.firstChild.textContent);
        // 筛选强度
        const strength = settingsDiv.querySelector(".custom-strength").value;
        data.platforms[platform] = {
          enabled: true,
          keywords,
          strength: Number(strength),
        };
      } else {
        data.platforms[platform] = { enabled: false };
      }
    });

    // 全局设置
    data.globalStrength = Number(document.getElementById("globalStrength").value);
    data.globalKeywords = Array.from(globalKeywordsList.querySelectorAll(".keyword-item"))
      .map(item => item.firstChild.textContent);

    // API Key
    data.apiKey = document.getElementById("apiKeyInput").value.trim();

    // 保存
    localStorage.setItem("commentFilterSettings", JSON.stringify(data));
    alert("设置已保存！");
  });

  // 页面加载时恢复设置
  function loadSettings() {
    const saved = localStorage.getItem("commentFilterSettings");
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      // 平台设置
      for (const [platform, config] of Object.entries(data.platforms || {})) {
        const checkbox = document.querySelector(`#platforms input[value=${platform}]`);
        const settingsDiv = document.getElementById(`custom-${platform}`);
        if (!checkbox) continue;
        checkbox.checked = !!config.enabled;

        // 清空旧关键词
        const keywordsList = settingsDiv.querySelector(".custom-keywords-list");
        keywordsList.innerHTML = "";
        if (config.keywords && config.keywords.length) {
          for (const kw of config.keywords) {
            keywordsList.appendChild(createKeywordItem(kw));
          }
        }
        if (config.strength !== undefined) {
          const range = settingsDiv.querySelector(".custom-strength");
          range.value = config.strength;
          bindRangeValue(range);
        }

        // 无论是否勾选，初始化时都折叠个性化设置
        settingsDiv.classList.remove("visible");
      }

      // 全局筛选强度和关键词
      if (data.globalStrength !== undefined) {
        const globalRange = document.getElementById("globalStrength");
        globalRange.value = data.globalStrength;
        bindRangeValue(globalRange);
      }
      globalKeywordsList.innerHTML = "";
      if (data.globalKeywords && data.globalKeywords.length) {
        for (const kw of data.globalKeywords) {
          globalKeywordsList.appendChild(createKeywordItem(kw));
        }
      }

      // API Key
      if (data.apiKey !== undefined) {
        document.getElementById("apiKeyInput").value = data.apiKey;
      }
    } catch (e) {
      console.warn("读取设置失败:", e);
    }
  }

  loadSettings();
});
