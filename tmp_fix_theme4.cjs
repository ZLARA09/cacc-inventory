const fs = require("fs");
const path = require("path");
const filePath = path.join(__dirname, "src", "App.jsx");
let content = fs.readFileSync(filePath, "utf8");
const replacements = [
  { from: /background:\s*"#ffffff"/g, to: 'background: isDarkMode ? theme.surface : "#ffffff"' },
  { from: /background:\s*"#fff"/g, to: 'background: isDarkMode ? theme.surface : "#fff"' },
  { from: /background:\s*"#f8fafc"/g, to: 'background: isDarkMode ? theme.surface : "#f8fafc"' },
  { from: /background:\s*"#f3f4f6"/g, to: 'background: isDarkMode ? theme.surface : "#f3f4f6"' },
  { from: /background:\s*"#e5e7eb"/g, to: 'background: isDarkMode ? theme.surface : "#e5e7eb"' },
  { from: /background:\s*"#E6F1FB"/g, to: 'background: isDarkMode ? theme.surface : "#E6F1FB"' },
  { from: /background:\s*"#EAF3DE"/g, to: 'background: isDarkMode ? theme.surface : "#EAF3DE"' },
  { from: /background:\s*"#dcfce7"/g, to: 'background: isDarkMode ? theme.surface : "#dcfce7"' },
  { from: /background:\s*"#fee2e2"/g, to: 'background: isDarkMode ? theme.surface : "#fee2e2"' },
  { from: /background:\s*"#fef3c7"/g, to: 'background: isDarkMode ? theme.surface : "#fef3c7"' },
  { from: /background:\s*"#FEF2F2"/g, to: 'background: isDarkMode ? theme.surface : "#FEF2F2"' },
  { from: /background:\s*"#FEF9C3"/g, to: 'background: isDarkMode ? theme.surface : "#FEF9C3"' },
  { from: /background:\s*"#fef9c3"/g, to: 'background: isDarkMode ? theme.surface : "#fef9c3"' },
  { from: /color:\s*"#6b7280"/g, to: 'color: theme.textSecondary' },
  { from: /color:\s*"#9ca3af"/g, to: 'color: theme.textSecondary' },
  { from: /color:\s*"#111827"/g, to: 'color: theme.text' },
  { from: /color:\s*"#111"/g, to: 'color: theme.text' },
  { from: /borderBottom:\s*"0\.5px solid #e5e7eb"/g, to: 'borderBottom: `0.5px solid ${cardBorderSoft}`' },
  { from: /borderTop:\s*"0\.5px solid #f3f4f6"/g, to: 'borderTop: `0.5px solid ${cardBorderSoft}`' },
  { from: /border:\s*"0\.5px solid #d1d5db"/g, to: 'border: `0.5px solid ${cardBorderSoft}`' },
  { from: /border:\s*"1px solid #d1d5db"/g, to: 'border: `1px solid ${cardBorderSoft}`' },
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
console.log(`Applied ${applied} theme-safe replacements to src/App.jsx`);
