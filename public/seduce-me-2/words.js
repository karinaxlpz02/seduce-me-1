// Associations cycle on each interaction, rather than erasing the correspondence.
export const associations = [
  ['seduction', 'temptation', 'invitation', 'allure'],
  ['seduce', 'entice', 'attract', 'beckon'],
  ['desire', 'longing', 'yearning', 'hunger'],
  ['flirt', 'tease', 'charm', 'tempt'],
  ['flirting', 'teasing', 'charming', 'tempting'],
  ['flirtatious', 'playful', 'magnetic', 'inviting'],
  ['tension', 'anticipation', 'suspense', 'friction'],
  ['warm', 'tender', 'intimate', 'close'],
  ['warmth', 'tenderness', 'intimacy', 'closeness'],
  ['heart', 'pulse', 'ache', 'desire'],
  ['crush', 'infatuation', 'attraction', 'fascination'],
  ['romance', 'intimacy', 'fantasy', 'longing'],
  ['date', 'rendezvous', 'encounter', 'invitation'],
  ['dates', 'rendezvous', 'encounters', 'invitations'],
  ['love', 'devotion', 'affection', 'attachment'],
  ['confession', 'admission', 'exposure', 'surrender'],
  ['weakness', 'vulnerability', 'softness', 'surrender'],
  ['surprise', 'wonder', 'intrigue', 'spark'],
  ['surprised', 'intrigued', 'captivated', 'enchanted'],
  ['surprising', 'intriguing', 'captivating', 'enchanting'],
  ['curious', 'drawn', 'enchanted', 'captivated'],
  ['curiosity', 'intrigue', 'fascination', 'attraction'],
  ['interest', 'attention', 'attraction', 'desire'],
  ['attention', 'regard', 'attraction', 'devotion'],
  ['stay', 'linger', 'remain', 'belong'],
  ['staying', 'lingering', 'remaining', 'belonging'],
  ['closer', 'nearer', 'intimate', 'entwined'],
  ['tender', 'gentle', 'soft', 'vulnerable'],
  ['touch', 'contact', 'caress', 'connection'],
  ['flattered', 'noticed', 'desired', 'wanted'],
  ['rejection', 'distance', 'hesitation', 'resistance'],
  ['rival', 'equal', 'mirror', 'magnet'],
  ['rivalry', 'friction', 'chemistry', 'tension'],
  ['pleasure', 'delight', 'warmth', 'desire'],
  ['glad', 'delighted', 'enchanted', 'drawn'],
  ['waiting', 'anticipating', 'yearning', 'lingering'],
  ['honesty', 'openness', 'vulnerability', 'intimacy'],
  ['undefended', 'unguarded', 'exposed', 'vulnerable'],
  ['yes', 'closer', 'welcome', 'stay'],
  ['yours', 'nearby', 'devoted', 'entwined']
];

export function alternativesFor(word) {
  const normalized = word.toLowerCase();
  return associations.find(group => group.includes(normalized)) || null;
}

export function matchCase(word, reference) {
  if (reference === reference.toUpperCase()) return word.toUpperCase();
  if (reference[0] === reference[0].toUpperCase()) return word[0].toUpperCase() + word.slice(1);
  return word;
}
