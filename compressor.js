class HuffmanNode {
  constructor(byte, freq, left = null, right = null) {
    this.byte = byte;
    this.freq = freq;
    this.left = left;
    this.right = right;
  }
}

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

function generateCodes(node, prefix = '', map = {}) {
  if (!node.left && !node.right) {
    map[node.byte] = prefix;
  } else {
    generateCodes(node.left, prefix + '0', map);
    generateCodes(node.right, prefix + '1', map);
  }
  return map;
}

function compressHuffman(data, originalFileName) {
  const freqMap = {};
  for (let byte of data) {
    freqMap[byte] = (freqMap[byte] || 0) + 1;
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

function compressFiles() {
  const input = document.getElementById('fileInput');
  const status = document.getElementById('status');
  status.innerText = 'Status:\n';

  if (input.files.length === 0) {
    alert("Please select at least one file.");
    return;
  }

  Array.from(input.files).forEach(file => {
    const reader = new FileReader();

    reader.onload = function (e) {
      const originalData = new Uint8Array(e.target.result);
      const compressedBlob = compressHuffman(originalData, file.name);

      const a = document.createElement('a');
      a.href = URL.createObjectURL(compressedBlob);
      a.download = file.name + '.huff';
      a.click();

      status.innerText += `✅ Compressed "${file.name}" to .huff\n`;
    };

    reader.readAsArrayBuffer(file);
  });
}
