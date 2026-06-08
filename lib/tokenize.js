/**
 * Shared tokenizer for the NLP Journey demos.
 *
 * Every technique in this repository starts from the same surface
 * representation of text, so that differences in output come from the
 * algorithm being demonstrated — not from inconsistent preprocessing.
 *
 * The steps are deliberately simple and inspectable:
 *
 *   1. Normalise "smart" curly quotes/apostrophes to plain ASCII. The
 *      sonnet corpora use U+2019 (’) in words like "beauty’s", so without
 *      this step those characters would either survive into tokens or be
 *      stripped inconsistently across demos.
 *   2. Lowercase, so "The" and "the" are the same token.
 *   3. Remove apostrophes so contractions and possessives stay whole:
 *      "beauty’s" -> "beautys", "feed’st" -> "feedst". Replacing them with
 *      a space instead would scatter stray "s"/"st"/"d" tokens through the
 *      output and pollute every downstream count.
 *   4. Replace the remaining punctuation with spaces. Using a space rather
 *      than an empty string means a hyphenated word like "self-substantial"
 *      becomes two tokens ("self", "substantial") rather than one fused
 *      token.
 *   5. Split on whitespace and drop empty tokens.
 *
 * This is intentionally a bag-of-characters approach to punctuation: it is
 * good enough for the statistical techniques here and easy to reason about.
 * Later subprojects (e.g. byte-pair encoding) exist precisely to question
 * whether the word is the right unit at all.
 *
 * @param {string} text raw input text
 * @returns {string[]} lowercase word tokens, in order, with no empties
 */
function tokenize(text) {
  return text
    .replace(/[‘’‚‛]/g, "'") // ‘ ’ ‚ ‛  -> '
    .replace(/[“”„‟]/g, '"') // “ ” „ ‟  -> "
    .toLowerCase()
    .replace(/'/g, '') // apostrophes removed: contractions/possessives stay whole
    .replace(/[.,\/#!$%^&*;:{}=\-_`~()"?]/g, ' ') // other punctuation -> space
    .split(/\s+/)
    .filter((word) => word.length > 0);
}

module.exports = { tokenize };
