const farsiText = "سلام چطوری؟ خوش آمدید.";
const oldRegex = /\n|(\w+\s?-\s?\w+)|[\wÀ-ÿ]+|[^\w\s]/g;
const newRegex = /\n|(\p{L}+\p{M}*\s?-\s?\p{L}+\p{M}*)|[\p{L}\p{M}-]+|[^\p{L}\p{M}\s]/gu;

console.log("Old Regex Tokens:");
console.log(farsiText.match(oldRegex));

console.log("\nNew Regex Tokens:");
console.log(farsiText.match(newRegex));
