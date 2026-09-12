// Read-only comparison of the original admin and the current app.
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('@babel/parser');
const source = path.resolve(__dirname, '../../../Recruitment-AI/admin/src');
const target = path.resolve(__dirname, '../src');
function clean(value) {
  if (Array.isArray(value)) return value.filter(v => !(v?.type === 'JSXAttribute' && ['className', 'style'].includes(v.name?.name))).map(clean);
  if (!value || typeof value !== 'object') return value;
  if (value.type === 'JSXText') return {type: value.type, value: value.value.trim().replace(/\s+/g, ' ')};
  return Object.fromEntries(Object.entries(value).filter(([k]) => !['start','end','loc','extra','comments','leadingComments','trailingComments','innerComments','tokens'].includes(k)).map(([k,v]) => [k, clean(v)]));
}
function walk(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]);
}
const result = [];
for (const f of walk(source).filter(f => f.endsWith('.jsx'))) {
  const rel = path.relative(source,f), dest = path.join(target,rel);
  if (!fs.existsSync(dest)) continue;
  const a = fs.readFileSync(f,'utf8'), b = fs.readFileSync(dest,'utf8');
  if (a === b) continue;
  const ast = s => clean(parse(s,{sourceType:'module',plugins:['jsx']}));
  result.push({file: rel.replaceAll('\\','/'), visualOnly: JSON.stringify(ast(a)) === JSON.stringify(ast(b))});
}
console.log(JSON.stringify(result));
