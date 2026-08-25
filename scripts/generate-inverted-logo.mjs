/**
 * Generate an inverted Prestair logo as JPEG base64
 * Original: dark blue bg, white text, red PS element
 * Inverted: white bg, dark blue text, grey PS element
 * 
 * Run: node scripts/generate-inverted-logo.mjs
 */

import { createCanvas } from "canvas";
import fs from "fs";

const WIDTH = 550;
const HEIGHT = 180;

const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext("2d");

// White background
ctx.fillStyle = "#ffffff";
ctx.fillRect(0, 0, WIDTH, HEIGHT);

// Dark blue color for text
const DARK_BLUE = "#1a3a6b";
// Light grey for the PS area (was red)
const LIGHT_GREY = "#e0e0e0";

// Draw the "PS" circle/element (top-right of "Prestair" text area)
// This was originally red, now light grey
ctx.beginPath();
ctx.arc(370, 55, 35, 0, Math.PI * 2);
ctx.fillStyle = LIGHT_GREY;
ctx.fill();

// "PS" letters inside the circle in dark blue
ctx.font = "bold italic 30px Georgia, serif";
ctx.fillStyle = DARK_BLUE;
ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.fillText("PS", 370, 55);

// "Prestair" text - bold italic
ctx.font = "bold italic 58px Georgia, serif";
ctx.fillStyle = DARK_BLUE;
ctx.textAlign = "left";
ctx.textBaseline = "alphabetic";
ctx.fillText("Prestair", 20, 65);

// Draw a subtle swoosh/underline (was red, now dark blue)
ctx.beginPath();
ctx.moveTo(20, 75);
ctx.quadraticCurveTo(180, 90, 350, 72);
ctx.strokeStyle = DARK_BLUE;
ctx.lineWidth = 3;
ctx.lineCap = "round";
ctx.stroke();

// "Systems LLP" text
ctx.font = "bold 32px Arial, sans-serif";
ctx.fillStyle = DARK_BLUE;
ctx.textAlign = "left";
ctx.fillText("Systems LLP", 20, 118);

// "SINCE 1982" text
ctx.font = "bold 20px Arial, sans-serif";
ctx.fillStyle = DARK_BLUE;
ctx.fillText("SINCE 1982", 20, 150);

// Convert to JPEG base64
const buffer = canvas.toBuffer("image/jpeg", { quality: 0.92 });
const base64 = buffer.toString("base64");
const dataUri = `data:image/jpeg;base64,${base64}`;

// Write to prestairLogoData.ts
const tsContent = `// Prestair Systems LLP logo as JPEG with white background (inverted colors)
// White bg, dark blue text, grey PS element
export const PRESTAIR_LOGO_BASE64 = "${dataUri}";
`;

fs.writeFileSync("lib/prestairLogoData.ts", tsContent);
console.log("Done! Updated lib/prestairLogoData.ts with inverted logo.");
console.log(`Base64 length: ${base64.length} chars`);
