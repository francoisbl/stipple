(() => {
  const encoder = new TextEncoder();
  const crcTable = new Uint32Array(256);

  for (let n = 0; n < 256; n += 1) {
    let value = n;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    crcTable[n] = value >>> 0;
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function write16(view, offset, value) {
    view.setUint16(offset, value, true);
  }

  function write32(view, offset, value) {
    view.setUint32(offset, value, true);
  }

  function join(chunks) {
    const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
    const output = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      output.set(chunk, offset);
      offset += chunk.length;
    }
    return output;
  }

  function dosTimestamp(date) {
    const year = Math.max(1980, date.getFullYear());
    return {
      time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
      date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    };
  }

  window.createStoredZip = function createStoredZip(files) {
    const stamp = dosTimestamp(new Date());
    const entries = Object.entries(files).map(([name, content]) => {
      const nameBytes = encoder.encode(name);
      const data = typeof content === "string" ? encoder.encode(content) : content;
      return { nameBytes, data, checksum: crc32(data), offset: 0 };
    });

    const localChunks = [];
    let localOffset = 0;

    for (const entry of entries) {
      entry.offset = localOffset;
      const header = new Uint8Array(30);
      const view = new DataView(header.buffer);
      write32(view, 0, 0x04034b50);
      write16(view, 4, 20);
      write16(view, 6, 0x0800);
      write16(view, 8, 0);
      write16(view, 10, stamp.time);
      write16(view, 12, stamp.date);
      write32(view, 14, entry.checksum);
      write32(view, 18, entry.data.length);
      write32(view, 22, entry.data.length);
      write16(view, 26, entry.nameBytes.length);
      write16(view, 28, 0);
      const local = join([header, entry.nameBytes, entry.data]);
      localChunks.push(local);
      localOffset += local.length;
    }

    const centralChunks = entries.map((entry) => {
      const header = new Uint8Array(46);
      const view = new DataView(header.buffer);
      write32(view, 0, 0x02014b50);
      write16(view, 4, 20);
      write16(view, 6, 20);
      write16(view, 8, 0x0800);
      write16(view, 10, 0);
      write16(view, 12, stamp.time);
      write16(view, 14, stamp.date);
      write32(view, 16, entry.checksum);
      write32(view, 20, entry.data.length);
      write32(view, 24, entry.data.length);
      write16(view, 28, entry.nameBytes.length);
      write16(view, 30, 0);
      write16(view, 32, 0);
      write16(view, 34, 0);
      write16(view, 36, 0);
      write32(view, 38, 0);
      write32(view, 42, entry.offset);
      return join([header, entry.nameBytes]);
    });

    const central = join(centralChunks);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    write32(endView, 0, 0x06054b50);
    write16(endView, 4, 0);
    write16(endView, 6, 0);
    write16(endView, 8, entries.length);
    write16(endView, 10, entries.length);
    write32(endView, 12, central.length);
    write32(endView, 16, localOffset);
    write16(endView, 20, 0);

    return new Blob([...localChunks, central, end], { type: "application/zip" });
  };
})();
