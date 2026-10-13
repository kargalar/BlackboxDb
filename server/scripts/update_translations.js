const fs = require('fs');
const path = require('path');

const files = [
  'src/resolvers/DiscussionResolver.ts',
  'src/resolvers/ListResolver.ts',
  'src/resolvers/UserContentResolver.ts',
  'src/resolvers/content/ContentQueryResolver.ts'
];

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    console.error('Not found:', filePath);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace 1 arg
  content = content.replace(/convertContentForGraphQL\(([^,]+?)\)/g, 'convertContentForGraphQL($1, null, null, typeof ctx !== "undefined" ? ctx?.language : undefined)');
  
  // Replace 3 args
  content = content.replace(/convertContentForGraphQL\(([^,]+?),\s*([^,]+?),\s*([^,\)]+?)\)/g, 'convertContentForGraphQL($1, $2, $3, typeof ctx !== "undefined" ? ctx?.language : undefined)');

  fs.writeFileSync(filePath, content);
  console.log('Updated:', filePath);
});
