const fs = require('fs');
const path = require('path');

// Read the version from package.json
const packageJson = require('./package.json');
const version = packageJson.version;

// Banner to prepend to files
const banner = `
 /*!
 * ts-runtime-picker v${version}
 * (c) HichemTab-tech
 * Released under the MIT License.
 * Github: https://github.com/HichemTab-tech/ts-runtime-picker
 * Generated on: ${new Date().toLocaleDateString()}
 */
`;

// Directory to process
const distDir = path.join(__dirname, 'dist');

// Prepend banner to all `.js` files in the dist directory
function addBannerToFiles(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isFile() && file.endsWith('.js')) {
            const content = fs.readFileSync(filePath, 'utf8');
            fs.writeFileSync(filePath, `${banner}\n${content}`);
            console.log(`Added banner to: ${file}`);
        } else if (stat.isDirectory()) {
            addBannerToFiles(filePath);
        }
    }
}

addBannerToFiles(distDir);
