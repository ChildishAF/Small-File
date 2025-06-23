/**
 * Decodes Huffman compressed data.
 * @param {object} header - The header object containing padding and codes.
 * @param {Uint8Array} compressedData - The compressed data as a Uint8Array.
 * @returns {Uint8Array} - The decompressed data as a Uint8Array.
 */
function decodeHuffman(header, compressedData) {
  const { padding, codes } = header;
  const reverseCodes = {};
  for (let byte in codes) {
    reverseCodes[codes[byte]] = parseInt(byte);
  }

  let bitString = '';
  // Convert compressed bytes to a bit string
  for (let byte of compressedData) {
    bitString += byte.toString(2).padStart(8, '0');
  }

  // Remove padding bits
  if (padding > 0) {
    bitString = bitString.slice(0, bitString.length - padding);
  }

  const decodedBytes = [];
  let currentCode = '';
  // Iterate through the bit string to find matching Huffman codes
  for (let bit of bitString) {
    currentCode += bit;
    if (currentCode in reverseCodes) {
      decodedBytes.push(reverseCodes[currentCode]);
      currentCode = '';
    }
  }

  // Check for incomplete decoding if bitString was not fully consumed
  if (currentCode !== '') {
      throw new Error("Incomplete decoding: remaining bits in currentCode after processing bitString. File might be corrupted.");
  }


  return new Uint8Array(decodedBytes);
}

/**
 * Handles the decompression process for a single .huff file.
 * Provides detailed status updates including decompressed size.
 * @param {File} file - The .huff file to decompress.
 */
function handleDecompression(file) {
  const reader = new FileReader();
  const status = document.getElementById('status');
  const loader = document.getElementById('loader');

  loader.style.display = 'block'; // Show loader
  status.innerText = `Status:\nProcessing decompression for "${file.name}"...\n`; // Clear and update status

  reader.onload = function (e) {
    try {
      const fullData = new Uint8Array(e.target.result);

      // Find the delimiter (null byte) separating header and compressed data
      const delimiterIndex = fullData.indexOf(0);
      if (delimiterIndex === -1) {
        throw new Error("Invalid .huff file: missing header delimiter.");
      }

      const headerBytes = fullData.slice(0, delimiterIndex);
      const compressedBytes = fullData.slice(delimiterIndex + 1);

      const headerText = new TextDecoder().decode(headerBytes);
      const header = JSON.parse(headerText); // Parse the header JSON

      // Validate header structure minimally
      if (!header || typeof header.padding === 'undefined' || !header.codes || typeof header.originalFileName === 'undefined') {
          throw new Error("Invalid .huff file: malformed header structure.");
      }

      const decompressed = decodeHuffman(header, compressedBytes);
      const originalName = header.originalFileName || file.name.replace(/\.huff$/, '.decompressed');
      const decompressedSize = decompressed.length;

      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([decompressed], { type: 'application/octet-stream' }));
      a.download = originalName;
      a.click();
      URL.revokeObjectURL(a.href); // Clean up the URL object

      status.innerText += `✅ Decompressed "${file.name}"\n` +
                          `   Original Name: "${originalName}"\n` +
                          `   Decompressed Size: ${decompressedSize} bytes\n\n`;

    } catch (error) {
      status.innerText += `❌ Failed to decompress "${file.name}": ${error.message}\n\n`;
      showMessageBox("Decompression Error", `Failed to decompress "${file.name}": ${error.message}`);
    } finally {
      loader.style.display = 'none'; // Hide loader
    }
  };

  reader.onerror = () => {
    status.innerText += `❌ Error reading file "${file.name}".\n\n`;
    showMessageBox("File Read Error", `Could not read file: "${file.name}".`);
    loader.style.display = 'none';
  };

  reader.readAsArrayBuffer(file);
}
