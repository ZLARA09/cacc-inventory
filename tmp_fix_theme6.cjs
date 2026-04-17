const fs = require("fs");
const path = require("path");
const filePath = path.join(__dirname, "src", "App.jsx");
let content = fs.readFileSync(filePath, "utf8");
const replacements = [
  {
    from: /background:\s*isCurrent \? "#185FA5" : isDone \? "#dcfce7" : "#f3f4f6"/g,
    to: 'background: isCurrent ? "#185FA5" : isDone ? (isDarkMode ? theme.surface : "#dcfce7") : (isDarkMode ? theme.surface : "#f3f4f6")'
  },
  {
    from: /border:\s*isCurrent \? "none" : "0\.5px solid #e5e7eb"/g,
    to: 'border: isCurrent ? "none" : `0.5px solid ${cardBorderSoft}`'
  },
  {
    from: /background:\s*isDone \|\| isCurrent \? "#185FA5" : "#e5e7eb"/g,
    to: 'background: isDone || isCurrent ? "#185FA5" : (isDarkMode ? theme.border : "#e5e7eb")'
  },
  {
    from: /background:\s*"#dbeafe"/g,
    to: 'background: isDarkMode ? theme.surface : "#dbeafe"'
  },
  {
    from: /color:\s*"#1e3a8a"/g,
    to: 'color: isDarkMode ? theme.text : "#1e3a8a"'
  },
  {
    from: /color:\s*"#27500A"/g,
    to: 'color: isDarkMode ? theme.text : "#27500A"'
  },
  {
    from: /color:\s*"#0C447C"/g,
    to: 'color: isDarkMode ? theme.text : "#0C447C"'
  },
  {
    from: /color:\s*"#92400e"/g,
    to: 'color: isDarkMode ? theme.text : "#92400e"'
  },
  {
    from: /color:\s*"#166534"/g,
    to: 'color: isDarkMode ? theme.text : "#166534"'
  },
  {
    from: /background:\s*bat\.status === "active" \? "#dcfce7" : "#f3f4f6"/g,
    to: 'background: bat.status === "active" ? (isDarkMode ? theme.surface : "#dcfce7") : (isDarkMode ? theme.surface : "#f3f4f6")'
  },
  {
    from: /background:\s*inStock > 0 \? "#dcfce7" : "#f3f4f6"/g,
    to: 'background: inStock > 0 ? (isDarkMode ? theme.surface : "#dcfce7") : (isDarkMode ? theme.surface : "#f3f4f6")'
  }
];
let applied = 0;
for (const { from, to } of replacements) {
  const matches = content.match(from);
  if (matches) {
    content = content.replace(from, to);
    applied += matches.length;
  }
}
fs.writeFileSync(filePath, content, "utf8");
console.log(`Applied ${applied} more dark mode patches to src/App.jsx`);
