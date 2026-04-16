// 导入脚本：将 exported_data.json 的数据批量导入到云端
const API_URL = 'https://cuotiben-api.roy020218.workers.dev/api/records';

async function importRecords() {
  // 读取本地 JSON 文件
  const fs = require('fs');
  const content = fs.readFileSync('exported_data.json', 'utf8');
  // 去掉开头的【导出数据】前缀
  const jsonStr = content.replace(/^【[^】]*】/, '');
  const records = JSON.parse(jsonStr);

  console.log(`找到 ${records.length} 条记录，准备导入...`);

  let successCount = 0;
  let failCount = 0;

  for (const record of records) {
    try {
      const payload = {
        id: record.id,
        data: JSON.stringify(record)
      };

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        successCount++;
        console.log(`✓ [${successCount}] 导入成功: ${record.id}`);
      } else {
        failCount++;
        console.log(`✗ [${failCount}] 导入失败: ${record.id} (${res.status})`);
      }
    } catch (e) {
      failCount++;
      console.log(`✗ [${failCount}] 导入失败: ${record.id} (${e.message})`);
    }
  }

  console.log(`\n导入完成！成功: ${successCount}, 失败: ${failCount}`);
}

importRecords();
