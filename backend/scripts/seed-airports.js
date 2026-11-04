const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// load backend/.env without extra packages
const envPath = path.join(__dirname, '..', '.env');
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

// minimal CSV parser (handles quoted fields with commas)
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function main() {
  const file = process.argv[2] || path.join(__dirname, '..', 'data', 'Airports.csv');
  const [header, ...rows] = parseCsv(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  const cols = header.map((h) => h.trim().toLowerCase());
  const idx = (n) => {
    const i = cols.indexOf(n);
    if (i < 0) throw new Error('Column "' + n + '" not found. Header is: ' + header.join(','));
    return i;
  };
  const [iI, nI, cI, coI, tzI] = ['iata_code', 'name', 'city_id', 'country_code', 'time_zone'].map(idx);

  await mongoose.connect(process.env.MONGODB_URI);
  const col = mongoose.connection.collection('airports');
  await col.createIndex({ iataCode: 1 }, { unique: true });

  const now = new Date();
  const ops = rows
    .filter((r) => r[iI] && r[iI].trim())
    .map((r) => {
      const iataCode = r[iI].trim().toUpperCase();
      return {
        updateOne: {
          filter: { iataCode },
          update: {
            $set: {
              iataCode, name: r[nI].trim(), cityId: r[cI].trim(),
              countryCode: r[coI].trim().toUpperCase(), timeZone: r[tzI].trim(), updatedAt: now,
            },
            $setOnInsert: { createdAt: now },
          },
          upsert: true,
        },
      };
    });

  const res = await col.bulkWrite(ops);
  console.log('Done. rows=' + ops.length + ' inserted=' + res.upsertedCount + ' updated=' + res.modifiedCount);
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
