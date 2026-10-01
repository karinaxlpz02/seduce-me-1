// Only desire, lack of desire, human touch, and sensation are interactive.
export const associations = [["desire", "longing", "yearning", "craving"], ["longing", "yearning", "ache", "hunger"], ["seduction", "allure", "temptation", "attraction"], ["seduce", "entice", "tempt", "allure"], ["flirt", "tease", "entice", "tempt"], ["flirting", "teasing", "enticing", "tempting"], ["flirtatious", "seductive", "sensual", "alluring"], ["crush", "infatuation", "attraction", "desire"], ["romance", "passion", "intimacy", "desire"], ["love", "affection", "passion", "devotion"], ["attraction", "desire", "chemistry", "magnetism"], ["interest", "attraction", "desire", "infatuation"], ["desired", "wanted", "craved", "yearned"], ["flattered", "desired", "wanted", "attracted"], ["tension", "chemistry", "arousal", "anticipation"], ["passion", "arousal", "desire", "hunger"], ["rejection", "aversion", "disinterest", "reluctance"], ["reject", "refuse", "resist", "withdraw"], ["rejected", "unwanted", "undesired", "unloved"], ["disinterest", "indifference", "detachment", "apathy"], ["uninterested", "indifferent", "detached", "unmoved"], ["unimpressed", "uninterested", "indifferent", "unmoved"], ["reluctance", "resistance", "aversion", "hesitation"], ["resist", "withdraw", "recoil", "refuse"], ["cold", "numb", "unfeeling", "detached"], ["numbness", "detachment", "absence", "indifference"], ["touch", "contact", "caress", "embrace"], ["touching", "caressing", "embracing", "stroking"], ["touched", "caressed", "held", "embraced"], ["hand", "palm", "fingers", "skin"], ["hands", "palms", "fingers", "skin"], ["skin", "flesh", "body", "touch"], ["body", "flesh", "skin", "warmth"], ["bodies", "skin", "flesh", "warmth"], ["kiss", "caress", "touch", "embrace"], ["lips", "mouth", "kiss", "breath"], ["intimacy", "closeness", "contact", "touch"], ["intimate", "tender", "sensual", "close"], ["tender", "gentle", "soft", "sensitive"], ["tenderness", "softness", "warmth", "intimacy"], ["warm", "heated", "flushed", "tingling"], ["warmth", "heat", "flush", "tingle"], ["warmly", "tenderly", "sensually", "softly"], ["soft", "silken", "smooth", "tender"], ["softness", "silkiness", "smoothness", "tenderness"], ["heart", "heartbeat", "pulse", "flutter"], ["hearts", "heartbeats", "pulses", "flutters"], ["sensation", "feeling", "tingle", "shiver"], ["sensations", "feelings", "tingles", "shivers"], ["feel", "sense", "tingle", "shiver"], ["feels", "tingles", "trembles", "shivers"], ["feeling", "sensing", "tingling", "shivering"], ["feelings", "sensations", "tingles", "shivers"], ["pleasure", "delight", "ecstasy", "bliss"], ["taste", "flavor", "sweetness", "sensation"], ["tastes", "savors", "tingles", "lingers"], ["tasting", "savoring", "sensing", "tingling"], ["smell", "scent", "aroma", "fragrance"], ["smells", "scents", "aromas", "fragrances"], ["sweet", "honeyed", "sugary", "silken"], ["sweetness", "flavor", "pleasure", "delight"], ["breath", "sigh", "gasp", "shiver"], ["breathing", "sighing", "gasping", "trembling"], ["ache", "throb", "pulse", "tingle"], ["homesick", "yearning", "longing", "aching"]];

export function alternativesFor(word) {
  const normalized = word.toLowerCase();
  const matches = associations.filter(group => group.includes(normalized));
  return matches.length ? [...new Set(matches.flat())] : null;
}

export function nextAssociation(current, history = [], random = Math.random) {
  const choices = (alternativesFor(current) || []).filter(word => word !== current.toLowerCase());
  if (!choices.length) return current;
  const fresh = choices.filter(word => !history.includes(word));
  const pool = fresh.length ? fresh : choices;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

export function matchCase(word, reference) {
  if (reference === reference.toUpperCase()) return word.toUpperCase();
  if (reference[0] === reference[0].toUpperCase()) return word[0].toUpperCase() + word.slice(1);
  return word;
}
