const fs = require("fs");
const path = require("path");
const filePath = path.join(__dirname, "src", "App.jsx");
let content = fs.readFileSync(filePath, "utf8");
const replacements = [
  {
    from: /background:\s*requestType === "commandant" \? "#E6F1FB" : "#fff"/g,
    to: 'background: requestType === "commandant" ? (isDarkMode ? theme.surface : "#E6F1FB") : (isDarkMode ? theme.surface : "#fff")'
  },
  {
    from: /background:\s*requestType === "cadet" \? "#E6F1FB" : "#fff"/g,
    to: 'background: requestType === "cadet" ? (isDarkMode ? theme.surface : "#E6F1FB") : (isDarkMode ? theme.surface : "#fff")'
  },
  {
    from: /background:\s*tab === id \? "#E6F1FB" : "#fff"/g,
    to: 'background: tab === id ? (isDarkMode ? theme.surface : "#E6F1FB") : (isDarkMode ? theme.surface : "#fff")'
  },
  {
    from: /background:\s*showSupply \? "#185FA5" : "#fff"/g,
    to: 'background: showSupply ? "#185FA5" : (isDarkMode ? theme.surface : "#fff")'
  },
  {
    from: /background:\s*qty > 0 \? "#FEF9C3" : "#fff"/g,
    to: 'background: qty > 0 ? (isDarkMode ? theme.surface : "#FEF9C3") : (isDarkMode ? theme.surface : "#fff")'
  },
  {
    from: /background:\s*isAlert \? "#FEF2F2" : "#fff"/g,
    to: 'background: isAlert ? (isDarkMode ? theme.surface : "#FEF2F2") : (isDarkMode ? theme.surface : "#fff")'
  },
  {
    from: /background:\s*item\.in_stock \? "#dcfce7" : "#fff"/g,
    to: 'background: item.in_stock ? (isDarkMode ? theme.surface : "#dcfce7") : (isDarkMode ? theme.surface : "#fff")'
  },
  {
    from: /background:\s*!item\.in_stock \? "#fee2e2" : "#fff"/g,
    to: 'background: !item.in_stock ? (isDarkMode ? theme.surface : "#fee2e2") : (isDarkMode ? theme.surface : "#fff")'
  },
  {
    from: /background:\s*bat\.status === "active" \? "#dcfce7" : "#f3f4f6"/g,
    to: 'background: bat.status === "active" ? (isDarkMode ? theme.surface : "#dcfce7") : (isDarkMode ? theme.surface : "#f3f4f6")'
  },
  {
    from: /background:\s*inStock > 0 \? "#dcfce7" : "#f3f4f6"/g,
    to: 'background: inStock > 0 ? (isDarkMode ? theme.surface : "#dcfce7") : (isDarkMode ? theme.surface : "#f3f4f6")'
  },
  {
    from: /background:\s*req\.request_type === "cadet" \? "#fef3c7" : "#E6F1FB"/g,
    to: 'background: req.request_type === "cadet" ? (isDarkMode ? theme.surface : "#fef3c7") : (isDarkMode ? theme.surface : "#E6F1FB")'
  },
  {
    from: /background:\s*user\.status === s\.value \? s\.bg : "#fff"/g,
    to: 'background: user.status === s.value ? s.bg : (isDarkMode ? theme.surface : "#fff")'
  },
  {
    from: /background:\s*\(user\.status === s\.value \|\| \(!user\.status && s\.value === "active"\)\) \? s\.bg : "#fff"/g,
    to: 'background: (user.status === s.value || (!user.status && s.value === "active")) ? s.bg : (isDarkMode ? theme.surface : "#fff")'
  },
  {
    from: /background:\s*bat\.status === s\.value \? s\.bg : "#fff"/g,
    to: 'background: bat.status === s.value ? s.bg : (isDarkMode ? theme.surface : "#fff")'
  },
  {
    from: /background:\s*isAlert \? "#fee2e2" : inStock > 0 \? "#dcfce7" : "#f3f4f6"/g,
    to: 'background: isAlert ? (isDarkMode ? theme.surface : "#fee2e2") : inStock > 0 ? (isDarkMode ? theme.surface : "#dcfce7") : (isDarkMode ? theme.surface : "#f3f4f6")'
  },
  {
    from: /color:\s*"#6b7280"/g,
    to: 'color: theme.textSecondary'
  },
  {
    from: /"#6b7280"/g,
    to: 'theme.textSecondary'
  },
  {
    from: /"#9ca3af"/g,
    to: 'theme.textSecondary'
  },
  {
    from: /color:\s*"#111827"/g,
    to: 'color: theme.text'
  },
  {
    from: /"#111827"/g,
    to: 'theme.text'
  },
  {
    from: /border:\s*"0\.5px solid #e5e7eb"/g,
    to: 'border: `0.5px solid ${cardBorderSoft}`'
  },
  {
    from: /borderBottom:\s*"0\.5px solid #e5e7eb"/g,
    to: 'borderBottom: `0.5px solid ${cardBorderSoft}`'
  },
  {
    from: /borderTop:\s*"0\.5px solid #e5e7eb"/g,
    to: 'borderTop: `0.5px solid ${cardBorderSoft}`'
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
console.log(`Applied ${applied} targeted theme replacements to src/App.jsx`);
