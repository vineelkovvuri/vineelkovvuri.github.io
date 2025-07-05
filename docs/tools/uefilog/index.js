let editor;
let guidMap = new Map(); // To store name -> guid pairs

// Function to fetch and parse guids.txt
function loadGuids() {
  fetch("guids.txt")
    .then((response) => {
      if (!response.ok) throw new Error("Failed to load guids.txt");
      return response.text();
    })
    .then((text) => {
      const lines = text.split("\n");
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && trimmed.includes("=")) {
          const [name, guid] = trimmed.split("=").map((part) => part.trim());
          if (name && guid) guidMap.set(name, guid);
        }
      });
      // console.log("Loaded GUID Map:", guidMap);
    })
    .catch((error) => console.error("Error loading guids.txt:", error));
}

// Configure Monaco loader
require.config({
  paths: {
    vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs",
  },
});

// Load Monaco Editor and GUIDs
require(["vs/editor/editor.main"], function () {
  editor = monaco.editor.create(document.getElementById("editor"), {
    value:
      "Use 'Choose File' to load a UEFI log file and hit convert to replace all the GUIDs!\n",
    language: "plaintext",
    theme: "vs-light",
    wordWrap: "off",
    scrollBeyondLastColumn: true,
    rulers: [
      { column: 80, color: "rgba(255, 0, 0, 0.5)" },
      { column: 100, color: "rgba(0, 0, 255, 0.5)" },
    ],
    automaticLayout: true,
  });

  // Load GUIDs after editor is ready
  loadGuids();
});

// Handle File Input Change with substring-based filtering
document
  .getElementById("fileInput")
  .addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const content = e.target.result;
        const marker = "INFO - CPU model:";

        // Find position where marker starts
        const markerIndex = content.indexOf(marker);

        let filteredContent = "";
        if (markerIndex !== -1) {
          // Extract content starting from marker
          filteredContent = content.substring(markerIndex);
        } else {
          // If marker not found, fallback to full content or notify
          alert(`Marker "${marker}" not found. Loading entire file.`);
          filteredContent = content;
        }

        editor.setValue(filteredContent); // Set filtered content into editor
      };
      reader.readAsText(file);
    }
  });

// Handle Convert Button Click
document.getElementById("convertBtn").addEventListener("click", function () {
  let content = editor.getValue();

  // Perform GUID replacements
  guidMap.forEach((guid, name) => {
    const regex = new RegExp(guid, "gi"); // Case-insensitive replace
    content = content.replace(regex, name); // Replace GUID with name
  });

  editor.setValue(content); // Update editor with replaced content
});
