document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("pre").forEach(pre => {
    // Create wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "code-wrapper";

    // Insert wrapper before the pre
    pre.parentNode.insertBefore(wrapper, pre);

    // Move pre inside wrapper
    wrapper.appendChild(pre);

    // Create copy button
    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.textContent = "📋";
    btn.title = "Copy";

    // Add to wrapper
    wrapper.appendChild(btn);

    // Copy logic
    btn.addEventListener("click", () => {
      navigator.clipboard.writeText(pre.textContent).then(() => {
        btn.textContent = "✅";
        btn.title = "Copied!";
        setTimeout(() => {
          btn.textContent = "📋";
          btn.title = "Copy";
        }, 1500);
      });
    });
  });
});
