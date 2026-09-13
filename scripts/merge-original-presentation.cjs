// Emits proposed source edits as JSON; never writes application files.
// Match identical semantic JSX subtrees before borrowing their original classes.
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('@babel/parser');
const root = path.resolve(__dirname, '../src');
const original = path.resolve(__dirname, '../../../Recruitment-AI/admin/src');
const ignored = new Set(['start','end','loc','extra','comments','leadingComments','trailingComments','innerComments']);
function clean(v) {
  if (Array.isArray(v)) return v.filter(x => !(x?.type === 'JSXAttribute' && x.name?.name === 'className')).map(clean);
  if (!v || typeof v !== 'object') return v;
  if (v.type === 'JSXText') return {type:v.type,value:v.value.trim().replace(/\s+/g,' ')};
  return Object.fromEntries(Object.entries(v).filter(([k]) => !ignored.has(k)).map(([k,x]) => [k,clean(x)]));
}
function visit(n, cb) {
  if (!n || typeof n !== 'object') return;
  if (Array.isArray(n)) { n.forEach(x => visit(x,cb)); return; }
  cb(n);
  for (const [k,v] of Object.entries(n)) if (!ignored.has(k)) visit(v,cb);
}
const palette = {
  '#176B45':'#0E3B2E', '#125638':'#147A40', '#17221C':'#0C1F1B', '#09090B':'#0C1F1B',
  '#18181B':'#162420', '#3F3F46':'#24332E', '#64736A':'#5B6B63', '#71717A':'#5B6B63',
  '#9BAAA1':'#5B6B63', '#A1A1AA':'#5B6B63', '#E5EBE7':'#E3EBE4', '#E4E4E7':'#E3EBE4',
  '#D4D4D8':'#C5D2C8', '#C7DDD1':'#C5D2C8', '#C7D4CC':'#C5D2C8', '#D7E0DA':'#C5D2C8',
  '#F8FAF9':'#FAFCF8', '#FAFAFA':'#FAFCF8', '#F1F7F3':'#F3F7F1', '#F4F4F5':'#F3F7F1',
  '#DDECE3':'#E3EBE4', '#E8F2EC':'#EAF8E4', '#DDF1E5':'#EAF8E4', '#238653':'#147A40',
  '#F5EDD8':'#FFF6E0', '#A88A45':'#8A5E09', '#F8EAEA':'#FDECEC', '#C95C5C':'#B23B33'
};
const result=[];
for (const rel of process.argv.slice(2)) {
  const filename=path.join(root,rel), before=fs.readFileSync(filename,'utf8');
  const sourcePath=path.join(original,rel), edits=[];
  if (fs.existsSync(sourcePath)) {
    const source=fs.readFileSync(sourcePath,'utf8'), matches=new Map();
    visit(parse(source,{sourceType:'module',plugins:['jsx']}), n => {
      if(n.type!=='JSXElement') return;
      const attr=n.openingElement.attributes.find(a=>a.name?.name==='className');
      if(!attr) return;
      const key=JSON.stringify(clean(n));
      const value=source.slice(attr.start,attr.end);
      matches.set(key,matches.has(key)&&matches.get(key)!==value ? null : value);
    });
    visit(parse(before,{sourceType:'module',plugins:['jsx']}), n => {
      if(n.type!=='JSXElement') return;
      const attr=n.openingElement.attributes.find(a=>a.name?.name==='className');
      if(!attr) return;
      const old=before.slice(attr.start,attr.end), next=matches.get(JSON.stringify(clean(n)));
      // Preserve the verified narrow-screen pipeline sizing and responsive action wrapper.
      if(!next || old.includes('calc(100vh') || old.includes('max-h-[70vh]')) return;
      if(old!==next) edits.push({start:attr.start,end:attr.end,next});
    });
  }
  let after=before;
  for(const e of edits.sort((a,b)=>b.start-a.start)) after=after.slice(0,e.start)+e.next+after.slice(e.end);
  after=after.replace(/#[0-9A-Fa-f]{6}\b/g, hex=>palette[hex.toUpperCase()]||hex);
  after=after.replaceAll('bg-[#0E3B2E]-soft','bg-brand-50').replaceAll('hover:bg-[#0E3B2E]-dark','hover:bg-brand-700').replaceAll('border-[#E3EBE4]-mid','border-hairline');
  if(after!==before) result.push({file:rel,before,after,matchedClasses:edits.length});
}
console.log(JSON.stringify(result));
