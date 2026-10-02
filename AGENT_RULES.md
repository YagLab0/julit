# Agent Rules

* Never assume anything. If requirements, context, or answers are uncertain or unknown, ask the user before proceeding.[cite: 11]
* Do not preserve backward compatibility. Remove obsolete paths instead of adding compatibility layers, fallbacks, or migrations.[cite: 11]
* Choose the simplest implementation that fully meets the current requirements. Avoid speculative abstractions, configuration, and indirection.[cite: 11]
* Grow the system in layers. Start from the smallest version that works end to end, and add each new capability on top of a product that already works. Never trade a working product for unfinished complexity.[cite: 11]
* Keep components modular and concerns clearly separated.[cite: 11]
* Prefer established, well-maintained libraries when they reduce overall complexity or improve reliability. Do not reimplement common functionality without a clear reason.[cite: 11]
* Lean on the dependencies already in the project before writing your own implementation or adding packages. Do not assume a library lacks a capability without checking its documentation and types.[cite: 11]
* Make architectural decisions for the long term. Do not accept a stopgap that only works for now and is meant to be replaced later.[cite: 11]