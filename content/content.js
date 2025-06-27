const STORAGE_KEY = 'commentFilterSettings';

function get_root() {//获取全部评论所在的root
  if (window.location.hostname === 'www.bilibili.com') {
    return document.querySelector("bili-comments")?.shadowRoot.querySelector("#feed");
  }
  else if (window.location.hostname === 'www.zhihu.com') {
    return document.querySelector(".css-0");
  }
}

function * Commenttraversal_Bili(element) {
  // console.log(element);
  if (element.tagName === "BILI-COMMENT-RENDERER" || element.tagName === "BILI-COMMENT-REPLY-RENDERER") {
    yield element;
  }
  else { 
    if (element.shadowRoot) element = element.shadowRoot;
    element = element.firstElementChild;
    while (element) {
      yield * Commenttraversal_Bili(element);
      element = element.nextElementSibling;
    }
  }
}

function get_comment_list(root) {//获取评论/回答列表
  if (window.location.hostname === 'www.bilibili.com') {
    return Commenttraversal_Bili(root);
  }
  else if (window.location.hostname === 'www.zhihu.com') {
    return root.querySelectorAll(".List-item");
  }
}

function get_comment_content(comment) {
  content = "";
  if (window.location.hostname === 'www.bilibili.com') {
    let content_list = null;
    if (comment.tagName === "BILI-COMMENT-RENDERER") {
      content = "(comment) " + comment.shadowRoot.querySelector("bili-comment-user-info")
                                      .shadowRoot.querySelector("a").textContent + ": ";
      content_list = comment.shadowRoot.querySelector("bili-rich-text")
                            .shadowRoot.querySelector("#contents").childNodes;
    }
    else {
      content = "(reply) " + comment.shadowRoot.querySelector("bili-comment-user-info")
                                    .shadowRoot.querySelector("a").textContent + ": ";
      content_list = comment.shadowRoot.querySelector("bili-rich-text")
                            .shadowRoot.querySelector("#contents").childNodes;
    }
    
    for (let ele of content_list) {
      if (ele.tagName === "SPAN") {
        content += ele.textContent;
      }
      else if (ele.tagName === "IMG") {
        content += ele.getAttribute("alt");
      }
      else if (ele.tagName === "A") {
        content += ele.textContent;
      }
    }
  }
  else if (window.location.hostname === 'www.zhihu.com') {
    const content_list = comment.querySelector(".RichText.ztext.CopyrightRichText-richText.css-1mev9j9").childNodes;
    for (const node of content_list) {
      if (node.nodeType === Node.TEXT_NODE) {
        content += node.textContent;
      } else if (node.tagName === "SPAN" && node.classList.contains("ztext-math")) {
        const script = node.querySelector('script[type^="math/tex"]');
        if (script) {
          content += script.textContent;  // 原始 LaTeX
        } else {
          content += node.textContent;   // 退化备用
        }
      } else {
        content += node.textContent;     // 其他标签，例如 a、strong 等
      }
    }
  }
  return content;
}

function maskComment(commentElement) {
  const shadow = commentElement.shadowRoot?.querySelector("#main");
  if (!shadow) return;

  if (shadow.querySelector('.block-overlay')) return;

  const overlay = document.createElement("div");
  overlay.className = "block-overlay";
  Object.assign(overlay.style, {
    position: "absolute",
    top: "0", left: "0",
    width: "100%", height: "100%",
    backgroundColor: "rgba(255,255,255,0.5)",
    backdropFilter: "blur(5px)",
    zIndex: "9999",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "auto",
    fontSize: "14px",
    color: "#333",
    cursor: "pointer",
    transition: "opacity 0.2s ease",
    opacity: "1"
  });

  overlay.textContent = "已屏蔽，悬停查看原内容";

  // 鼠标移上去：隐藏蒙版
  overlay.addEventListener("mouseenter", () => {
    overlay.style.opacity = "0";
    overlay.style.pointerEvents = "none"; // 允许底层交互（比如复制）
  });

  // 鼠标移出：恢复蒙版
  overlay.addEventListener("mouseleave", () => {
    overlay.style.opacity = "1";
    overlay.style.pointerEvents = "auto";
  });

  // 插入
  shadow.style.position = "relative";
  shadow.appendChild(overlay);
}

