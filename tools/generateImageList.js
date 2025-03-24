// tools/generateImageList.js
const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, '../images');
const outputPath = path.join(__dirname, '../imageList.js');

const imageFiles = fs.readdirSync(imagesDir).filter(file =>
  /\.(jpg|jpeg|png|gif)$/i.test(file)
);

const content = `module.exports = ${JSON.stringify(imageFiles, null, 2)};\n`;

fs.writeFileSync(outputPath, content);

console.log(`✅ 已生成 imageList.js，共 ${imageFiles.length} 张图片`);