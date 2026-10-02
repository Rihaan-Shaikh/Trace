const fs = require("fs");
const path = require("path");

const directory = "frontend/components/bolt";
const files = fs.readdirSync(directory);

files.forEach(file => {
  if (file.endsWith(".tsx")) {
    const p = path.join(directory, file);
    let c = fs.readFileSync(p, "utf-8");
    
    c = c.replace(/≈/g, "�");
    c = c.replace(/·/g, "�");
    c = c.replace(/−/g, "-");
    c = c.replace(/’/g, "'");
    c = c.replace(/–/g, "-");
    
    fs.writeFileSync(p, c, "utf-8");
  }
});
