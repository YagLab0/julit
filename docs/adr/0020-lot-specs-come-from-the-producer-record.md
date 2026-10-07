# A lot's declared specs come from the producer's company record

Chemical purity, water footprint and carbon footprint describe the producer's operation at its bound origin — fixed characteristics of the plant and process, not per-lot declarations. They are therefore provisioned by the operator on the producer's `companies` row (the Production Specification) and copied onto every lot at `create_lot`. The registration form no longer accepts them as input; it displays them read-only so the producer sees what is being declared before signing.

Typing them per lot was rejected: it misattributes the data's source and invites drift between lots of the same operation. A separate spec table was rejected: the relationship is 1:1 with the company (producer↔origin is a fixed binding, ADR-0006/0007), so extra columns are the simplest correct shape. The on-chain payload and the `lots` index keep their existing columns — only the source of the values changes.
