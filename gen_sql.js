// 批量导入记录到 D1 数据库
const API_URL = 'https://cuotiben-api.roy020218.workers.dev/api/records';

// 从 exported_data.json 读取数据
const fs = require('fs');
const content = fs.readFileSync('exported_data.json', 'utf8');
const jsonStr = content.replace(/^【[^】]*】/, '');
const records = JSON.parse(jsonStr);

console.log(`找到 ${records.length} 条记录，准备导入...`);

// 生成批量插入的 SQL
const now = Date.now();
const values = records.map(r => {
  const dataStr = JSON.stringify(r).replace(/'/g, "''");
  return `('${r.id}', '${dataStr}', ${now}, ${now})`;
}).join(',\n');

const sql = `
INSERT OR REPLACE INTO records (id, data, created_at, updated_at)
VALUES
${values};
`;

console.log('SQL 生成完成，写入 import.sql...');
fs.writeFileSync('import.sql', sql);
console.log('现在运行: npx wrangler d1 execute cuotiben-db --file=import.sql --local');
console.log('或: npx wrangler d1 execute cuotiben-db --command="<上面的SQL>" --local');
