# A Journey Through Natural Language Processing

This repository is a working museum of NLP techniques. Each subdirectory is a small, self-contained implementation that you can run, read through, and understand in an afternoon. They are arranged in rough historical order — not because later is always better, but because each technique was a direct response to the limitations of what came before.

---

## The Core Problem

Language is structured at multiple levels simultaneously: sounds, morphemes, words, phrases, sentences, documents, conversations. For decades, researchers argued about whether you could capture this structure statistically or whether you needed formal grammar rules. The statistical side won — not because language has no rules, but because the rules are too irregular, too context-dependent, and too numerous to write by hand.

What follows is that story, told through small programs.

---

## What Is Already Here

### Markov Chains — *the 1940s–60s*
`markov/` `ngram-markov/` `probability-markov/` `ngram-probability-markov/`

Andrei Markov showed in 1913 that statistical regularities in letter sequences could be modeled as a chain of conditional probabilities. The insight is elegant: you do not need to know all of language to generate plausible text — you only need to know what tends to follow what. The four implementations here show a progression from purely random next-word selection to a weighted, context-aware model using n-grams.

**What these teach:** Language has local structure. Word N is not independent of word N-1. Longer context (bigger n-grams) produces more coherent text but less variety, because you eventually just reproduce the source. This tension between fidelity and generativity never fully goes away.

**The limitation that drove what came next:** Markov chains cannot say anything about what a document is *about*. They have no concept of meaning — only sequence. They also cannot answer the question "which of these documents is most relevant to my query?"

---

### TF-IDF — *the 1970s–80s*
`tfidf/`

Gerard Salton's work at Cornell gave us a way to measure how distinctive a word is to a particular document within a larger collection. TF-IDF abandoned word order entirely (the "bag of words" assumption) in exchange for something Markov chains could not do: rank documents by relevance to a query.

**What this teaches:** Not all word frequencies are equally informative. A word that appears everywhere is useless for distinguishing documents. A rare word that appears frequently in one document is a strong signal about that document's content. IDF is essentially a measure of surprise.

**The limitation that drove what came next:** TF-IDF treats each word as independent. It cannot know that "car" and "automobile" are related, or that "bank" means something different in "river bank" versus "savings bank." Every word is just a token with a weight.

---

## What Could Come Next

These are suggested additions, loosely ordered by the historical period that gave rise to them. Each is small enough to implement in an afternoon using only Node.js and the existing corpora.

*Items marked ✅ are now implemented and runnable; the rest remain on the roadmap.*

---

### 1. Zipf's Law — *1935–1949*
`zipf/` — ✅ **implemented**

Before writing any NLP system, it helps to understand the statistical shape of language itself. George Zipf observed that word frequency follows a power law: the most common word appears roughly twice as often as the second most common, three times as often as the third, and so on. Plot word rank against frequency on a log-log scale and you get a near-perfect straight line — for virtually any natural language corpus.

**Why it matters:** Zipf's law explains why TF-IDF works. Because a tiny number of words ("the", "and", "of") account for the majority of all tokens, raw frequency is a terrible signal. IDF discounts exactly these Zipfian words. It also explains why language models trained on small corpora generalize poorly: the long tail of rare words is enormous.

**Implementation:** Count word frequencies, sort by rank, and print the rank-to-frequency ratio. Show that the ratios cluster around a constant. A stretch goal is to show that the relationship holds even at the sonnet level.

---

### 2. Edit Distance — *1965*
`edit-distance/` — ✅ **implemented**

Vladimir Levenshtein's algorithm computes the minimum number of single-character edits (insertions, deletions, substitutions) needed to transform one string into another. It is the foundation of spell checkers, DNA sequence alignment, diff tools, and fuzzy search.

**Why it matters:** It is the first technique here that operates *below* the word level — on characters rather than tokens. This foreshadows a recurring theme: the choice of unit matters enormously. Words are not the only or even the best unit for all NLP tasks.

**Implementation:** Classic dynamic programming. Build the edit distance matrix for two strings and display it. Then build a simple spell checker that suggests the closest word in the corpus vocabulary for an unknown input.

---

### 3. Pointwise Mutual Information — *1990*
`pmi/` — ✅ **implemented**

Kenneth Church and Patrick Hanks introduced PMI as a way to measure whether two words co-occur more than chance would predict. If "New" and "York" appear near each other far more often than their individual frequencies would suggest, they form a meaningful collocation.

```
PMI(x, y) = log( P(x, y) / P(x) × P(y) )
```

A high positive score means the two words are strongly associated. A score near zero means their co-occurrence is no better than random.

**Why it matters:** PMI is a bridge between pure frequency counting (TF-IDF era) and the idea of *semantic relationships* between words. It finds things like "self-love", "sweet self", and "hideous winter" without being told they are meaningful phrases. It is also the conceptual ancestor of the co-occurrence matrices that led to word embeddings.

