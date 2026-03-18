const m = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI;
const empSchema = new m.Schema({name:String,role:String,supervisorUserId:m.Schema.Types.ObjectId,department:String,isActive:Boolean,createdAt:{type:Date,default:Date.now}}, {collection:'employees'});
const userSchema = new m.Schema({name:String,email:String,role:String}, {collection:'users'});
const E = m.model('E', empSchema);
const U = m.model('U', userSchema);

(async () => {
  try {
    await m.connect(mongoUri);
    console.log('Conectado');
    
    const csvPath = '/app/frontend/public/Pasta1.csv';
    const csv = fs.readFileSync(csvPath, 'utf-8');
    const lines = csv.split('\n').slice(1);
    
    const sups = await U.find({role:'supervisor'});
    const supMap = {};
    sups.forEach(s => { supMap[s.name.toUpperCase()] = s._id; });
    
    await E.deleteMany({});
    
    let created = 0;
    for(const line of lines) {
      if(!line.trim()) continue;
      const pts = line.split(';');
      if(pts.length < 2) continue;
      const supName = (pts[0]||'').trim().toUpperCase();
      const empName = (pts[1]||'').trim();
      const role = (pts[2]||'FUNCIONÁRIO').trim();
      const supId = supMap[supName];
      if(!supId) continue;
      try {
        await E.create({name:empName, role:role, supervisorUserId:supId, isActive:true, department:supName});
        created++;
        if(created % 20 === 0) process.stdout.write(String(created/20));
      } catch(e) {}
    }
    const tot = await E.countDocuments();
    console.log(\\\nCriados: \, Total: \\);
    await m.disconnect();
  } catch(e) { console.error(e.message); process.exit(1); }
})();
