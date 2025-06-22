const STORAGE_KEY = 'commentFilterSettings';

function get_root() {//获取全部评论所在的root
  if (window.location.hostname === 'www.bilibili.com') {
    return document.querySelector("bili-comments")?.shadowRoot.querySelector("#feed");
  }
  else if (window.location.hostname === 'www.zhihu.com') {
    return document.querySelector(".css-18ld3w0");
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

function get_comment_list(root) {//获取评论列表
  if (window.location.hostname === 'www.bilibili.com') {
    return Commenttraversal_Bili(root);
  }
  else if (window.location.hostname === 'www.zhihu.com') {
    return root.querySelectorAll(".css-18ld3w0 > div");
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

  }
  return content;
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
      { role: "system", content: "请你做一名bilibili评论筛选员，当前视频的标题为 " + document.querySelector("h1") + "，用户会给出一条评论以及若干条该评论的回复，按照用户的筛选条件判断最后一个给出的评论（回复）是否应该被屏蔽，是则回复“YES”，否则回复“NO”，不要多余输出" },
      { role: "system", content: "筛选条件：" + JSON.stringify(setting.bilibili.prompts) + "strength为筛选强度，0-10，越大筛选力度就越大" }
    ]
  }
}

function Filter() {
  this.result = {};
  this.message = [];

  this.add = async function(content) {
    if (content in this.result) {
      return this.result[content];
    }
    else {
      let setting = await loadSettings();
      setting = setting[STORAGE_KEY];
      console.log(content, setting.advanced.apiKey);

      this.message.push({ role: "user", content: content });
      const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${setting.advanced.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            ...get_system_prompt(setting),
            ...this.message
          ],
          temperature: 0.0
        })
      });

      const json = await res.json();
      const answer = json.choices?.[0]?.message?.content?.trim();
      this.result[content] = answer;
      console.log(answer);
      return answer;
    }
  }
}

function startWatchingComments() {
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
        const content = get_comment_content(comment);//获取评论内容
        
        tot_length += content.length;
        if (comment.tagName === "BILI-COMMENT-RENDERER") {
          lst = content;
          if (!(content in process_memory)) {
            process_memory[content] = new Filter();
            await process_memory[content].add(content);
          }
        }
        else {
          await process_memory[lst].add(content);
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
  const outerObserver = new MutationObserver(() => {
    const ready = startWatchingComments();
    if (ready) outerObserver.disconnect();
  });

  outerObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log("⌛ 等待评论区加载...");
}

waitForShadowRootAndStart();
