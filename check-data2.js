const fs = require('fs');
const path = 'data.json';

try {
  const raw = fs.readFileSync(path, 'utf8');
  const data = JSON.parse(raw);
  
  console.log('JSON parsed OK');
  console.log('Top-level keys:', Object.keys(data));
  
  const collections = data.collections || {};
  const plantaOT = collections['planta-ordenes-trabajo'];
  console.log('\nplanta-ordenes-trabajo in collections:');
  console.log('  Type:', Array.isArray(plantaOT) ? 'array' : typeof plantaOT);
  console.log('  Length:', Array.isArray(plantaOT) ? plantaOT.length : 'N/A');
  
  if (Array.isArray(plantaOT)) {
    const withId = plantaOT.filter(item => item && item.id != null);
    const withoutId = plantaOT.filter(item => item && item.id == null);
    console.log('  Items with id:', withId.length);
    console.log('  Items without id:', withoutId.length);
    if (withoutId.length > 0) {
      console.log('  First item without id:', JSON.stringify(withoutId[0]).substring(0, 200));
    }
    
    // Check for any non-serializable values
    const stringified = JSON.stringify(plantaOT);
    console.log('  Stringify OK, length:', stringified.length);
  }
  
  // Try writing back
  const testPath = path + '.test-write';
  fs.writeFileSync(testPath, JSON.stringify(data, null, 2), 'utf8');
  fs.unlinkSync(testPath);
  console.log('\nWrite test OK');
  
} catch (err) {
  console.error('Error:', err.message);
}
