(() => {
  const STORAGE_KEY = 'commentFilterSettings';

  const disclaimerOverlay = document.getElementById('disclaimerOverlay');
  const agreeBtn = document.getElementById('agreeBtn');
  const mainContainer = document.getElementById('mainContainer');

  // Toggle platform content
  function toggleSection(header, content, icon) {
    const expanded = content.classList.toggle('expanded');
    icon.classList.toggle('expanded', expanded);
    header.setAttribute('aria-expanded', expanded);
    content.setAttribute('aria-hidden', !expanded);
  }

  // Create prompt item element
  function createPromptItem(text, value, onChange, onRemove) {
    const container = document.createElement('div');
    container.className = 'prompt-item';

    const promptText = document.createElement('div');
    promptText.className = 'prompt-text';
    promptText.textContent = text;
    container.appendChild(promptText);

    const inputRange = document.createElement('input');
    inputRange.type = 'range';
    inputRange.min = '0';
    inputRange.max = '10';
    inputRange.value = value ?? 5;
    inputRange.className = 'prompt-range';
    container.appendChild(inputRange);

    const rangeValue = document.createElement('span');
    rangeValue.className = 'range-value';
    rangeValue.textContent = inputRange.value;
    container.appendChild(rangeValue);

    inputRange.addEventListener('input', () => {
      rangeValue.textContent = inputRange.value;
      onChange && onChange(inputRange.value);
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'prompt-remove-btn';
    removeBtn.title = '删除该prompt';
    removeBtn.textContent = '×';
    container.appendChild(removeBtn);

    removeBtn.addEventListener('click', () => {
      onRemove && onRemove();
      container.remove();
    });

    return { container, inputRange };
  }

  function createKeywordItem(text, value, onChange, onRemove) {
    const container = document.createElement('div');
    container.className = 'keyword-item';  // 与 prompt-item 区别在这里

    const promptText = document.createElement('div');
    promptText.className = 'prompt-text'; // 样式复用
    promptText.textContent = text;
    container.appendChild(promptText);

    const inputRange = document.createElement('input');
    inputRange.type = 'range';
    inputRange.min = '0';
    inputRange.max = '10';
    inputRange.value = value ?? 5;
    inputRange.className = 'prompt-range';
    container.appendChild(inputRange);

    const rangeValue = document.createElement('span');
    rangeValue.className = 'range-value';
    rangeValue.textContent = inputRange.value;
    container.appendChild(rangeValue);

    inputRange.addEventListener('input', () => {
      rangeValue.textContent = inputRange.value;
      onChange && onChange(inputRange.value);
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'prompt-remove-btn';
    removeBtn.title = '删除该关键词';
    removeBtn.textContent = '×';
    container.appendChild(removeBtn);

    removeBtn.addEventListener('click', () => {
      onRemove && onRemove();
      container.remove();
    });

    return { container, inputRange };
  }


  // Render prompt list inside container
  function renderPromptList(container, prompts, onChangeStrength, onRemovePrompt) {
    container.innerHTML = '';
    for (const p of prompts) {
      const { container: el, inputRange } = createPromptItem(
        p.text,
        p.strength ?? 5,
        (val) => {
          p.strength = Number(val);
          onChangeStrength && onChangeStrength();
        },
        () => {
          prompts.splice(prompts.indexOf(p), 1);
          renderPromptList(container, prompts, onChangeStrength, onRemovePrompt);
        }
      );
      container.appendChild(el);
    }
  }

  function renderKeywordList(container, keywordArray) {
    container.innerHTML = '';
    keywordArray.forEach((k, i) => {
      const keywordItem = createKeywordItem(
        k.text,
        k.strength,
        (val) => {
          k.strength = Number(val);
        },
        () => {
          keywordArray.splice(i, 1);
          renderKeywordList(container, keywordArray);
        }
      );
      container.appendChild(keywordItem.container);
    });
  }


  // Save all settings to localStorage
  function saveSettings() {
    const data = {
      agreed: true,
      global: {
        enabled: true,
        prompts,
        keywords: globalKeywords,
        strength: Number(globalStrength.value),
        presets: getPresetCheckboxValues(globalPresetFilters),
      },
      bilibili: {
        enabled: enableBilibili.checked,
        prompts: bilibiliPrompts,
        keywords: bilibiliKeywords,
        presets: getPresetCheckboxValues(bilibiliPresetFilters),
      },
      zhihu: {
        enabled: enableZhihu.checked,
        prompts: zhihuPrompts,
        keywords: zhihuKeywords,
        presets: getPresetCheckboxValues(zhihuPresetFilters),
      },
      advanced: {
        apiKey: apiKeyInput.value.trim(),
      }
    };

    chrome.storage.local.set({ [STORAGE_KEY] : data }, () => { alert('设置已保存'); });
  }

  // Load settings from localStorage
  function loadSettings() {
    return new Promise(resolve => {
      chrome.storage.local.get({ [STORAGE_KEY] : null }, (raw) => {
        resolve(raw);
      })
    });
  }

  // Helper to get preset checkboxes checked values (array)
  function getPresetCheckboxValues(container) {
    return Array.from(container.querySelectorAll('input[type=checkbox]'))
      .filter(cb => cb.checked)
      .map(cb => cb.value);
  }

  // Set preset checkbox states
  function setPresetCheckboxValues(container, values = []) {
    container.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.checked = values.includes(cb.value);
    });
  }

  // Create prompt data from string array
  function promptsFromStrings(arr = []) {
    return arr.map(text => ({ text, strength: 5 }));
  }

  // Global variables for prompts
  let prompts = [];
  let bilibiliPrompts = [];
  let zhihuPrompts = [];

  let globalKeywords = [];
  let bilibiliKeywords = [];
  let zhihuKeywords = [];

  // Get UI elements
  const globalPromptInput = document.getElementById('globalPromptInput');
  const addGlobalPromptBtn = document.getElementById('addGlobalPromptBtn');
  const globalPromptsList = document.getElementById('globalPromptsList');
  const globalStrength = document.getElementById('globalStrength');
  const globalStrengthValue = document.getElementById('globalStrengthValue');
  const globalPresetFilters = document.getElementById('globalPresetFilters');

  const enableBilibili = document.getElementById('enableBilibili');
  const bilibiliPromptInput = document.getElementById('bilibiliPromptInput');
  const addBilibiliPromptBtn = document.getElementById('addBilibiliPromptBtn');
  const bilibiliPromptsList = document.getElementById('bilibiliPromptsList');
  const bilibiliPresetFilters = document.getElementById('bilibiliPresetFilters');

  const enableZhihu = document.getElementById('enableZhihu');
  const zhihuPromptInput = document.getElementById('zhihuPromptInput');
  const addZhihuPromptBtn = document.getElementById('addZhihuPromptBtn');
  const zhihuPromptsList = document.getElementById('zhihuPromptsList');
  const zhihuPresetFilters = document.getElementById('zhihuPresetFilters');

  const apiKeyInput = document.getElementById('apiKeyInput');

  const toggleAdvancedBtn = document.getElementById('toggleAdvanced');
  const advancedSection = document.getElementById('advancedSection');

  const saveBtn = document.getElementById('saveBtn');

  // Platform toggles
  const bilibiliBlock = document.getElementById('bilibiliBlock');
  const bilibiliHeader = bilibiliBlock.querySelector('.platform-header');
  const bilibiliContent = document.getElementById('bilibiliContent');
  const bilibiliToggleIcon = document.getElementById('bilibiliToggle');

  const zhihuBlock = document.getElementById('zhihuBlock');
  const zhihuHeader = zhihuBlock.querySelector('.platform-header');
  const zhihuContent = document.getElementById('zhihuContent');
  const zhihuToggleIcon = document.getElementById('zhihuToggle');

  //keyword
  const globalKeywordInput = document.getElementById('globalKeywordInput');
  const addGlobalKeywordBtn = document.getElementById('addGlobalKeywordBtn');
  const globalKeywordsList = document.getElementById('globalKeywordsList');

  const bilibiliKeywordInput = document.getElementById('bilibiliKeywordInput');
  const addBilibiliKeywordBtn = document.getElementById('addBilibiliKeywordBtn');
  const bilibiliKeywordsList = document.getElementById('bilibiliKeywordsList');

  const zhihuKeywordInput = document.getElementById('zhihuKeywordInput');
  const addZhihuKeywordBtn = document.getElementById('addZhihuKeywordBtn');
  const zhihuKeywordsList = document.getElementById('zhihuKeywordsList');


  // Disclaimer agree button
  agreeBtn.addEventListener('click', async () => {
    disclaimerOverlay.style.display = 'none';
    mainContainer.classList.remove('hidden');
    await loadAllSettings();
  });

  // Range value update handlers
  globalStrength.addEventListener('input', () => {
    globalStrengthValue.textContent = globalStrength.value;
  });

  // Toggle advanced section
  toggleAdvancedBtn.addEventListener('click', () => {
    const expanded = advancedSection.classList.toggle('visible');
    advancedSection.setAttribute('aria-expanded', expanded);
    advancedSection.setAttribute('aria-hidden', !expanded);
    toggleAdvancedBtn.textContent = expanded ? '隐藏高级设置' : '显示高级设置';
  });

  // Platform toggle handlers
  bilibiliHeader.addEventListener('click', () => {
    const expanded = bilibiliContent.classList.toggle('expanded');
    bilibiliToggleIcon.classList.toggle('expanded', expanded);
    bilibiliHeader.setAttribute('aria-expanded', expanded);
    bilibiliContent.setAttribute('aria-hidden', !expanded);
  });
  bilibiliHeader.addEventListener('keydown', e => {
    if(e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      bilibiliHeader.click();
    }
  });

  zhihuHeader.addEventListener('click', () => {
    const expanded = zhihuContent.classList.toggle('expanded');
    zhihuToggleIcon.classList.toggle('expanded', expanded);
    zhihuHeader.setAttribute('aria-expanded', expanded);
    zhihuContent.setAttribute('aria-hidden', !expanded);
  });
  zhihuHeader.addEventListener('keydown', e => {
    if(e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      zhihuHeader.click();
    }
  });

  // Add prompt button handlers
  addGlobalPromptBtn.addEventListener('click', () => {
    const val = globalPromptInput.value.trim();
    if(val) {
      prompts.push({ text: val, strength: 5 });
      globalPromptInput.value = '';
      renderPromptList(globalPromptsList, prompts);
    }
  });

  addBilibiliPromptBtn.addEventListener('click', () => {
    const val = bilibiliPromptInput.value.trim();
    if(val) {
      bilibiliPrompts.push({ text: val, strength: 5 });
      bilibiliPromptInput.value = '';
      renderPromptList(bilibiliPromptsList, bilibiliPrompts);
    }
  });

  addZhihuPromptBtn.addEventListener('click', () => {
    const val = zhihuPromptInput.value.trim();
    if(val) {
      zhihuPrompts.push({ text: val, strength: 5 });
      zhihuPromptInput.value = '';
      renderPromptList(zhihuPromptsList, zhihuPrompts);
    }
  });

  addGlobalKeywordBtn.addEventListener('click', () => {
    const val = globalKeywordInput.value.trim();
    if(val) {
      globalKeywords.push({ text: val, strength: 5 });
      globalKeywordInput.value = '';
      renderKeywordList(globalKeywordsList, globalKeywords);
    }
  });

  addBilibiliKeywordBtn.addEventListener('click', () => {
    const val = bilibiliKeywordInput.value.trim();
    if(val) {
      bilibiliKeywords.push({ text: val, strength: 5 });
      bilibiliKeywordInput.value = '';
      renderKeywordList(bilibiliKeywordsList, bilibiliKeywords);
    }
  });

  addZhihuKeywordBtn.addEventListener('click', () => {
    const val = zhihuKeywordInput.value.trim();
    if(val) {
      zhihuKeywords.push({ text: val, strength: 5 });
      zhihuKeywordInput.value = '';
      renderKeywordList(zhihuKeywordsList, zhihuKeywords);
    }
  });


  // Render prompt lists with handlers to update strengths and remove
  function renderPromptList(container, promptArray) {
    container.innerHTML = '';
    promptArray.forEach((p, i) => {
      const promptItem = createPromptItem(
        p.text,
        p.strength,
        (val) => {
          p.strength = Number(val);
        },
        () => {
          promptArray.splice(i, 1);
          renderPromptList(container, promptArray);
        }
      );
      container.appendChild(promptItem.container);
    });
  }

  // Load all saved settings
  async function loadAllSettings() {
    const raw = await loadSettings();
    const data = raw?.[STORAGE_KEY];
    if (!data) return;

    // Global
    prompts = data.global?.prompts || [];
    renderPromptList(globalPromptsList, prompts);
    globalStrength.value = data.global?.strength ?? 5;
    globalStrengthValue.textContent = globalStrength.value;
    setPresetCheckboxValues(globalPresetFilters, data.global?.presets || []);

    // Bilibili
    bilibiliPrompts = data.bilibili?.prompts || [];
    renderPromptList(bilibiliPromptsList, bilibiliPrompts);
    enableBilibili.checked = data.bilibili?.enabled ?? false;
    setPresetCheckboxValues(bilibiliPresetFilters, data.bilibili?.presets || []);

    // Zhihu
    zhihuPrompts = data.zhihu?.prompts || [];
    renderPromptList(zhihuPromptsList, zhihuPrompts);
    enableZhihu.checked = data.zhihu?.enabled ?? false;
    setPresetCheckboxValues(zhihuPresetFilters, data.zhihu?.presets || []);
    
    //keyword
    globalKeywords = data.global?.keywords || [];
    renderKeywordList(globalKeywordsList, globalKeywords);

    bilibiliKeywords = data.bilibili?.keywords || [];
    renderKeywordList(bilibiliKeywordsList, bilibiliKeywords);

    zhihuKeywords = data.zhihu?.keywords || [];
    renderKeywordList(zhihuKeywordsList, zhihuKeywords);


    // Advanced
    apiKeyInput.value = data.advanced?.apiKey || '';

    // 默认收起平台内容
    if(bilibiliContent.classList.contains('expanded')) {
      bilibiliHeader.click();
    }
    if(zhihuContent.classList.contains('expanded')) {
      zhihuHeader.click();
    }

    // 高级设置默认折叠
    if(advancedSection.classList.contains('visible')) {
      toggleAdvancedBtn.click();
    }
  }

  // Save button
  saveBtn.addEventListener('click', () => {
    saveSettings();
  });

  // On load check if agreed, else show disclaimer
  window.addEventListener('load', async () => {
    const raw = await loadSettings();
    const data = raw?.[STORAGE_KEY];
    if (data?.agreed) {
      disclaimerOverlay.style.display = 'none';
      mainContainer.classList.remove('hidden');
      loadAllSettings();
    }
  });
})();
