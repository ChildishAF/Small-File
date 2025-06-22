function decodeHuffman(header, compressedData) {
  const { padding, codes } = header;
  const reverseCodes = {};
  for (let byte in codes) {
    reverseCodes[codes[byte]] = parseInt(byte);
  }

  let bitString = '';
  for (let byte of compressedData) {
    bitString += byte.toString(2).padStart(8, '0');
  }

  bitString = bitString.slice(0, bitString.length - padding);

  const decodedBytes = [];
  let currentCode = '';
  for (let bit of bitString) {
    currentCode += bit;
    if (currentCode in reverseCodes) {
      decodedBytes.push(reverseCodes[currentCode]);
      currentCode = '';
    }
  }

  return new Uint8Array(decodedBytes);
}

function handleDecompression(file) {
  const reader = new FileReader();

  reader.onload = function (e) {
    const fullData = new Uint8Array(e.target.result);

    const delimiterIndex = fullData.indexOf(0);
    if (delimiterIndex === -1) {
      alert("Invalid .huff file: missing delimiter.");
      return;
    }

    const headerBytes = fullData.slice(0, delimiterIndex);
    const compressedBytes = fullData.slice(delimiterIndex + 1);

    const headerText = new TextDecoder().decode(headerBytes);
    const header = JSON.parse(headerText);

    const decompressed = decodeHuffman(header, compressedBytes);
    const originalName = header.originalFileName || file.name.replace(/\.huff$/, '.decompressed');

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([decompressed], { type: 'application/octet-stream' }));
    a.download = originalName;
    a.click();

    const status = document.getElementById('status');
    status.innerText += `✅ Decompressed "${file.name}" to "${originalName}"\n`;
  };

  reader.readAsArrayBuffer(file);
}
