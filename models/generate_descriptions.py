#!/usr/bin/env python
"""
Generate smart suburb descriptions by deducing suburb character from score patterns.
Analyzes metric combinations to infer what the suburb is actually like.

Usage:
    python models/generate_descriptions.py --test  (first 10 suburbs)
    python models/generate_descriptions.py         (all 673 suburbs)
"""

import os
import sys
import random
import hashlib

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ingestion.base import get_db_connection

def get_all_suburbs_with_scores(conn):
    """Fetch all suburbs with their liveability scores."""
    query = """
    SELECT
        s.id, s.name,
        ls.score_crime, ls.score_transport, ls.score_schools,
        ls.score_greenspace, ls.score_affordability, ls.score_total
    FROM suburbs s
    LEFT JOIN liveability_scores ls ON ls.suburb_id = s.id
    WHERE ls.score_total IS NOT NULL
    ORDER BY s.name
    """
    cursor = conn.cursor()
    cursor.execute(query)
    return cursor.fetchall()

def get_melbourne_averages(conn):
    """Get average scores across all suburbs for comparison."""
    query = """
    SELECT
        AVG(score_crime), AVG(score_transport), AVG(score_schools),
        AVG(score_greenspace), AVG(score_affordability), AVG(score_total)
    FROM liveability_scores
    """
    cursor = conn.cursor()
    cursor.execute(query)
    row = cursor.fetchone()
    return {
        "crime": row[0], "transport": row[1], "schools": row[2],
        "greenspace": row[3], "affordability": row[4], "total": row[5],
    }

def seed_randomness(suburb_name):
    """Use suburb name to seed randomness for consistent descriptions."""
    hash_val = int(hashlib.md5(suburb_name.encode()).hexdigest(), 16)
    random.seed(hash_val)

def infer_suburb_character(scores, averages):
    """Deduce what the suburb is actually like based on metric patterns."""
    crime, transport, schools, greenspace, affordability, total = scores

    # Calculate deviations (positive = above average)
    dev = {
        "safety": crime - averages["crime"],
        "transport": transport - averages["transport"],
        "schools": schools - averages["schools"],
        "green": greenspace - averages["greenspace"],
        "price": affordability - averages["affordability"],
    }

    # Identify strong/weak metrics
    strong = [k for k, v in dev.items() if v > 10]
    weak = [k for k, v in dev.items() if v < -10]

    # Pattern-based deductions
    character = []

    # Inner vs outer deduction
    if dev["transport"] > 15 and dev["price"] < -10:
        character.append("gentrified inner")
    elif dev["transport"] > 10 and dev["price"] > 5:
        character.append("vibrant accessible")
    elif dev["price"] > 15 and dev["transport"] < -10:
        character.append("family-oriented outer")
    elif dev["price"] > 10:
        character.append("budget-conscious")

    # Family-focus deduction
    if dev["schools"] > 10 and dev["safety"] > 5:
        character.append("family-friendly")
    elif dev["schools"] > 10:
        character.append("education-focused")

    # Nature/lifestyle deduction
    if dev["green"] > 15:
        character.append("nature-rich")
    if dev["green"] < -15:
        character.append("urban")

    # Growth/development deduction
    if total < 55 and dev["price"] > 10:
        character.append("emerging opportunity")
    elif total < 55 and dev["transport"] < -15:
        character.append("remote and peaceful")

    return character, strong, weak, dev