**Implementation:** Build a co-occurrence window (e.g., words within 3 positions of each other) across all sonnets. Compute PMI for all word pairs and show the highest-scoring collocations. The results are immediately interpretable.

---

### 4. Naive Bayes Text Classifier — *applied 1990s*
`naive-bayes/` — ✅ **implemented**

Given two corpora of text labeled as belonging to different classes (two authors, two topics, positive vs. negative sentiment), Naive Bayes learns to classify new text by applying Bayes' theorem to word frequencies:

```
P(class | document) ∝ P(class) × ∏ P(word | class)
```

"Naive" because it assumes all words are independent given the class — an assumption that is obviously false but works surprisingly well in practice.

**Why it matters:** This is the transition from unsupervised techniques (Markov chains, TF-IDF, PMI — none of which require labeled data) to supervised machine learning. It shows that statistical patterns, combined with even a small amount of human judgment about categories, can produce a useful classifier. It was used commercially for spam filtering before neural networks were competitive.

**Implementation:** Split the Shakespeare sonnets into two groups (e.g., early sonnets 1–77 addressed to a young man, late sonnets 78–154 with a different tone). Train on each group and see if the classifier can identify which group a held-out sonnet belongs to. Alternatively, add a second corpus from the `corpora/` directory.

---

### 5. Co-occurrence Word Vectors — *early 1990s*
`word-vectors/` — ✅ **implemented**

If you represent each word as a vector counting how often it appears near every other word in the corpus, semantically similar words end up with similar vectors. "Summer" and "winter" both appear near "cold", "warmth", "season", "flower" — so their vectors will be close together even though you never told the system they are related.

Measuring similarity between vectors using cosine similarity:

```
similarity(a, b) = (a · b) / (|a| × |b|)
```

**Why it matters:** This is the idea that gave rise to Word2Vec, GloVe, and ultimately the embedding layers in every modern language model. The fundamental insight — that word meaning can be captured by its distribution across contexts — is called the distributional hypothesis, stated by linguist John Firth in 1957: *"You shall know a word by the company it keeps."*

**Implementation:** Build a co-occurrence matrix for the top 200 most frequent words in the corpus. Compute cosine similarity between word vectors. Show that words like "beauty" and "fairness" are close together, while "beauty" and "winter" are more distant. This will be small and slow but the output is immediately illuminating.

---

### 6. Byte Pair Encoding Tokenizer — *1994, applied to NLP 2016*
`bpe/` — ✅ **implemented**

Originally a data compression algorithm, BPE learns a vocabulary by iteratively merging the most frequent pair of adjacent symbols. Starting from individual characters, it progressively builds larger subword units until a target vocabulary size is reached.

```
Starting: t h e   s u m m e r
After merging "th": th e   s u m m e r
After merging "er": th e   s u mm er
...
```

**Why it matters:** Every modern large language model — GPT, BERT, T5, Claude — uses a subword tokenizer, and most use BPE or a close variant. It solves the out-of-vocabulary problem (unknown words can still be represented as sequences of known subwords) and handles morphologically rich languages far better than word-level tokenization. Implementing it makes the opaque "token" of modern AI suddenly concrete.

**Implementation:** Run BPE on the sonnets corpus and produce a vocabulary of, say, 500 tokens. Show how "fairest" gets tokenized as the vocabulary evolves. Compare the resulting token vocabulary to word-level tokenization.

---

### 7. Neural Language Model — *2003*
`neural-lm/` — ✅ **implemented**

Yoshua Bengio and colleagues showed in 2003 that a small feedforward neural network, trained to predict the next word from an embedding of the previous N words, outperformed n-gram language models on standard benchmarks. This was the proof of concept that neural networks could do something useful with language.

```
input: embeddings of N previous words
hidden layer: tanh activations
output: softmax probability over vocabulary
```

**Why it matters:** The architecture is largely obsolete, but the conceptual move it made is permanent: instead of hand-counting statistics, *learn* the representations from data. The word embeddings learned by this network encode semantic relationships implicitly. This is the intellectual parent of everything that followed.

**Implementation:** A minimal version in pure JavaScript — no frameworks. Train on trigrams from the sonnets with a vocabulary reduced to the top 300 words. The training will converge slowly, but seeing loss decrease and the model generate slightly more coherent text than a pure Markov chain is the point.

---

### 8. Recurrent Networks and LSTMs — *1997, applied ~2010–2016*
`rnn/` — ✅ **implemented**

