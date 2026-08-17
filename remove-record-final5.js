const fs = require('fs');
const path = 'C:\\Users\\yonny.h\\Videos\\DATA\\Data Pro V1.9\\data.json';

// Read the file
const fd = fs.openSync(path, 'r+');
const stats = fs.fstatSync(fd);
const buffer = Buffer.alloc(stats.size);
fs.readSync(fd, buffer, 0, stats.size, 0);

const raw = buffer.toString('utf8');
const target = 'TAPETES DEL EMPAYADO Y ENTRADA DEL HORNO ATASCADOS';
const idx = raw.indexOf(target);

console.log('Found at index:', idx);

if (idx !== -1) {
  // Find the start of the object
  const idStr = '"id": 1786829500470';
  const idIdx = raw.indexOf(idStr, raw.lastIndexOf('planta-ordenes-trabajo', idx));
  const objStart = raw.lastIndexOf('{', idIdx);
  
  // Find the end of the object
  let depth = 0;
  let objEnd = objStart;
  for (let i = objStart; i < raw.length; i++) {
    if (raw[i] === '{') depth++;
    else if (raw[i] === '}') depth--;
    if (depth === 0) {
      objEnd = i + 1;
      break;
    }
  }
  
  console.log('Object start:', objStart);
  console.log('Object end:', objEnd);
  
  // Remove the object
  let newRaw = raw.slice(0, objStart) + raw.slice(objEnd);
  
  // Write back
  fs.writeSync(fd, newRaw, 0, 'utf8');
  fs.fsyncSync(fd);
  fs.closeSync(fd);
  
  console.log('File written and synced');
  
  // Verify
  const verify = fs.readFileSync(path, 'utf8');
  const verifyIdx = verify.indexOf(target);
  console.log('Verification - found at index:', verifyIdx);
} else {
  fs.closeSync(fd);
  console.log('Target not found');
}
