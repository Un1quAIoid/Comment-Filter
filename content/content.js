function startWatchingComments() {
  const root = document.querySelector("bili-comments")?.shadowRoot.querySelector("#feed"); 
  if (!root) return false;

  let lst = 0;

  const processNewComments = () => {
    // 加一点延迟，等 shadow DOM 准备好，否则comt.shadowRoot?.querySelector("#comment")会返回null
    setTimeout(() => {
      const items = root.querySelectorAll("bili-comment-thread-renderer");

      for (let i = lst; i < items.length; i++) {
        const comt = items[i];
        const text = comt.shadowRoot?.querySelector("#comment")?.shadowRoot
                              ?.querySelector("bili-rich-text")?.shadowRoot?.querySelector("span")?.innerText;

        console.log("💬 新评论：", text);
        // TODO: 发送给 LLM，判断是否扔掉
      }

      lst = items.length;
    }, 100); // 延迟 100ms，确保新评论结构构建完成
  };

  // 初始处理已有的评论
  processNewComments();

  // 监听 shadowRoot 内部的变动
  const innerObserver = new MutationObserver(processNewComments);

  innerObserver.observe(root, {
    childList: true,
    subtree: true
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

  console.log("⌛ 等待 B站评论区加载...");
}

waitForShadowRootAndStart();
