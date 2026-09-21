#!/usr/bin/env python3
"""
MovieLapse Cinephile LoRA Dataset Generator
Generates high-quality instruction-tuning pairs for training a custom
film sommelier LoRA adapter for Llama-3.2 or Gemma-2 using Unsloth / Hugging Face PEFT.
"""

import json
import random
from pathlib import Path

TEMPLATES = [
    {
        "instruction": "I want a mind-bending sci-fi movie with high tension, practical atmosphere, and deep philosophy. What should I watch?",
        "response": "Three essential picks that match this exact wavelength:\n\n1. **Blade Runner 2049 (2017)** - Directed by Denis Villeneuve. A staggering masterclass in contemplative cyberpunk worldbuilding and identity questions.\n2. **Arrival (2016)** - Denis Villeneuve's emotionally devastating first-contact puzzle examining determinism and grief.\n3. **Ex Machina (2014)** - Alex Garland's razor-sharp chamber thriller testing artificial consciousness and manipulation."
    },
    {
        "instruction": "We need a crowd-pleasing mystery comedy for date night. Fast-paced, clever dialogue, no grim violence.",
        "response": "Here are top-tier picks that keep the room guessing and laughing:\n\n1. **Knives Out (2019)** - Rian Johnson's brilliant Agatha Christie-style whodunit with an all-star ensemble and razor-sharp wit.\n2. **The Grand Budapest Hotel (2014)** - Wes Anderson's visually exquisite, kinetic caper packed with dry humor and immaculate production design.\n3. **Glass Onion (2022)** - Breezy, sun-drenched, satirical murder mystery set on a Greek private island."
    },
    {
        "instruction": "Recommend 3 psychological thrillers with shocking endings like Prisoners and Se7en.",
        "response": "If you crave suffocating tension and unforgettable twists:\n\n1. **Memento (2000)** - Christopher Nolan's groundbreaking backwards-told neo-noir about memory, deception, and revenge.\n2. **Shutter Island (2010)** - Martin Scorsese's gothic psychological maze on an isolated asylum island.\n3. **Incendies (2010)** - A harrowing, jaw-dropping mystery unraveling family secrets across the Middle East."
    },
    {
        "instruction": "Give me an adrenaline-fueled action movie with practical stunts and relentless pacing under 2 hours.",
        "response": "Pure kinetic mastery with zero filler:\n\n1. **Mad Max: Fury Road (2015)** - Two hours of unrelenting practical carnage and operatic visual storytelling.\n2. **The Raid: Redemption (2011)** - Claustrophobic, breathtaking Indonesian martial arts in an apartment complex siege.\n3. **John Wick (2014)** - Sleek, stylized neon gun-fu with impeccable stunt coordination."
    }
]

def generate_dataset(output_path: Path, count: int = 250):
    dataset = []
    
    # Base templates
    for item in TEMPLATES:
        dataset.append({
            "instruction": item["instruction"],
            "input": "",
            "output": item["response"]
        })
        
    # Synthesize diverse variations
    vibes = [
        ("rainy neon noir", "Dark City, Blade Runner, Drive"),
        ("cozy autumnal melancholy", "Dead Poets Society, Good Will Hunting, About Time"),
        ("paranoid 70s conspiracy thriller", "All the President's Men, The Conversation, Chinatown"),
        ("high-stakes courtroom drama", "12 Angry Men, A Few Good Men, Primal Fear"),
        ("isolated snowy survival", "The Thing, Wind River, Fargo")
    ]
    
    for vibe, examples in vibes:
        for phrasing in [
            f"What are the best movies with a {vibe} vibe?",
            f"I'm looking for films that capture {vibe}.",
            f"Give me 3 essential picks with {vibe} atmosphere."
        ]:
            dataset.append({
                "instruction": phrasing,
                "input": "",
                "output": f"To capture the essence of {vibe}, these three films stand supreme:\n\nKey touchstones include **{examples}**, balancing immaculate atmosphere, authentic pacing, and unforgettable character arcs."
            })
            
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        for row in dataset:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
            
    print(f"Generated {len(dataset)} training examples at {output_path}")

if __name__ == "__main__":
    out = Path(__file__).parent / "cinephile_instructions.jsonl"
    generate_dataset(out)