function loadSettings() {
  return new Promise(resolve => {
    chrome.storage.local.get({ [STORAGE_KEY]: null }, (raw) => {
      resolve(raw);
    })
  });
}

function get_system_prompt(setting) {
  if (window.location.hostname === "www.bilibili.com") {
    return [
      {
        role: "system",
        content: [
          "你是一个评论筛选助手。",
          "用户将依次提供主评论(comment)与其若干条回复(reply)，",
          "你需要判断**最后一条提供的内容**是否违反用户的筛选规则。",
          "如果违反，严格返回：YES；如果不违反，严格返回：NO。",
          "绝对不要生成任何其它内容，包括解释、模仿评论或任何 reply。",
          "只回复一个词：YES 或 NO。必须为英文大写，不带任何标点或前缀后缀。",
          "如果不遵守这个格式，系统将视为错误。"
        ].join(" ")
      },
      {
        role: "system",
        content: "你不是聊天机器人，也不需要与用户对话，不要补充任何信息。只需判断是否屏蔽并返回 `YES` 或 `NO`。"
      },
      {
        role: "system",
        content:
          "当前视频标题为：" + document.querySelector("h1")?.innerText
      },
      {
        role: "system",
        content:
          "筛选规则如下（strength 为过滤强度，0-10，越高越严格）：" +
          JSON.stringify(setting.bilibili.prompts)
      }
    ]
  }
  else if (window.location.hostname === "www.zhihu.com") {
    return [
      {
        role: "system",
        content: [
          "你是一个知乎回答筛选助手。",
          "用户将提供一条知乎回答，你需要判断它是否违反筛选规则。",
          "如果违反，严格返回：YES；如果不违反，严格返回：NO。",
          "绝对不要生成其它内容。只输出 YES 或 NO（大写，单词，不能有标点或解释）。"
        ].join(" ")
      },
      {
        role: "system",
        content: "筛选规则如下（strength 为过滤强度，0-10，越高越严格）：" +
                 JSON.stringify(setting.zhihu.prompts)
      },
      {
        role: "system",
        content:
          "当前问题为：" + document.querySelector(".QuestionHeader-title").textContent
      }
    ];
  }
}

let tot_time = 0
let format_correct_time = 0

function Filter() {
  this.result = {};
  this.message = [];

  this.add = async function(content) {
    if (content in this.result) {
      return this.result[content];
    } else {
      const raw = await loadSettings();
      const setting = raw?.[STORAGE_KEY];

      const messages = get_system_prompt(setting);

      // 知乎：每次只发这一条内容
      if (window.location.hostname === 'www.zhihu.com') {
        messages.push({ role: "user", content });
      } else {
        // B站：保留上下文
        this.message.push({ role: "user", content });
        messages.push(...this.message);
      }
      
      let answer = "";
      do {
        const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${setting.advanced.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages,
            temperature: 0.0
          })
        });

        const json = await res.json();
        answer = json.choices?.[0]?.message?.content?.trim();
        tot_time = tot_time + 1;
      } while (answer !== "YES" && answer !== "NO");
      
      this.result[content] = answer;
      format_correct_time = format_correct_time + 1;
      console.log(format_correct_time, tot_time, content, answer);
      return answer;
    }
  }
}
const zhihuFilter = new Filter();

