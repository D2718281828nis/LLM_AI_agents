# LLM AI Agents: 13 Practical Lessons & Architectures

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Jupyter Notebook](https://img.shields.io/badge/Jupyter-Notebook-orange)](https://jupyter.org/)

A compact, hands-on course and reference for building LLM-powered AI agents — from single-step inference to multi-agent coordination, tool integration (MCP), and retrieval-augmented pipelines (HyDE).

This repository is organized as executable Jupyter notebooks that demonstrate patterns, example code, and experiments. Notebooks target both local inference (Mistral / local LLMs) and cloud APIs (Mistral cloud, OpenAI).

## What you'll learn

| Lesson | Topic | Key technique / tool |
|--------|-------|----------------------|
| 1-2 | Basic & Llama inference | Mistral, OpenAI, Llama |
| 3 / 3A | Simple agents & MCP emulation | LangChain, MCP examples |
| 4 | MCP Tools | Model Context Protocol (tool wrapping, tool loop) |
| 5 | Memory & Guardrails | Conversation buffers, content safety |
| 6 | Multi-Agent | Critic + Coordinator pattern |
| 7 | Answer scoring | Automated evaluation metrics |
| 8 | RAG techniques | Naive, advanced, and query transformations |
| 9 | DSPy components | Programmatic LM pipelines (DSPy) |
| 10 | TAO (Think-Act-Observe) | ReAct-like loop with LLM + tools |
| 11-13 | Applied projects | Medical claims, fact-checking, HyDE for clinical guidelines |

> All notebooks are executable. Many include Colab launch badges (open in Colab) and API setup notes.

## Key concepts covered

- MCP (Model Context Protocol): standardized tool and resource descriptions so an LLM can call external capabilities safely and consistently (see lesson-4_MCP_tools.ipynb).
- HyDE (Hypothetical Document Embeddings): generate a hypothetical answer to form better retrieval queries (see lesson-13_HyDE_Russian_Clinical_Guidelines.ipynb).
- Agent Patterns: TAO / ReAct loops, single-agent with guardrails + memory, and explicit multi-agent patterns (coordinator, critic, workers).

## Repository contents (top-level)

```
LICENSE
README.md
canonical-example-Get-started-managed-agents.ipynb  # runnable example (managed agents)
lesson-1_LLM_base_inference.ipynb
lesson-2_Llama_example_inference.ipynb
lesson-3_simple_agent_Langchain.ipynb
lesson-3A_MCP_example_emulation.ipynb
lesson-4_MCP_tools.ipynb
lesson-5_Memory_and_Guardrails_Agents.ipynb
lesson-6_MultyAgent_Critical_and_Coordinator.ipynb
lesson-7_Score_Agent_Answer.ipynb
lesson-8_Different_RAG_techniques.ipynb
lesson-9_DSPy_components.ipynb
lesson-10_TAO_think_act_observe_techniques.ipynb
lesson-11_LLM_Agent_Graph_Verdict_Medical_Claims.ipynb
lesson-12_AI_agent_fact_cheking_Digital_Clinical_Requirements.ipynb
lesson-13_HyDE_Russian_Clinical_Guidelines.ipynb
```

Notes:
- The repository is notebook-first: there is no top-level package or service. Notebooks are the primary artifacts.
- Filenames may include small spelling variants (e.g., `MultyAgent` in lesson-6); filenames reflect the committed names.

## How it fits together

Each lesson is an independent notebook that can be run in order to follow a learning path. Early lessons demonstrate inference and basic usage (Mistral, OpenAI), mid lessons introduce tools and agent loops (MCP, LangChain, LangGraph), and later lessons apply multi-agent patterns and retrieval techniques to domain problems (medical claims, HyDE retrieval).

## Quick start

Minimum recommended environment:
- Python 3.10+ (3.11 tested)
- A recent pip

From a fresh clone:

```bash
git clone https://github.com/D2718281828nis/LLM_AI_agents.git
cd LLM_AI_agents
python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install --upgrade pip

# install the common dependencies used by the notebooks (some notebooks install extras inline)
pip install mistralai langchain openai dspy chromadb jupyter colab
```

Environment / secrets (examples used in notebooks):

```text
MISTRAL_API_KEY=your_mistral_api_key
OPENAI_API_KEY=your_openai_api_key
```

Running notebooks:
- Open in Jupyter Lab/Notebook: `jupyter notebook` or `jupyter lab` and open the notebook you want to run.
- Many notebooks include a Colab launch badge; you can open them in Google Colab and provide secrets via the Colab secrets/userdata UI.

Run a single notebook headlessly (example):

```bash
jupyter nbconvert --to notebook --execute lesson-4_MCP_tools.ipynb --ExecutePreprocessor.timeout=600
```


## Contributing

Please open an issue for major changes before submitting a PR. When adding lessons, include: problem statement, practical demo notebook, and short theory notes.

## Prerequisites

- Built with Mistral AI and LangChain examples. Canonical example has GEMINI_API_TOKEN. 
- HyDE inspired by Gao et al. (2022)
- MCP based on Anthropic’s Model Context Protocol specification

---

## Interactive Demo Site

An interactive GitHub Pages demo site is available to explore the concepts visually:

- **URL**: `https://D2718281828nis.github.io/LLM_AI_agents/` (once deployed)
- **Location**: `docs/` folder

### Features of the Demo Site:
- **Interactive lesson explorer** with all 13 lessons
- **Concept visualizations** for MCP, HyDE, TAO, RAG, DSPy, and Multi-Agent systems
- **Live simulations** of tool calls, query generation, and agent loops
- **Learning path roadmap** to guide your journey
- **Responsive design** that works on desktop and mobile

### To Deploy the Demo Site:

1. Make sure your GitHub repository is named `LLM_AI_agents`
2. Go to **Settings** → **Pages** in your GitHub repository
3. Select **main branch** and **/docs folder** as the source
4. Click **Save**
5. The site will be available at `https://<your-username>.github.io/LLM_AI_agents/`

Or run locally:
```bash
# From the docs folder
python -m http.server 8000
# Then open http://localhost:8000 in your browser
```

### Demo Site Structure:
```
docs/
├── index.html          # Main interactive demo page
├── styles.css          # All styling and theming
├── script.js           # All interactivity and animations
├── favicon.svg         # Site icon
├── .nojekyll          # Prevent GitHub Pages from using Jekyll
└── 404.html           # Custom 404 page
```

---

Start with Lesson 1 → then jump to Lesson 4 (MCP) or Lesson 13 (HyDE) for advanced techniques.
