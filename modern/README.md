# The Modern Era — Concept Pages

*From the Transformer (2017) to tool-using agents (today)*

Every other directory in this repository ships a runnable program. **This one does
not** — and that absence is the lesson.

The defining feature of the modern era of NLP is *scale*: of data, of compute, and
of model size. The artifacts (BERT, GPT-3, ChatGPT, reasoning and agentic frontier
models) cannot be reproduced on a laptop in an afternoon, the way a Markov chain or
a TF-IDF index can. But the *conceptual moves* are completely understandable, and
they are the missing links between the attention mechanism — the last thing in this
repo you can actually train — and the assistant you are reading this with.

So this section is a set of **concept explainers**: self-contained HTML pages, one
per milestone, each with a diagram of the idea and the limitation that drove the
next step. They follow the same design convention as every other explainer, and
each is clearly marked as concept-only.

## The pages, in order

1. [`transformer/`](./transformer/) — **The Transformer** (2017). The full
   architecture built from attention: multi-head attention + positional encodings +
   feed-forward + residual/layernorm, stacked and processed in parallel.
2. [`pretraining/`](./pretraining/) — **Pretraining & Transfer Learning** (2018).
   BERT and GPT: train once on raw text with a self-supervised objective, then adapt.
3. [`scaling/`](./scaling/) — **Scaling Laws & In-Context Learning** (2020). Loss
   falls as a predictable power law; GPT-3 reveals few-shot learning from the prompt.
4. [`alignment/`](./alignment/) — **Alignment** (2022). Instruction tuning, RLHF,
   and Constitutional AI turn a raw predictor into an assistant that does what you ask.
5. [`reasoning/`](./reasoning/) — **Reasoning & Test-Time Compute** (2024–2025).
   Spend more compute *at inference*: think step by step before answering.
6. [`agents/`](./agents/) — **Tool Use & Agents** (2023→). The model becomes a
   controller in an observe–decide–act loop, calling tools and acting in the world.

A seventh modern-era idea, **Retrieval-Augmented Generation**, *is* buildable on top
of what this repo already has, so it lives as a full runnable subproject in
[`../rag/`](../rag/) rather than here.

See [`../OVERVIEW.md`](../OVERVIEW.md) for the narrative these pages are drawn from.
