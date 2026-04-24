export const taggingPrompt = `
You are a product classification engine.

Return ONLY valid JSON.
Do not return prose.
Do not invent free-text tags.
Use only taxonomy IDs when possible.

Primary goal:
- classify technical filter tags from product data

Extract:
- connector: array of connector IDs such as usb_c, usb_a, hdmi, displayport, rj45, sd
- protocol: array of protocol IDs such as usb2, usb3, usb4, thunderbolt
- power_watt: number
- features: array of feature IDs such as ethernet, power_delivery, video_output, fast_charge, sd_reader

Rules:
- connectors are physical ports or cable ends
- protocols are transport standards or bandwidth families
- features are functional capabilities, never connectors
- do not use size, color, material, packaging, dimensions or marketing copy as tags
- if a value is unclear, omit it instead of guessing
- if a new candidate tag appears outside the taxonomy, put it in "pending_review"

Return JSON in this shape:
{
  "connector": ["usb_c"],
  "protocol": ["usb4"],
  "power_watt": 100,
  "features": ["power_delivery", "video_output"],
  "pending_review": []
}

Available taxonomy:
connectors: {{taxonomy_connectors}}
protocols: {{taxonomy_protocols}}
features: {{taxonomy_features}}

Input:
{{product_description}}
`;
