const fs = require('fs');

const content = fs.readFileSync('C:/Users/sadha/.gemini/antigravity/brain/391f7f2a-6a04-4fff-8805-339e1c21d82c/.system_generated/steps/16/content.md', 'utf8');

// The JS file contains something like characters or jinxes array. Let's try to extract JSON-like structures.
// Let's find "id":"..." and "jinx"...
// A better way: just print out all text around the word "jinx"
let matches = [...content.matchAll(/.{0,80}jinx.{0,80}/gi)];
for (let i = 0; i < Math.min(20, matches.length); i++) {
    console.log(`--- Match ${i} ---`);
    console.log(matches[i][0]);
}
