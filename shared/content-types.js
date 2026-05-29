const CONTENT_TYPES = [
    { id: "summary",    icon: "\u{1F4DD}", label: "Resum",            order: 1 },
    { id: "deepdive",   icon: "\u{1F52C}", label: "Aprofundiment",    order: 2 },
    { id: "conceptmap", icon: "\u{1F9E0}", label: "Mapa conceptual",  order: 3 },
    { id: "science",    icon: "\u{1F4CA}", label: "Validaci\u00F3",   order: 4 },
];

const TYPE_ICON_MAP = Object.fromEntries(CONTENT_TYPES.map(t => [t.id, t.icon]));

const LEGACY_TYPE_MAP = {
    "lite": "summary",
    "deep": "deepdive",
};

function _resolveType(typeId) {
    if (!typeId) return "summary";
    if (CONTENT_TYPES.some(t => t.id === typeId)) return typeId;
    return LEGACY_TYPE_MAP[typeId] || "summary";
}

function getTypeIcon(typeId) {
    return TYPE_ICON_MAP[_resolveType(typeId)] || "\u{2753}";
}

function getTypeLabel(typeId) {
    const t = CONTENT_TYPES.find(c => c.id === _resolveType(typeId));
    return t ? t.label : "Resum";
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { CONTENT_TYPES, TYPE_ICON_MAP, getTypeIcon, getTypeLabel };
}
