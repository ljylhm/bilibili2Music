// 测试合集下载功能
const fetch = require('node-fetch');

async function testCollectionDownload() {
  try {
    console.log('1. 获取合集信息...');
    
    // 先获取合集信息
    const collectionResponse = await fetch('http://localhost:3003/api/collection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: 'https://b23.tv/OS6pCyl'
      })
    });
    
    if (!collectionResponse.ok) {
      throw new Error(`合集API请求失败: ${collectionResponse.status}`);
    }
    
    const collectionData = await collectionResponse.json();
    console.log('合集信息获取成功:');
    console.log(`- 标题: ${collectionData.title}`);
    console.log(`- 视频数量: ${collectionData.videos.length}`);
    
    // 只下载前2个视频进行测试
    const testVideos = collectionData.videos.slice(0, 2);
    
    console.log('\n2. 开始下载测试 (前2个视频)...');
    
    const downloadResponse = await fetch('http://localhost:3003/api/collection-download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        videos: testVideos,
        collectionTitle: collectionData.title
      })
    });
    
    if (!downloadResponse.ok) {
      throw new Error(`下载API请求失败: ${downloadResponse.status}`);
    }
    
    const downloadData = await downloadResponse.json();
    console.log('\n下载结果:');
    console.log(JSON.stringify(downloadData, null, 2));
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testCollectionDownload();