const fs = require('fs');
const path = require('path');
const https = require('https');

// Ler CSV
const csvPath = path.join(__dirname, 'frontend', 'public', 'Pasta1.csv');
console.log(`Lendo CSV de: ${csvPath}`);

if (!fs.existsSync(csvPath)) {
  console.error('❌ Arquivo não encontrado:', csvPath);
  process.exit(1);
}

const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').slice(1); // Skip header

// Parse CSV
const employees = [];
for (const line of lines) {
  if (!line.trim()) continue;
  
  const parts = line.split(';');
  if (parts.length < 2) continue;

  const supervisorName = (parts[0] || '').trim();
  const name = (parts[1] || '').trim();
  const role = (parts[2] || 'FUNCIONÁRIO').trim();

  if (supervisorName && name) {
    employees.push({
      supervisorName,
      name,
      role
    });
  }
}

console.log(`✓ ${employees.length} funcionários parseados`);

// Enviar para API
const data = JSON.stringify({ employees });
const options = {
  hostname: '72.61.62.17',
  port: 8881,
  path: '/api/auth/debug/add-employees',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => { responseData += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(responseData);
      console.log('✓ SUCESSO!');
      console.log('Criados:', parsed.created);
      console.log('Total:', parsed.total);
    } catch (e) {
      console.log(responseData);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Erro:', e.message);
});

req.write(data);
req.end();
