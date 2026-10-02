const fs = require("fs");
const path = require("path");

const directory = "frontend/components/bolt";
const files = fs.readdirSync(directory);

files.forEach(file => {
  if (file.endsWith(".tsx")) {
    const p = path.join(directory, file);
    let c = fs.readFileSync(p, "utf-8");
    
    // specifically target known corrupted strings
    c = c.replace(/%\^/g, "˜");
    c = c.replace(/\^'/g, "~");
    c = c.replace(/NovaMart A/g, "NovaMart ·");
    c = c.replace(/A/g, "·");
    c = c.replace(/\?"\?.*?\?"\?/g, ""); // clear weird comments
    c = c.replace(/\/\* \?".*?\*\//g, ""); // clear weird comments
    c = c.replace(//g, ""); // remove any leftover unknown chars
    
    fs.writeFileSync(p, c, "utf-8");
  }
});
