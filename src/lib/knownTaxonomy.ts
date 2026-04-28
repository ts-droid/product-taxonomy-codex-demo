export type CanonicalRegistryItem = {
  id: string;
  label: string;
  group: string;
  aliases: string[];
};

export const KNOWN_SPECIFICATIONS: CanonicalRegistryItem[] = [
  { id: 'usb_c', label: 'USB-C', group: 'connector', aliases: ['usb-c', 'usb c', 'type-c', 'typ-c', 'usbc'] },
  { id: 'usb_a', label: 'USB-A', group: 'connector', aliases: ['usb-a', 'usb a'] },
  { id: 'hdmi', label: 'HDMI', group: 'connector', aliases: ['hdmi'] },
  { id: 'displayport', label: 'DisplayPort', group: 'connector', aliases: ['displayport', 'display port', 'dp'] },
  { id: 'rj45', label: 'Ethernet (RJ45)', group: 'connector', aliases: ['rj45', 'ethernet', 'gigabit ethernet'] },
  { id: 'sd', label: 'SD Card', group: 'connector', aliases: ['sd', 'sd-kortläsare', 'sd card', 'kortläsare'] },
  { id: 'bluetooth_4_0', label: 'Bluetooth 4.0', group: 'wireless', aliases: ['bluetooth 4.0', 'bt 4.0'] },
  { id: 'bluetooth_5_0', label: 'Bluetooth 5.0', group: 'wireless', aliases: ['bluetooth 5.0', 'ble 5.0'] },
  { id: 'bluetooth_5_2', label: 'Bluetooth 5.2', group: 'wireless', aliases: ['bluetooth 5.2', 'ble 5.2'] },
  { id: 'wifi_5', label: 'Wi-Fi 5', group: 'wireless', aliases: ['wifi 5', 'wi-fi 5', '802.11ac'] },
  { id: 'wifi_6', label: 'Wi-Fi 6', group: 'wireless', aliases: ['wifi 6', 'wi-fi 6', '802.11ax'] },
  { id: 'wifi_6e', label: 'Wi-Fi 6E', group: 'wireless', aliases: ['wifi 6e', 'wi-fi 6e'] },
  { id: 'usb4', label: 'USB4', group: 'protocol', aliases: ['usb4', 'usb 4'] },
  { id: 'thunderbolt_4', label: 'Thunderbolt 4', group: 'protocol', aliases: ['thunderbolt 4', 'tb4'] },
  { id: 'thunderbolt_5', label: 'Thunderbolt 5', group: 'protocol', aliases: ['thunderbolt 5', 'tb5'] },
  { id: 'power_delivery', label: 'Power Delivery', group: 'power', aliases: ['power delivery', 'usb pd', 'pd'] },
  { id: 'pd_3_0', label: 'PD 3.0', group: 'power', aliases: ['pd 3.0', 'power delivery 3.0'] },
  { id: 'pd_3_1', label: 'PD 3.1', group: 'power', aliases: ['pd 3.1', 'power delivery 3.1'] },
  { id: 'gan', label: 'GaN', group: 'power', aliases: ['gan', 'gallium nitride'] },
  { id: 'qi', label: 'Qi', group: 'charging', aliases: ['qi'] },
  { id: 'qi2', label: 'Qi2', group: 'charging', aliases: ['qi2'] },
  { id: 'magsafe', label: 'MagSafe', group: 'charging', aliases: ['magsafe'] },
  { id: 'lightning', label: 'Lightning', group: 'connector', aliases: ['lightning'] },
  { id: 'audio_3_5mm', label: '3.5 mm', group: 'audio', aliases: ['3.5mm', '3,5 mm', 'headphone jack', 'audio jack'] },
  { id: 'nvme', label: 'NVMe', group: 'storage', aliases: ['nvme'] },
  { id: 'ssd', label: 'SSD', group: 'storage', aliases: ['ssd'] },
];

