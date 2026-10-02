const fs = require('fs');

const file = 'frontend/components/bolt/DecisionBrief.tsx';
let c = fs.readFileSync(file, 'utf-8');

c = c.replace(/value: \.*?\\\$\{calc.netLossProbability\}%\/g, 'value: \˜ \%\');
c = c.replace(/NovaMart.*?pricing decision/g, 'NovaMart · pricing decision');
c = c.replace(/Decision brief.*?version 1\.0.*?NovaMart benchmark database/g, 'Decision brief · version 1.0 · NovaMart benchmark database');
c = c.replace(/tabular-nums.*?\/g, 'tabular-nums">~');
c = c.replace(/magnitude: f\.quantified_impact \? \.*?\$\{formatCurrency\(f\.quantified_impact\)\} impact\/g, 'magnitude: f.quantified_impact ? \˜\ impact\');

fs.writeFileSync(file, c, 'utf-8');
