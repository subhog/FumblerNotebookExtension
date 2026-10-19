# %%
print("Hello from a Fumbler notebook")

# %% [markdown]
# # Fumbler Notebook
# This file is valid Python. Markdown and image cells live in comments.

# %% [image]
# assets/sample.svg

# %% [python]
import math
width = 320
height = 120
amp = 24
d = " ".join(
    f"{'M' if i == 0 else 'L'} {i} {height/2 + amp * math.sin(i / 20)}"
    for i in range(width + 1)
)

# %% [svg]
# <svg xmlns="http://www.w3.org/2000/svg" width="{{width}}" height="{{height}}" viewBox="0 0 {{width}} {{height}}">
#   <rect width="100%" height="100%" fill="#4C324C"/>
#   <path d="{{d}}" fill="none" stroke="#E8D4E8" stroke-width="2"/>
# </svg>
