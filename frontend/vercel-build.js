// This file is used by Vercel to handle builds
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Run the normal build process
console.log("Running Vite build...");
execSync("npm run build", { stdio: "inherit" });

// Ensure the dist directory exists
const distDir = path.join(__dirname, "dist");
if (!fs.existsSync(distDir)) {
  console.error("Build failed: dist directory does not exist");
  process.exit(1);
}

// Create a Vercel-specific 404.html that redirects to index.html
const notFoundPath = path.join(distDir, "404.html");
const notFoundContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <script>
    // Single Page Apps for GitHub Pages or Vercel
    // This script takes the current URL and converts the path and query
    // string into just a query string, and then redirects the browser
    // to the new URL with only a query string.
    var pathSegmentsToKeep = 0;
    var l = window.location;
    l.replace(
      l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
      l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/?/' +
      l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
      (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
      l.hash
    );
  </script>
</head>
<body>
  Redirecting...
</body>
</html>
`;

fs.writeFileSync(notFoundPath, notFoundContent);
console.log("Created 404.html for SPA routing support");

// Add special handling for SPA routing in index.html
const indexPath = path.join(distDir, "index.html");
let indexContent = fs.readFileSync(indexPath, "utf8");

// Add the redirect script if it's not already there
if (!indexContent.includes('window.location.pathname.startsWith("/?/")')) {
  const scriptToAdd = `
  <script>
    // This script checks if a redirect is needed and removes the URL interpolation
    (function() {
      // Parse the URL
      var loc = window.location;
      if (loc.pathname.startsWith('/?/')) {
        // The URL has our redirect format, let's transform it back
        var redirectPath = loc.pathname.substring(3) || '/';
        var queryParams = loc.search.replace(/~and~/g, '&');
        var newUrl = redirectPath + queryParams + loc.hash;
        
        // Go to the correct URL without the ?/ prefix
        history.replaceState(null, null, newUrl);
      }
    })();
  </script>
  `;

  // Insert the script right before the closing head tag
  indexContent = indexContent.replace("</head>", scriptToAdd + "</head>");
  fs.writeFileSync(indexPath, indexContent);
  console.log("Updated index.html with SPA redirect handling");
}

console.log("Vercel build completed successfully");
