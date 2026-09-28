// Paste into Knack: Settings → API & Code → JavaScript.
// Sizes any embedded trail/lift/weather iframe to fit its content, so it never
// shows a scrollbar or a blank gap. Pages must be loaded with ?embed.
window.addEventListener("message", function (event) {
  if (event.origin !== "https://max-pigs.github.io") return;
  var data = event.data;
  if (!data || data.source !== "trailliftstatus") return;

  document.querySelectorAll("iframe").forEach(function (frame) {
    if (frame.contentWindow === event.source) {
      frame.style.height = data.height + "px";
    }
  });
});
