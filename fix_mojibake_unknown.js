const fs = require("fs");

const files = [
  "frontend/components/bolt/DecisionBrief.tsx",
  "frontend/components/bolt/DataHealthScreen.tsx",
  "frontend/components/bolt/DataScreens.tsx",
  "frontend/components/bolt/InvestigationScreen.tsx"
];

const unknown = String.fromCharCode(65533);

files.forEach(p => {
  let c = fs.readFileSync(p, "utf-8");
  
  c = c.replace(new RegExp(unknown + " ", "g"), "˜ ");
  c = c.replace(new RegExp(unknown + "\\^'", "g"), "~");
  c = c.replace(new RegExp(unknown + " \\^'", "g"), "~");
  c = c.replace(new RegExp(unknown, "g"), "·");
  
  fs.writeFileSync(p, c, "utf-8");
});
