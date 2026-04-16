// 逐条导入记录
const fs = require('fs');
const { execSync } = require('child_process');

const content = fs.readFileSync('exported_data.json', 'utf8');
const jsonStr = content.replace(/^【[^】]*】/, '');
const records = JSON.parse(jsonStr);

const API_URL = 'https://cuotiben-api.roy020218.workers.dev/api/records';

console.log(`开始导入 ${records.length} 条记录...`);

let success = 0;
let fail = 0;

for (const record of records) {
  const payload = JSON.stringify({
    id: record.id,
    data: JSON.stringify(record)
  });

  try {
    // 使用 curl 发送请求
    const cmd = `curl -s -X POST "${API_URL}" -H "Content-Type: application/json" -d '${payload}'`;
    const result = execSync(cmd, { encoding: 'utf8' });
    console.log(`✓ ${record.id}: ${result}`);
    success++;
  } catch (e) {
    console.log(`✗ ${record.id}: ${e.message}`);
    fail++;
  }
}

console.log(`\n完成！成功: ${success}, 失败: ${fail}`);
