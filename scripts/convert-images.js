const fg = require('fast-glob');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

(async function(){
  try {
    const patterns = ['**/*.{png,jpg,jpeg}'];
    // ignore node_modules and .git
    const files = await fg(patterns, { ignore: ['node_modules/**', '.git/**', 'scripts/**'] });
    if(!files.length){
      console.log('No PNG/JPG files found.');
      return;
    }
    for(const file of files){
      const ext = path.extname(file).toLowerCase();
      const out = file.replace(new RegExp(ext+'$'), '.webp');
      // skip if webp exists and is newer
      if(fs.existsSync(out)){
        const srcStat = fs.statSync(file);
        const outStat = fs.statSync(out);
        if(outStat.mtime >= srcStat.mtime){
          console.log('Skipping (up-to-date):', out);
          continue;
        }
      }
      console.log('Converting:', file, '->', out);
      await sharp(file)
        .webp({ quality: 80 })
        .toFile(out);
    }
    console.log('Done.');
  } catch(err){
    console.error(err);
    process.exit(1);
  }
})();
