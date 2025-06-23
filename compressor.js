// HuffmanNode class remains unchanged
class HuffmanNode {
  constructor(byte, freq, left = null, right = null) {
    this.byte = byte;
    this.freq = freq;
    this.left = left;
    this.right = right;
  }
}

// buildTree function remains unchanged
function buildTree(freqMap) {
  const nodes = Object.entries(freqMap).map(([byte, freq]) =>
    new HuffmanNode(parseInt(byte), freq)
  );

  while (nodes.length > 1) {
    nodes.sort((a, b) => a.freq - b.freq);
    const left = nodes.shift();
    const right = nodes.shift();
    const newNode = new HuffmanNode(null, left.freq + right.freq, left, right);
    nodes.push(newNode);
  }

  return nodes[0];
}

// generateCodes function remains unchanged
function generateCodes(node, prefix = '', map = {}) {
  if (!node.left && !node.right) {
    map[node.byte] = prefix;
  } else {
    generateCodes(node.left, prefix + '0', map);
    generateCodes(node.right, prefix + '1', map);
  }
  return map;
}

/**
 * Compresses data using Huffman coding.
 * @param {Uint8Array} data - The original file data as a Uint8Array.
 * @param {string} originalFileName - The name of the original file.
 * @returns {Blob} - A Blob containing the compressed data and header.
 */
function compressHuffman(data, originalFileName) {
  const freqMap = {};
  for (let byte of data) {
    freqMap[byte] = (freqMap[byte] || 0) + 1;
  }

  // Handle empty or very small data to prevent errors in tree building
  if (Object.keys(freqMap).length === 0) {
      // For empty files, return an empty blob with a minimal header
      return new Blob([new TextEncoder().encode(JSON.stringify({
          padding: 0,
          codes: {},
          originalFileName
      })), new Uint8Array([0])], { type: 'application/octet-stream' });
  }
  if (Object.keys(freqMap).length === 1) {
      // Special case for files with only one unique byte: build a simple tree
      const byte = parseInt(Object.keys(freqMap)[0]);
      const root = new HuffmanNode(byte, freqMap[byte]);
      const codeMap = { [byte]: '0' }; // Single byte gets '0' code
      const bitString = codeMap[byte].repeat(freqMap[byte]);
      const padding = (8 - (bitString.length % 8)) % 8;
      const paddedBitString = bitString + '0'.repeat(padding);

      const byteArray = [];
      for (let i = 0; i < paddedBitString.length; i += 8) {
          byteArray.push(parseInt(paddedBitString.slice(i, i + 8), 2));
      }

      const header = {
          padding,
          codes: codeMap,
          originalFileName
      };

      const headerBytes = new TextEncoder().encode(JSON.stringify(header));
      const delimiter = new Uint8Array([0]);
      return new Blob([headerBytes, delimiter, new Uint8Array(byteArray)], {
          type: 'application/octet-stream'
      });
  }


  const root = buildTree(freqMap);
  const codeMap = generateCodes(root);

  let bitString = '';
  for (let byte of data) {
    bitString += codeMap[byte];
  }

  const padding = (8 - (bitString.length % 8)) % 8;
  bitString += '0'.repeat(padding);

  const byteArray = [];
  for (let i = 0; i < bitString.length; i += 8) {
    byteArray.push(parseInt(bitString.slice(i, i + 8), 2));
  }

  const header = {
    padding,
    codes: codeMap,
    originalFileName
  };

  const headerBytes = new TextEncoder().encode(JSON.stringify(header));
  const delimiter = new Uint8Array([0]);

  return new Blob([headerBytes, delimiter, new Uint8Array(byteArray)], {
    type: 'application/octet-stream'
  });
}

/**
 * Initiates the compression process for selected files.
 * Provides detailed status updates including compression ratio.
 */
function compressFiles() {
  const input = document.getElementById('fileInput');
  const status = document.getElementById('status');
  const loader = document.getElementById('loader');

  loader.style.display = 'block'; // Show loader
  status.innerText = 'Status:\n'; // Clear previous status

  if (input.files.length === 0) {
    loader.style.display = 'none'; // Hide loader
    showMessageBox("No Files Selected", "Please select at least one file to compress.");
    return;
  }

  let filesProcessed = 0;
  const totalFiles = input.files.length;

  Array.from(input.files).forEach(file => {
    const reader = new FileReader();

    reader.onloadstart = () => {
        status.innerText += `Processing "${file.name}"...\n`;
    };

    reader.onload = function (e) {
      try {
        const originalData = new Uint8Array(e.target.result);
        const originalSize = originalData.length; // Size in bytes

        const compressedBlob = compressHuffman(originalData, file.name);
        const compressedSize = compressedBlob.size; // Size in bytes

        const a = document.createElement('a');
        a.href = URL.createObjectURL(compressedBlob);
        a.download = file.name + '.huff';
        a.click();
        URL.revokeObjectURL(a.href); // Clean up the URL object

        const compressionRatio = (1 - (compressedSize / originalSize)) * 100;

        status.innerText += `✅ Compressed "${file.name}"\n` +
                            `   Original Size: ${originalSize} bytes\n` +
                            `   Compressed Size: ${compressedSize} bytes\n` +
                            `   Compression: ${compressionRatio.toFixed(2)}%\n\n`;
      } catch (error) {
        status.innerText += `❌ Failed to compress "${file.name}": ${error.message}\n\n`;
        showMessageBox("Compression Error", `Failed to compress "${file.name}": ${error.message}`);
      } finally {
        filesProcessed++;
        if (filesProcessed === totalFiles) {
          loader.style.display = 'none'; // Hide loader when all files are processed
        }
      }
    };

    reader.onerror = () => {
      status.innerText += `❌ Error reading file "${file.name}".\n\n`;
      showMessageBox("File Read Error", `Could not read file: "${file.name}".`);
      filesProcessed++;
      if (filesProcessed === totalFiles) {
        loader.style.display = 'none';
      }
    };

    reader.readAsArrayBuffer(file);
  });
}