The neural language model (#7) still used a fixed window of N previous words. A recurrent neural network removes that limit: it processes a sequence one token at a time, carrying a hidden state that is updated at every step. In principle the hidden state is an unbounded memory of everything seen so far. In practice, vanilla RNNs forget almost immediately — the gradients that carry information backward through time vanish. The Long Short-Term Memory cell (Hochreiter and Schmidhuber, 1997) fixed this with explicit gates that decide what to remember, what to forget, and what to output. By the mid-2010s, LSTMs were the workhorse of NLP: machine translation, speech recognition, and the first sequence-to-sequence systems.

**Why it matters:** This is the first architecture here that handles variable-length input with a *learned, persistent* memory rather than a fixed window. The encoder-decoder (seq2seq) pattern — compress an entire sentence into a single vector, then decode it into a translation — came directly from LSTMs. And its central weakness, that cramming a whole sentence into one fixed vector loses information, is *exactly* the problem attention was invented to solve. You cannot understand why attention exists without first seeing the bottleneck it removed.

**Implementation:** A minimal character-level RNN in pure JavaScript, trained on a handful of sonnets with no framework. Training is slow and the output is rough, but watching it produce text that respects longer-range structure than a Markov chain — closing quotes, matching line lengths — makes the idea of a learned hidden state concrete.

---

### 9. Attention Mechanism — *2014–2017*
`attention/` — ✅ **implemented**

The attention mechanism, introduced by Bahdanau et al. for machine translation and then generalized into the Transformer architecture by Vaswani et al., asks a single question: given a query vector, which parts of a sequence of key-value pairs are most relevant?

```
Attention(Q, K, V) = softmax( Q × Kᵀ / √d ) × V
```

In practice: each word produces a query, a key, and a value. The output for each word is a weighted sum of all value vectors, where the weights are determined by how well that word's query matches every other word's key.

**Why it matters:** Attention is what allowed models to escape the fixed-length context window of n-gram models and RNNs. A word at position 1 can directly attend to a word at position 100 without information passing through every position in between. This is why Transformers can handle long-range dependencies — and it is the sole architectural primitive behind GPT, BERT, and their descendants.

**Implementation:** A standalone demonstration that computes self-attention over a short sentence using small random vectors. Visualize the resulting attention weights as a matrix. Show how "her" attends strongly to "beauty" in a phrase like "beauty and her fairness." No training needed — the point is to understand the mechanics.

---

## The Modern Era — From the Transformer to Frontier Models — *2017–today*

Everything above can be built and run on a laptop in an afternoon. What follows mostly cannot, and that is itself the lesson: the defining feature of the modern era is *scale* — of data, of compute, and of model size. To put a number on it: the neural net in [`neural-lm/`](./neural-lm/) learns from ~17,600 words with ~17,000 parameters in about four seconds on one CPU core; GPT-3 (2020) had 175 billion parameters trained on ~300 billion words, and a current open frontier model like Llama 3 trains on ~15 trillion words — roughly a *billion-fold* more data, on tens of thousands of chips over weeks, by large teams at a cost estimated in the millions. But the conceptual moves are understandable even when the artifacts are not reproducible by hand. These are the missing links between the attention mechanism and the assistant you are reading this with right now.

*Each milestone below has a visual concept explainer in [`modern/`](./modern/); RAG, which is buildable, lives in [`rag/`](./rag/).*

---

### The Transformer — *2017*

Attention (#9) is the primitive; the Transformer is the full machine built from it. Vaswani et al.'s "Attention Is All You Need" stacked multi-head self-attention with three other ingredients: **positional encodings** (because raw attention is order-blind — it sees a set, not a sequence), **feed-forward layers** applied to each position, and **residual connections with layer normalization** that let dozens of layers train stably. Crucially, it threw out recurrence entirely. Where an LSTM must process token 1 before token 2, a Transformer processes the whole sequence in parallel — and that parallelism is the single engineering fact that made training on internet-scale text economically possible.

**Why it matters:** Every frontier model is a Transformer or a close descendant. The architecture has barely changed in form since 2017; what changed is everything around it — scale, data, and training method, all of which follow.

---

### Pretraining and Transfer Learning — BERT and GPT — *2018*

The move that reorganized the entire field: instead of training a new model for every task, train one large Transformer on a generic self-supervised objective over enormous amounts of unlabeled text, then *adapt* it. BERT (Google) learned by predicting masked-out words using context from both directions — ideal for understanding tasks. GPT (OpenAI) learned plain left-to-right next-token prediction — ideal for generation. Suddenly the expensive part (pretraining) happened once, and adapting to a new task needed only a little labeled data and fine-tuning.

**Why it matters:** This is the large-scale return to unsupervised learning that "The Shape of the Field" below predicts. It also established the recipe — *pretrain on raw text, then specialize* — that every model since has followed.

---

### Scaling Laws and In-Context Learning — GPT-3 — *2020*

Kaplan et al. showed that model loss falls as a smooth **power law** in model size, dataset size, and compute — meaning capability is, to a startling degree, a predictable engineering function of scale rather than of clever architecture. Acting on this, GPT-3 reached 175 billion parameters and revealed an emergent behavior nobody trained for directly: **in-context learning**. Given a few examples in the prompt, the model performs a brand-new task with no weight updates at all. The prompt became the new programming interface.

**Why it matters:** Scaling laws turned model-building into a forecastable investment, and in-context learning is why you can "teach" a frontier model a task just by describing it. This is the period where language models stopped being narrow tools and became general-purpose.

---

### Alignment — Instruction Tuning, RLHF, and Constitutional AI — *2022*

A raw pretrained model is a text *predictor*: ask it a question and it may continue with more questions, because that is plausible text. Making it *do what you ask* took two further steps. **Instruction tuning** fine-tunes the model on many tasks phrased as instructions. **Reinforcement Learning from Human Feedback (RLHF)** then trains a reward model from human preference comparisons and optimizes the language model against it. This pipeline turned GPT-3 into InstructGPT and then ChatGPT. Anthropic's **Constitutional AI** replaced much of the human labeling with model self-critique against an explicit written set of principles.

**Why it matters:** This is the most important single entry for understanding *frontier* models specifically. The leap that put LLMs in front of the public was not a capability breakthrough — the base model already existed — it was *alignment*: making the model helpful, honest, and willing to follow instructions.

---

### Retrieval-Augmented Generation — *2020 onward*
`rag/` — ✅ **implemented**

The full circle of this whole repository. RAG bolts a retriever — yes, the same TF-IDF or embedding-and-cosine-similarity machinery from `tfidf/` and `word-vectors/` — onto a generative model. At question time, the retriever fetches the most relevant documents and the model conditions its answer on them. This is how a model answers questions about private, proprietary, or up-to-the-minute data it was never trained on, and it sharply reduces fabrication by grounding output in retrieved text.

**Why it matters:** Every technique in this repo that "did not die but became a component" is visible here at once — TF-IDF ranking, embeddings, cosine similarity — now serving a Transformer. It is the clearest proof that the old methods are infrastructure for the new ones.

**Implementation:** Genuinely buildable on top of what you already have. Use the existing `tfidf/` search to rank sonnets against a query, take the top few, and feed them as context to a generation step. Even with a Markov generator standing in for an LLM, the retrieve-then-generate loop becomes concrete.

---

### Reasoning and Test-Time Compute — *2024–2025*

The most recent shift moves the lever from training to *inference*. Chain-of-thought prompting first showed that asking a model to "think step by step" unlocked latent reasoning ability. Reasoning models then made this the default: trained (often with reinforcement learning) to produce long internal chains of intermediate steps before answering, and to spend *more* compute on *harder* problems. Performance now improves with thinking time, not only with model size.

**Why it matters:** It breaks the assumption that a model's answer must come from a single forward pass. Allocating more computation at inference is a new scaling axis, and it is what lets current frontier models tackle multi-step math, code, and planning that earlier LLMs failed at.

---

### Tool Use and Agents — *2023 onward*

The current frontier. Frontier models no longer only emit text — they call tools, execute code, query databases, search the web, and take multiple actions toward a goal. The model becomes a controller in a loop: observe, decide, act, observe the result, repeat. (This very document was reviewed and extended by exactly such an agent.)

**Why it matters:** The question is shifting from "what can a model *say*?" to "what can a model *do*?" Tool use also re-incorporates everything before it — a retrieval call is TF-IDF, a code-execution step is classical computing — under the direction of a language model. This is as close to the present moment as the story gets.

---

## The Shape of the Field

Looking across all of these techniques, a few patterns emerge:

**Unsupervised learning dominated early NLP.** Markov chains, TF-IDF, PMI, and co-occurrence vectors require no labeled data — just text. This was not a philosophical choice; labeled data was scarce and expensive. Modern LLMs are, in many ways, a return to this: self-supervised training on unlabeled text at massive scale.

**The unit of analysis kept changing.** Characters (edit distance), words (Markov, TF-IDF, PMI), subwords (BPE), vectors (word embeddings), sequences (attention). Each shift unlocked capabilities the previous unit could not support.

**Word order kept being sacrificed and then recovered.** TF-IDF throws away order entirely. Co-occurrence vectors partially restore local context. Attention fully restores the ability to reason about position — at the cost of quadratic complexity in sequence length.

**Every technique here is still in use.** TF-IDF remains a competitive baseline for document retrieval. Edit distance powers spell checkers and diff tools. BPE tokenization is in every major LLM. Naive Bayes is a standard baseline in text classification benchmarks. The techniques did not die; they became components.

The open question, which none of these implementations can settle, is whether the pattern-matching that begins with Markov chains and scales through Transformers constitutes *understanding* — or whether understanding requires something else entirely, something none of these programs have.
