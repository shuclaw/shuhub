const { SandboxModule } = require('./modules/sandbox');
const s = new SandboxModule();
s.init({provider:'docker',config:{image:'python:3.11-slim',network:false,memory:'128m',timeout:30000}}).then(()=>{
    return s.execute('print(42)', 'python');
}).then(r=>{
    console.log('Success:', r.success);
    console.log('Exit:', r.exitCode);
    console.log('Stderr:', r.stderr);
    process.exit(0);
}).catch(e=>{console.error(e.message);process.exit(1);});
