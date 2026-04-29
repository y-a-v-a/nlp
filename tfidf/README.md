# TF-IDF Document Search

TF-IDF (Term Frequency–Inverse Document Frequency) is a technique from information retrieval, developed through the 1970s–80s. Unlike the Markov chain approaches in this project (which generate text word by word), TF-IDF shifts the goal: **given a collection of documents, which words best describe each one?**

## The Core Idea

Not all word frequencies are equally meaningful. The word "the" appears constantly in every sonnet — its frequency tells you nothing distinctive about any particular one. The word "trenches", appearing in just one sonnet, is highly informative about that sonnet's content.

TF-IDF captures this by combining two measurements:

### Term Frequency (TF)

How often does this word appear in *this* document?

```
TF(word, document) = count of word in document / total words in document
```

A word appearing 3 times in a 100-word document has TF = 0.03.

### Inverse Document Frequency (IDF)

How rare is this word *across all documents*?

```
IDF(word) = log(total documents / documents containing word)
```

- A word appearing in every document → `log(154/154)` = **0.0** (no discriminating power)
- A word appearing in only 1 document → `log(154/1)` ≈ **5.04** (highly distinctive)

### TF-IDF

Multiply them together:

```
TF-IDF(word, document) = TF(word, document) × IDF(word)
```

A word scores high only when it is **frequent in this document AND rare across all documents**. Common words like "the" have IDF ≈ 0 so they always score near zero, regardless of how often they appear.

## Example Data Structure

```js
// After computing TF-IDF across 154 sonnets:
{
  // Sonnet 2 ("When forty winters shall besiege thy brow")
  sonnet_2: {
    "forty":    { tf: 0.0085, idf: 5.0370, tfidf: 0.0431 },
    "trenches": { tf: 0.0085, idf: 5.0370, tfidf: 0.0431 },
    "brow":     { tf: 0.0171, idf: 2.5903, tfidf: 0.0443 },
    "the":      { tf: 0.0342, idf: 0.0000, tfidf: 0.0000 },  // too common to matter
    // ...
  }
}
```

## How Document Search Works

To search for a query like `"summer"`:

1. Look up the TF-IDF score for `"summer"` in each sonnet
2. Rank sonnets by that score
3. The highest-scoring sonnets are the most relevant

For multi-word queries like `"love beauty"`, sum the TF-IDF scores for each query word per document, then rank.

This is the core of how early search engines ranked documents before neural approaches.

## Usage

```bash
node index.js <path-to-text-file> [query]
```

### Parameters

- `<path-to-text-file>`: Path to the input text file (required). The file is split into documents by blank lines.
- `[query]`: One or more words to search for (optional). If omitted, displays sample TF-IDF scores.

### Examples

```bash
# Show sample TF-IDF scores for the first 3 sonnets
node index.js ../corpora/sonnets-shakespeare.txt

# Find sonnets most relevant to "summer"
node index.js ../corpora/sonnets-shakespeare.txt summer

# Find sonnets most relevant to both "love" and "beauty"
node index.js ../corpora/sonnets-shakespeare.txt love beauty
```

## Why This Matters

TF-IDF sits at a historical turning point in NLP:

- The Markov chain approaches in this project model **transitions between words** — they're generative, sequence-based models
- TF-IDF models **documents as bags of weighted words** — the order doesn't matter, but the significance of each word does

This bag-of-words representation, with TF-IDF weighting, underpinned information retrieval systems for decades and is still used today in search engines, document clustering, and as a baseline for text classification. It also set the stage for word embeddings (Word2Vec, 2013), which replaced hand-crafted frequency statistics with learned vector representations.
