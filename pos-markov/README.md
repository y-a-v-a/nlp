# POS-Tagged Markov Chain Text Generator

This implementation combines a Markov chain with **Part-of-Speech (POS) tagging**. Where the plain Markov chain (`../markov/`) tracks only which word follows which, this one labels every word with its grammatical role first and makes the chain's state a `(word, POS)` pair. The walk is then steered by grammar as well as by raw adjacency, producing output that respects sentence structure a little more closely.

## What are Parts of Speech?

Parts of speech are grammatical categories describing how a word functions:

- **Nouns**: people, places, things (`beauty`, `summer`, `world`)
- **Verbs**: actions or states (`is`, `shall`, `compare`)
- **Adjectives**: describe nouns (`fair`, `sweet`, `eternal`)
- **Adverbs**: describe verbs/adjectives (`now`, `never`, `sweetly`)
- **Pronouns**: stand in for nouns (`thou`, `thee`, `it`)
- **Prepositions**: show relationships (`in`, `upon`, `from`)
- **Conjunctions**: connect words/phrases (`and`, `but`, `nor`)
- **Determiners**: introduce nouns (`the`, `a`, `thy`)

## How It Works

1. **Tokenize** with the shared `lib/tokenize.js`, so preprocessing is identical to every other technique here.
2. **Tag** each token with a part of speech (see *The tagger* below).
3. **Build the chain** keyed by `word|POS` states. Each state maps to the list of states seen to follow it, with repeats — so picking a follower uniformly at random already favours more frequent transitions. (The plain Markov core keeps only *distinct* followers and is genuinely frequency-blind; this chain comes after the probability-based variants in the journey, so the frequency-weighting idea stays folded in via the repeats.)
4. **Generate** by walking the chain: start at a random state, repeatedly pick a follower; if a state has no recorded followers, jump to a random one.

### The tagger

This repository is deliberately **dependency-free, no-build, no-CDN** — the same files run under Node and in the browser. So instead of pulling in an external NLP library, `core.js` ships a tiny, transparent tagger:

- a **lexicon** of the closed-class function words (determiners, pronouns, prepositions, conjunctions, auxiliary/be verbs, common adverbs) — the words English almost never adds to; and
- a short list of **suffix rules** for open-class words: `-ly`→adverb, `-ing`/`-ed`/`-eth`→verb, `-ous`/`-ful`/`-ive`/`-less`→adjective, `-ness`/`-ment`/`-tion`→noun, …
- everything else **defaults to noun**, the largest open class.

This is the classic *baseline* tagger (in the lineage of TAGGIT, 1971) that every smarter model is measured against. It has no idea of context — "rose" is always a noun to it, even in "they rose" — and that imperfection is part of the lesson: it shows exactly why later taggers look at a word's neighbours.

## Data Structure Example

```js
{
  'the|Determiner': [
    { word: 'world', tag: 'Noun', key: 'world|Noun' },
    { word: 'sun',   tag: 'Noun', key: 'sun|Noun' },
    { word: 'very',  tag: 'Adverb', key: 'very|Adverb' }
  ],
  'fair|Adjective': [
    { word: 'youth', tag: 'Noun', key: 'youth|Noun' },
    { word: 'and',   tag: 'Conjunction', key: 'and|Conjunction' }
  ]
}
```

Determiners are followed overwhelmingly by nouns (and the occasional adjective/adverb), adjectives by nouns — the chain learns these grammar patterns from the corpus without being told the rules.

## Usage

```bash
node index.js <path-to-text-file> [output-length]
```

### Parameters

- `<path-to-text-file>`: path to the input text file (required)
- `[output-length]`: number of words to generate (default: 30)

### Examples

```bash
# 30 words (default) from Shakespeare's sonnets
node index.js ../corpora/sonnets-shakespeare.txt

# 50 words
node index.js ../corpora/sonnets-shakespeare.txt 50
```

The CLI prints a sample of the chain (each `word|POS` state and its top followers), then the generated text, then the same sequence annotated with its part-of-speech tags so you can see the grammatical skeleton.

## Try it in the browser

Open `index.html` (served, e.g. `npx serve` from the repo root — the demo `fetch`es the corpus). You can regenerate text live, switch corpora, and type any word to see the part of speech it gets and what states can follow it.

## Where It Falls Short

- **Still single-step memory.** The role helps locally, but the chain looks only one state back, so it can't carry a phrase.
- **The tagger is context-free.** Lexicon + suffix rules can't use neighbouring words to disambiguate roles. Real taggers (HMMs, then neural models) do.
- **Grammar isn't meaning.** A well-formed determiner→adjective→noun run can still be nonsense.
- **Sparser data.** Splitting words by role multiplies states, so each is seen fewer times — more dead-ends and random restarts than the plain chain.

## Where it leads

Two of the fixes appeared earlier in the journey: **probability weighting** (using transition frequency during the walk) and **n-grams** (widening the context window). The remaining one points forward: **statistical and neural taggers** let a word's neighbours decide its role — the same move toward learned, contextual representations that drives the neural era.