async function startWatchingComments() {
  const raw = await loadSettings();
  const setting = raw?.[STORAGE_KEY];
  if (window.location.hostname === 'www.bilibili.com') {
    if (setting.bilibili.enabled === false) return false;
  }
  else if (window.location.hostname === 'www.zhihu.com') {
    if (setting.zhihu.enabled === false) return false;
  }

  tot_length = 0;
  process_memory = {};
  
  const root = get_root();
  if (!root) return false;
  
  const processNewComments = () => {
    // 加一点延迟，等 shadow DOM 准备好，否则comt.shadowRoot?.querySelector("#comment")会返回null
    setTimeout(async () => {
      const items = get_comment_list(root);//获取评论列表
      let lst = "";
      
      for (let comment of items) {
        const content = get_comment_content(comment);//获取评论/回答内容
        
        tot_length += content.length;
        // maskComment(comment);
        if (window.location.hostname === 'www.bilibili.com') {
          let key_fl = false;
          for (let w of setting.bilibili.keywords) {
            if (content.includes(w.text)) {
              key_fl = true;
              break;
            }
          }

          if (key_fl) {
            maskComment(comment);
            continue;
          }

          if (comment.tagName === "BILI-COMMENT-RENDERER") {
            lst = content;
            if (!(content in process_memory)) {
              process_memory[content] = new Filter();
              const block = await process_memory[content].add(content);
              if ((block === "YES")) maskComment(comment);
            }
          }
          else {
            const block = await process_memory[lst].add(content);
            if ((block === "YES")) maskComment(comment);
          }
        }
        else if (window.location.hostname === 'www.zhihu.com') {
          let key_fl = false;
          for (let w of setting.zhihu.keywords) {
            if (content.includes(w.text)) {
              key_fl = true;
              break;
            }
          }

          if (key_fl) {
            comment.style.display = "none";
            continue;
          }

          const autherName = comment.querySelector(".AuthorInfo [itemprop='name']").getAttribute("content");
          if (!(autherName in process_memory)) {
            const block = await zhihuFilter.add(content);
            process_memory[autherName] = block;
            // console.log(autherName, block);
            if ((block === "YES")) {
              comment.style.display = "none";
            }
          }
        }
      }
    }, 100); // 延迟 100ms，确保新评论结构构建完成

    // console.log(tot_length)
  };

  // 初始处理已有的评论
  processNewComments();

  // 监听 shadowRoot 内部的变动
  const innerObserver = new MutationObserver(processNewComments);

  innerObserver.observe(root, {
    childList: true,
    subtree: false
  });

  console.log("👀 已开始监听新评论加载");

  return true;
}

function waitForShadowRootAndStart() {
  const outerObserver = new MutationObserver(async () => {
    const ready = await startWatchingComments();
    if (ready) outerObserver.disconnect();
  });

  outerObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log("⌛ 等待评论区加载...");
}

waitForShadowRootAndStart();

function injectSummaryButtons() {
  const answers = document.querySelectorAll('.List-item');

  for (const answer of answers) {
    // 避免重复添加
    if (answer.querySelector('.summary-btn')) continue;

    const authorInfo = answer.querySelector('.AuthorInfo');
    if (!authorInfo) continue;

    const btn = document.createElement('button');
    btn.textContent = '总结';
    btn.className = 'summary-btn';

    // 设置样式，与popup一致
    Object.assign(btn.style, {
      cursor: 'pointer',
      padding: '7px 14px',
      fontSize: '14px',
      borderRadius: '6px',
      border: 'none',
      backgroundColor: '#3b82f6',
      color: 'white',
      transition: 'background-color 0.3s ease',
      userSelect: 'none',
      marginTop: '6px'
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.backgroundColor = '#2563eb';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.backgroundColor = '#3b82f6';
    });

    btn.addEventListener('click', async () => {
      if (btn.disabled) return;
      btn.disabled = true;
      btn.textContent = '总结中...';

      const contentNode = answer.querySelector(".RichText.ztext.CopyrightRichText-richText.css-1mev9j9");
      if (!contentNode) return;

      const content = contentNode.innerText;

      const setting = (await loadSettings())[STORAGE_KEY];
      const apiKey = setting.advanced.apiKey;

      const prompt = [
        {
          role: "system",
          content: "你是一个知乎回答总结助手。用户将提供一条知乎回答，你需要对其内容进行简要总结，用简洁语言清楚概括核心观点。最多输出三句话。"
        },
        {
          role: "user",
          content: content
        }
      ];

      const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: prompt,
          temperature: 0.3
        })
      });

      const json = await res.json();
      const summary = json.choices?.[0]?.message?.content?.trim();

      // 插入总结内容
      const summaryBox = document.createElement("div");
      summaryBox.textContent = "总结：" + summary;
      summaryBox.style.cssText = `
        background: #f0f9ff;
        border-left: 4px solid #3b82f6;
        padding: 10px 12px;
        margin: 10px 0;
        border-radius: 6px;
        font-size: 14px;
        line-height: 1.6;
        color: #1e293b;
      `;

      authorInfo.insertAdjacentElement("afterend", summaryBox);
      btn.textContent = '已总结';
    });

    // 插入按钮：紧跟在作者栏下方
    authorInfo.insertAdjacentElement("afterend", btn);
  }
}

// 可以定时轮询或在回答加载后调用
setInterval(() => {
  if (window.location.hostname === 'www.zhihu.com') {
    injectSummaryButtons();
  }
}, 1000);
