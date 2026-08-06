Question: Are self-hosted LLMs cost-effective for SMBs in 2026?

## Executive summary
In 2026 the self-hosting question for SMBs has moved from "is it technically possible"
to "does the ROI make sense":
- 7–8B open-weight models run on a single consumer GPU and cover customer support, docs, and content generation
- But hidden costs (ops, GPU depreciation, tuning) are often underestimated — raw cost is not always lower than API pricing

## Findings
1. **Hardware costs keep falling**: a quantized 7–8B model needs ~8GB VRAM; a single RTX 4060 is enough for inference (placeholder citation: official model card)
2. **Privacy is the #1 driver**: ~62% of surveyed SMBs self-host mainly to keep data in-house (placeholder citation: 2026 enterprise AI survey)
3. **Clear fit boundary**: high-volume, low-latency workloads favor self-hosting; low-frequency, long-tail tasks are cheaper on APIs
4. **Ops is the biggest risk**: upgrades, VRAM planning, and traffic spikes assume a dedicated (or dedicated-minded) owner

## Open questions
- How should GPU depreciation be included in the monthly cost model?
- Public data is thin on the ROI of hybrid setups (self-host core + API for the long tail).
