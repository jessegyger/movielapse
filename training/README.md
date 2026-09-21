# MovieLapse: Custom Cinephile LoRA Training Guide

This guide explains how to train a custom film-sommelier LoRA for **Llama-3.2-1B / 3B** or **Gemma-2-2B** for **100% FREE** using Google Colab's free T4 GPU.

---

## 1. Generate the Training Data
Run the included dataset generator script:

```bash
python3 training/generate_cinephile_dataset.py
```

This creates `training/cinephile_instructions.jsonl` formatted with instruction-response pairs focusing on:
- 10/20 Questions deductive narrowing logic.
- Niche tone, cinematography, pacing, and trope comparisons.
- Strict structured movie output syntax.

---

## 2. Train on Google Colab (Free T4 GPU in 15 Minutes)

1. Go to [Google Colab](https://colab.research.google.com/) and create a new Python 3 notebook with a **T4 GPU** runtime.
2. Install [Unsloth](https://github.com/unslothai/unsloth) (which trains 2-5x faster with 80% less memory):

```python
!pip install --no-deps "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
!pip install --no-deps "xformers" "trl<0.9.0" "peft" "accelerate" "bitsandbytes"
```

3. Load base model with 4-bit quantization:

```python
from unsloth import FastLanguageModel
import torch

max_seq_length = 2048
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = "unsloth/Llama-3.2-1B-Instruct",
    max_seq_length = max_seq_length,
    dtype = None,
    load_in_4bit = True,
)

# Attach LoRA adapters
model = FastLanguageModel.get_peft_model(
    model,
    r = 16,
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_alpha = 16,
    lora_dropout = 0,
    bias = "none",
)
```

4. Train on `cinephile_instructions.jsonl` using `SFTTrainer`:

```python
from trl import SFTTrainer
from transformers import TrainingArguments

trainer = SFTTrainer(
    model = model,
    tokenizer = tokenizer,
    train_dataset = dataset,
    dataset_text_field = "text",
    max_seq_length = max_seq_length,
    args = TrainingArguments(
        per_device_train_batch_size = 2,
        gradient_accumulation_steps = 4,
        warmup_steps = 5,
        max_steps = 60,
        learning_rate = 2e-4,
        fp16 = not torch.cuda.is_bf16_supported(),
        bf16 = torch.cuda.is_bf16_supported(),
        logging_steps = 1,
        output_dir = "outputs",
    ),
)
trainer.train()
```

5. Save LoRA Adapter:

```python
model.save_pretrained_merged("movielapse-lora-adapter", tokenizer, save_method = "lora")
```

The resulting adapter is only **~15MB - 30MB**!

---

## 3. Plug into MovieLapse WebLLM

WebLLM allows specifying custom Hugging Face model / LoRA URLs in `app_config.model_list`. You can upload your 20MB adapter to Hugging Face (free public repo) and specify it in `lib/webllm/engine.ts`.