export const KNOWN_COMPATIBILITY_TARGETS: CanonicalRegistryItem[] = [
  { id: 'macbook_pro', label: 'MacBook Pro', group: 'laptop', aliases: ['macbook pro'] },
  { id: 'macbook_air', label: 'MacBook Air', group: 'laptop', aliases: ['macbook air'] },
  { id: 'macbook', label: 'MacBook', group: 'laptop', aliases: ['macbook'] },
  { id: 'ipad_pro', label: 'iPad Pro', group: 'tablet', aliases: ['ipad pro'] },
  { id: 'ipad_air', label: 'iPad Air', group: 'tablet', aliases: ['ipad air'] },
  { id: 'ipad', label: 'iPad', group: 'tablet', aliases: ['ipad'] },
  { id: 'iphone', label: 'iPhone', group: 'phone', aliases: ['iphone'] },
  { id: 'apple_watch', label: 'Apple Watch', group: 'wearable', aliases: ['apple watch'] },
  { id: 'imac', label: 'iMac', group: 'desktop', aliases: ['imac'] },
  { id: 'mac_mini', label: 'Mac mini', group: 'desktop', aliases: ['mac mini'] },
  { id: 'windows_laptop', label: 'Windows laptop', group: 'laptop', aliases: ['windows laptop', 'pc laptop'] },
  { id: 'usb_c_devices', label: 'USB-C devices', group: 'generic', aliases: ['usb-c devices', 'usb c devices'] },
];

export const KNOWN_FEATURES: CanonicalRegistryItem[] = [
  { id: 'ergonomic', label: 'Ergonomisk', group: 'usability', aliases: ['ergonomisk', 'ergonomic'] },
  { id: 'wireless', label: 'Trådlös', group: 'connectivity', aliases: ['trådlös', 'wireless'] },
  { id: 'rechargeable', label: 'Uppladdningsbar', group: 'power', aliases: ['uppladdningsbar', 'rechargeable'] },
  { id: 'portable', label: 'Resevänlig', group: 'mobility', aliases: ['resevänlig', 'travel friendly', 'portable'] },
  { id: 'foldable', label: 'Vikbar', group: 'form_factor', aliases: ['vikbar', 'foldable'] },
  { id: 'magnetic', label: 'Magnetisk', group: 'mounting', aliases: ['magnetisk', 'magnetic'] },
  { id: 'desktop_setup', label: 'Skrivbordssetup', group: 'use_case', aliases: ['skrivbordssetup', 'desktop setup'] },
  { id: 'video_output', label: 'Videoutgång', group: 'media', aliases: ['videoutgång', 'video output'] },
  { id: 'call_recording', label: 'Samtalsinspelning', group: 'recording', aliases: ['samtalsinspelning', 'call recording'] },
  { id: 'meeting_recording', label: 'Mötesinspelning', group: 'recording', aliases: ['mötesinspelning', 'meeting recording'] },
  { id: 'transcription', label: 'Transkribering', group: 'ai', aliases: ['transkribering', 'transcription'] },
  { id: 'ai_summary', label: 'AI-sammanfattning', group: 'ai', aliases: ['ai-sammanfattning', 'ai summary'] },
];

function formatRegistryBlock(title: string, items: CanonicalRegistryItem[]) {
  return `${title}:\n${items.map((item) => `- ${item.id} | ${item.label} | group: ${item.group} | aliases: ${item.aliases.join(', ')}`).join('\n')}`;
}

export function buildKnownTaxonomyContext() {
  return [
    formatRegistryBlock('KNOWN SPECIFICATIONS', KNOWN_SPECIFICATIONS),
    formatRegistryBlock('KNOWN COMPATIBILITY TARGETS', KNOWN_COMPATIBILITY_TARGETS),
    formatRegistryBlock('KNOWN FEATURES', KNOWN_FEATURES),
  ].join('\n\n');
}