def generate_description(suburb_name, scores, averages):
    """Generate description based on deduced suburb character."""
    seed_randomness(suburb_name)

    crime, transport, schools, greenspace, affordability, total = scores
    character, strong, weak, dev = infer_suburb_character(scores, averages)

    # Build description from deduced character
    if not character:
        # Fallback: describe by score tier
        if total >= 75:
            desc = f"{suburb_name} is a premier Melbourne destination."
        elif total >= 65:
            desc = f"{suburb_name} offers solid suburban living."
        elif total >= 50:
            desc = f"{suburb_name} appeals to value-conscious residents."
        else:
            desc = f"{suburb_name} is a quieter outer locality."
    else:
        # Describe using deduced character
        char_str = " ".join(character)

        openers = [
            f"{suburb_name} is a {char_str} suburb",
            f"This {char_str} area, {suburb_name}, appeals to",
            f"A {char_str} gem, {suburb_name} offers",
            f"{suburb_name} stands out as {char_str}",
            f"Discover {suburb_name}, a {char_str} location",
        ]

        desc = random.choice(openers)

        # Add what makes it work
        if strong:
            traits = []
            if "safety" in strong:
                traits.append("safe, secure living")
            if "transport" in strong:
                traits.append("excellent connectivity")
            if "schools" in strong:
                traits.append("quality education")
            if "green" in strong:
                traits.append("abundant nature")
            if "price" in strong:
                traits.append("genuine affordability")

            if traits:
                desc += f" with {', '.join(traits)}"
            else:
                desc += " with plenty to offer"
        else:
            desc += " with unique appeal"

        desc += "."

    # Add tradeoff insights
    if len(weak) > 0 and len(strong) > 0:
        tradeoffs = []
        if "transport" in weak:
            tradeoffs.append("limited public transit")
        if "schools" in weak:
            tradeoffs.append("fewer school options")
        if "price" in weak:
            tradeoffs.append("higher property costs")
        if "green" in weak:
            tradeoffs.append("less green space")

        if tradeoffs:
            desc += f" Trade-offs include {', '.join(tradeoffs)}."

    # Add specific insight about why someone would live here
    if dev["price"] > 15:
        insights = [
            "Smart buyers recognize the value.",
            "It's a savvy choice for budget shoppers.",
            "Affordability is the major drawcard.",
        ]
        desc += " " + random.choice(insights)
    elif dev["transport"] > 15:
        insights = [
            "Commuters love the easy access.",
            "Convenience is the key selling point.",
            "Location convenience attracts residents.",
        ]
        desc += " " + random.choice(insights)
    elif dev["schools"] > 15:
        insights = [
            "Families flock here for education quality.",
            "School-focused households thrive here.",
            "Education excellence draws families.",
        ]
        desc += " " + random.choice(insights)
    elif dev["green"] > 15:
        insights = [
            "Nature enthusiasts find it irresistible.",
            "Outdoor lovers gravitate here.",
            "Green living is the lifestyle here.",
        ]
        desc += " " + random.choice(insights)

    return desc

def update_descriptions(conn, test_mode=False):
    """Generate and store descriptions for all suburbs."""
    suburbs = get_all_suburbs_with_scores(conn)
    averages = get_melbourne_averages(conn)

    if test_mode:
        suburbs = suburbs[:10]
        print("TEST MODE: Processing first 10 suburbs\n")
    else:
        print(f"Generating descriptions for {len(suburbs)} suburbs...\n")

    cursor = conn.cursor()
    successful = 0

    for i, (suburb_id, name, crime, transport, schools, greenspace, affordability, total) in enumerate(suburbs, 1):
        try:
            scores = (crime, transport, schools, greenspace, affordability, total)
            description = generate_description(name, scores, averages)

            cursor.execute(
                "UPDATE suburbs SET description = %s WHERE id = %s",
                (description, suburb_id)
            )

            print(f"[{i:3d}/{len(suburbs)}] {name:35s}")
            print(f"         {description}\n")

            successful += 1

        except Exception as e:
            print(f"[{i:3d}/{len(suburbs)}] {name:35s} → ERROR: {str(e)}\n")

    conn.commit()
    cursor.close()

    if test_mode:
        print(f"\n[OK] Test complete! Generated {successful} descriptions.")
        print("  Run without --test to generate all suburbs.")
    else:
        print(f"\n[OK] Done! Generated {successful} descriptions.")

if __name__ == "__main__":
    conn = get_db_connection()
    try:
        test_mode = "--test" in sys.argv
        update_descriptions(conn, test_mode=test_mode)
    finally:
        conn.close()
