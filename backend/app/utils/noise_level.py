"""Noise level classification utility.

Classifies average noise values into human-readable levels and colors
for the SOEUM-FREE quiet neighborhood finder platform.
"""

# Noise level definitions with thresholds, colors, and labels
NOISE_LEVELS = {
    "quiet": {
        "min_db": 0,
        "max_db": 50,
        "color": "green",
        "hex": "#4CAF50",
        "label": "조용함",
    },
    "normal": {
        "min_db": 50,
        "max_db": 60,
        "color": "yellow",
        "hex": "#FFC107",
        "label": "보통",
    },
    "loud": {
        "min_db": 60,
        "max_db": 70,
        "color": "red",
        "hex": "#F44336",
        "label": "시끄러움",
    },
    "very_loud": {
        "min_db": 70,
        "max_db": 999,
        "color": "black",
        "hex": "#212121",
        "label": "매우 시끄러움",
    },
}


def classify_noise(avg_noise: float) -> tuple[str, str]:
    """Classify average noise level into a category and color.

    Args:
        avg_noise: Average noise value in decibels.

    Returns:
        A tuple of (noise_level, noise_color).
        noise_level: "quiet" | "normal" | "loud" | "very_loud"
        noise_color: "green" | "yellow" | "red" | "black"
    """
    if avg_noise > 70:
        return ("very_loud", "black")
    if avg_noise > 60:
        return ("loud", "red")
    if avg_noise > 50:
        return ("normal", "yellow")
    return ("quiet", "green")
