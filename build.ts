import { build } from "bun";
import { copyFile, mkdir, rm, readdir, writeFile } from "fs/promises";
import { join } from "path";
import { spawnSync } from "child_process";

const outDir = "./dist";
const srcDir = "./src";

// Check for production flag
const isProd = process.argv.includes('--prod');

console.log(`Building in ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} mode...`);

console.log("Cleaning dist/...");
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await mkdir(join(outDir, "icons"), { recursive: true });

console.log("Building TypeScript files...");
const result = await build({
    entrypoints: [
        join(srcDir, "background.ts"),
        join(srcDir, "content.ts"),
        join(srcDir, "popup.ts"),
        join(srcDir, "options.ts"),
        join(srcDir, "onboarding.ts"),
    ],
    outdir: outDir,
    target: "browser",
    minify: isProd,
    sourcemap: isProd ? "none" : "inline",
    define: {
        __DEV__: isProd ? 'false' : 'true',
    },
});

if (!result.success) {
    console.error("Build failed");
    for (const message of result.logs) {
        console.error(message);
    }
    process.exit(1);
}

console.log("Copying static files...");
const staticFiles = [
    "manifest.json",
    "popup.html",
    "options.html",
    "onboarding.html",
    "styles.css",
    "fonts.css",
    "theme.css",
];

for (const file of staticFiles) {
    try {
        await copyFile(join(srcDir, file), join(outDir, file));
    } catch (e) {
        // Ignore missing files during initial dev
    }
}

console.log("Copying icons...");
try {
    const iconFiles = await readdir(join(srcDir, "icons"));
    for (const icon of iconFiles) {
        if (icon.endsWith(".png")) {
            await copyFile(join(srcDir, "icons", icon), join(outDir, "icons", icon));
        }
    }

    // Copy platform icons
    const platformIconsDir = join(srcDir, "icons", "platforms");
    const platformOutDir = join(outDir, "icons", "platforms");
    await mkdir(platformOutDir, { recursive: true });

    try {
        const platformFiles = await readdir(platformIconsDir);
        for (const icon of platformFiles) {
            if (icon.endsWith(".svg")) {
                await copyFile(join(platformIconsDir, icon), join(platformOutDir, icon));
            }
        }
        console.log(`  ✓ Copied ${platformFiles.length} platform icons`);
    } catch (e) {
        console.error("  Error copying platform icons:", e);
    }
} catch (e) {
    console.error("Error copying icons:", e);
}

// Copy fonts
console.log("Copying fonts...");
try {
    const fontsOutDir = join(outDir, "fonts");
    await mkdir(fontsOutDir, { recursive: true });
    const fontFiles = await readdir(join(srcDir, "fonts"));
    for (const font of fontFiles) {
        if (font.endsWith(".woff2") || font.endsWith(".woff")) {
            await copyFile(join(srcDir, "fonts", font), join(fontsOutDir, font));
        }
    }
    console.log(`  ✓ Copied ${fontFiles.length} font files`);
} catch (e) {
    console.error("Error copying fonts:", e);
}

// Create ZIP for Chrome Web Store upload in production mode
if (isProd) {
    console.log("Creating ZIP package for Chrome Web Store...");

    // Remove existing zip
    try {
        await rm("./at10tion-extension.zip", { force: true });
    } catch { }

    // Use system zip command
    const zipResult = spawnSync("zip", ["-r", "../at10tion-extension.zip", "."], {
        cwd: outDir,
        stdio: "inherit"
    });

    if (zipResult.status === 0) {
        console.log("[OK] ZIP created: at10tion-extension.zip");
    } else {
        console.error("[ERR] Failed to create ZIP. Install zip utility or manually archive dist/");
    }
}

console.log(`\n[OK] Build complete! Output in ${outDir}/`);

if (isProd) {
    console.log("\nProduction build ready for Chrome Web Store upload:");
    console.log("  1. ZIP file: at10tion-extension.zip");
    console.log("  2. Or upload dist/ folder contents directly");
}
