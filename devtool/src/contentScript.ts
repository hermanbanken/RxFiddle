window.addEventListener("message", function (evt) {
  const eventData = evt.data
  if (typeof eventData === "object"
    && eventData !== null
    && eventData.hasOwnProperty("__fromRxFiddleDevTool")
    && eventData.__fromRxFiddleDevTool) {
    alert("CONTENT SCRIPT will send message")
    chrome.runtime.sendMessage(eventData)
  }
})

document.addEventListener("RxFiddleDevToolEvent", function (evt: CustomEvent) {
  alert("CONTENT SCRIPT got RxFiddleDevToolEvent, detail: " + evt.detail)
  // Send to BACKGROUND
  chrome.runtime.sendMessage(evt.detail)
})

console.log("RxFiddle ContentScript started")
