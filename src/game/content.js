/**
 * Game content: fish species, joke catches, locations, upgrades.
 * All art is procedural: fish are described by body shape + palette,
 * and the renderer draws them from a shared parametric fish painter.
 */

/**
 * Fish body archetypes the renderer knows how to paint.
 *   'round'   - stubby disc body (sunfish, pufferfish)
 *   'slim'    - elongated torpedo (anchovy, barracuda)
 *   'flat'    - wide and thin (flounder, ray)
 *   'blob'    - amorphous blob (jellyfish, blobfish)
 *   'eel'     - long ribbon (eel, ribbon eel)
 *   'shark'   - shark silhouette
 *   'squid'   - mantle + tentacles
 *   'crab'    - shell + legs
 *   'star'    - starfish
 *   'lobster' - segmented body + big claws
 *   'shrimp'  - comma-shaped swimmer
 *   'jelly'   - pulsing bell + tentacles
 *   'ray'     - manta wings, seen from above
 *   'turtle'  - shell + flippers
 *   'whale'   - big smooth swimmer with a fluke
 *   'boot'    - old boot (joke)
 *   'bottle'  - message in a bottle (joke)
 *   'seat'    - golden toilet seat (joke)
 *   'note'    - piece of paper / note (joke)
 */
export const ARCHETYPES = new Set([
  'round', 'slim', 'flat', 'blob', 'eel', 'shark', 'squid', 'crab', 'star',
  'lobster', 'shrimp', 'jelly', 'ray', 'turtle', 'whale',
  'boot', 'bottle', 'seat', 'note',
]);

/**
 * Rarity tiers.
 *  common     - everyday catches
 *  uncommon   - needs better bait / luck
 *  rare       - needs fish finder or high bait
 *  legendary  - the stuff people brag about
 *  joke       - the stuff people tell the story about
 */
export const TIERS = {
  common: { color: '#9fb3c8', glow: null, label: 'Common' },
  uncommon: { color: '#5fbf5a', glow: null, label: 'Uncommon' },
  rare: { color: '#4aa3ff', glow: '#7fd0ff', label: 'Rare' },
  legendary: { color: '#ffd45e', glow: '#ffed9e', label: 'Legendary' },
  joke: { color: '#c98ae8', glow: '#e5b6ff', label: 'Ridiculous' },
};

/**
 * Every catchable species.
 *
 * weight   - relative size, drives the tension minigame difficulty
 * price    - coin value when sold
 * weightIn - rarity roll weight (per location, scaled by bait/finder)
 * minBait  - minimum bait level required for this species to be rolled
 * minRod   - minimum rod level required
 * minLine  - minimum line level required
 * requires - location ids this fish appears in (empty = everywhere)
 */
export const FISH = [
  // ------------------------------------------------------------- Sunny Bay
  {
    id: 'anchovy', name: 'Anchovy', archetype: 'slim', tier: 'common',
    weight: 1, price: 20, weightIn: 34, minBait: 0, minRod: 0, minLine: 0,
    palette: { body: '#b9c7d6', belly: '#e6eef6', fin: '#8fa3b8', eye: '#101020' },
    locations: ['sunny_bay'],
  },
  {
    id: 'sardine', name: 'Sardine', archetype: 'slim', tier: 'common',
    weight: 1.4, price: 26, weightIn: 30, minBait: 0, minRod: 0, minLine: 0,
    palette: { body: '#8fa8c4', belly: '#dfe9f2', fin: '#6f88a4', eye: '#101020' },
    locations: ['sunny_bay', 'rocky_shore'],
  },
  {
    id: 'mackerel', name: 'Mackerel', archetype: 'slim', tier: 'common',
    weight: 2, price: 38, weightIn: 22, minBait: 0, minRod: 0, minLine: 0,
    palette: { body: '#5d8fc4', belly: '#f2f6fa', fin: '#3f6b9c', eye: '#101020' },
    locations: ['sunny_bay', 'rocky_shore'],
  },
  {
    id: 'perch', name: 'Perch', archetype: 'slim', tier: 'common',
    weight: 2.4, price: 50, weightIn: 20, minBait: 0, minRod: 0, minLine: 0,
    palette: { body: '#6f9a52', belly: '#e2ecc9', fin: '#4e7238', eye: '#101020' },
    locations: ['sunny_bay', 'rocky_shore'],
  },
  {
    id: 'sunfish', name: 'Sunfish', archetype: 'round', tier: 'common',
    weight: 3.5, price: 68, weightIn: 14, minBait: 0, minRod: 0, minLine: 0,
    palette: { body: '#e0a54a', belly: '#f5d79a', fin: '#b87c2c', eye: '#101020' },
    locations: ['sunny_bay', 'rocky_shore'],
  },
  {
    id: 'cod', name: 'Cod', archetype: 'slim', tier: 'common',
    weight: 4, price: 82, weightIn: 14, minBait: 0, minRod: 0, minLine: 0,
    palette: { body: '#a3b782', belly: '#e6ecd4', fin: '#7d8f5f', eye: '#101020' },
    locations: ['sunny_bay', 'rocky_shore'],
  },
  {
    id: 'trout', name: 'Rainbow Trout', archetype: 'slim', tier: 'uncommon',
    weight: 3, price: 115, weightIn: 12, minBait: 0, minRod: 0, minLine: 1,
    palette: { body: '#7fa9b8', belly: '#eef4f6', fin: '#5c8494', eye: '#101020', stripe: '#e08a9a' },
    locations: ['sunny_bay', 'rocky_shore'],
  },
  {
    id: 'herring', name: 'Silver Herring', archetype: 'slim', tier: 'common',
    weight: 1.8, price: 44, weightIn: 20, minBait: 0, minRod: 0, minLine: 0,
    palette: { body: '#c3d3e2', belly: '#f2f7fb', fin: '#9db2c6', eye: '#101020' },
    locations: ['sunny_bay', 'rocky_shore', 'deep_ocean'],
  },
  {
    id: 'mullet', name: 'Silver Mullet', archetype: 'slim', tier: 'common',
    weight: 2.6, price: 58, weightIn: 16, minBait: 0, minRod: 0, minLine: 0,
    palette: { body: '#9aa8b4', belly: '#e8eef3', fin: '#71808d', eye: '#101020' },
    locations: ['sunny_bay', 'rocky_shore'],
  },
  {
    id: 'seahorse', name: 'Little Seahorse', archetype: 'eel', tier: 'common',
    weight: 1.2, price: 90, weightIn: 9, minBait: 1, minRod: 1, minLine: 1,
    palette: { body: '#d9a441', belly: '#f6dd9e', fin: '#a87526', eye: '#101020' },
    locations: ['sunny_bay', 'rocky_shore'],
  },
  {
    id: 'moon_jelly', name: 'Moon Jelly', archetype: 'jelly', tier: 'common',
    weight: 1, price: 70, weightIn: 10, minBait: 0, minRod: 0, minLine: 0,
    palette: { body: '#a8d8e8', belly: '#e2f4fa', fin: '#7fb8cc', eye: '#101020' },
    locations: ['sunny_bay', 'rocky_shore', 'deep_ocean'],
  },
  {
    id: 'hermit_crab', name: 'Hermit Crab', archetype: 'crab', tier: 'common',
    weight: 1.8, price: 52, weightIn: 11, minBait: 0, minRod: 0, minLine: 0,
    palette: { body: '#c98f5e', belly: '#e8c49a', fin: '#9c6a42', eye: '#101020' },
    locations: ['sunny_bay', 'rocky_shore'],
  },
  {
    id: 'shrimp_prawn', name: 'Sand Shrimp', archetype: 'shrimp', tier: 'common',
    weight: 0.8, price: 38, weightIn: 12, minBait: 0, minRod: 0, minLine: 0,
    palette: { body: '#e2a882', belly: '#f7d9bd', fin: '#c48a64', eye: '#101020' },
    locations: ['sunny_bay', 'rocky_shore', 'coral_reef'],
  },

  // ----------------------------------------------------------- Rocky Shore
  {
    id: 'rockbass', name: 'Rock Bass', archetype: 'round', tier: 'common',
    weight: 3.6, price: 72, weightIn: 20, minBait: 0, minRod: 1, minLine: 0,
    palette: { body: '#7d8b6a', belly: '#dbe2c9', fin: '#5c6a4c', eye: '#101020' },
    locations: ['rocky_shore'],
  },
  {
    id: 'flounder', name: 'Flounder', archetype: 'flat', tier: 'common',
    weight: 3.2, price: 88, weightIn: 18, minBait: 0, minRod: 1, minLine: 0,
    palette: { body: '#a98a6b', belly: '#e5d6c2', fin: '#87694d', eye: '#101020', spot: '#6d5238' },
    locations: ['rocky_shore'],
  },
  {
    id: 'sea_bass', name: 'Sea Bass', archetype: 'slim', tier: 'uncommon',
    weight: 5, price: 150, weightIn: 16, minBait: 1, minRod: 2, minLine: 2,
    palette: { body: '#4f6f8a', belly: '#e3ebf2', fin: '#365069', eye: '#101020' },
    locations: ['rocky_shore', 'deep_ocean'],
  },
  {
    id: 'tuna', name: 'Bluefin Tuna', archetype: 'slim', tier: 'uncommon',
    weight: 8, price: 220, weightIn: 12, minBait: 1, minRod: 2, minLine: 2,
    palette: { body: '#3a5f9c', belly: '#e9eff7', fin: '#e8b552', eye: '#101020' },
    locations: ['rocky_shore', 'deep_ocean'],
  },
  {
    id: 'octopus', name: 'Octopus', archetype: 'blob', tier: 'uncommon',
    weight: 6, price: 190, weightIn: 9, minBait: 2, minRod: 2, minLine: 2,
    palette: { body: '#b0709c', belly: '#d9a3c4', fin: '#8a4f7a', eye: '#101020' },
    locations: ['rocky_shore'],
  },
  {
    id: 'squid', name: 'Squid', archetype: 'squid', tier: 'uncommon',
    weight: 5.5, price: 185, weightIn: 9, minBait: 1, minRod: 2, minLine: 2,
    palette: { body: '#c98a8a', belly: '#f0c8c8', fin: '#9c6060', eye: '#101020' },
    locations: ['rocky_shore', 'deep_ocean'],
  },
  {
    id: 'spiny_crab', name: 'Spiny Crab', archetype: 'crab', tier: 'uncommon',
    weight: 4, price: 145, weightIn: 12, minBait: 1, minRod: 2, minLine: 1,
    palette: { body: '#c2543f', belly: '#eda184', fin: '#8f3527', eye: '#101020' },
    locations: ['rocky_shore', 'deep_ocean'],
  },
  {
    id: 'lobster', name: 'Spiny Lobster', archetype: 'lobster', tier: 'uncommon',
    weight: 6.5, price: 260, weightIn: 8, minBait: 2, minRod: 2, minLine: 2,
    palette: { body: '#c1462e', belly: '#ec9b76', fin: '#8a2f1e', eye: '#ffd45e' },
    locations: ['rocky_shore', 'deep_ocean', 'coral_reef'],
  },
  {
    id: 'stingray', name: 'Southern Stingray', archetype: 'ray', tier: 'rare',
    weight: 9, price: 330, weightIn: 7, minBait: 2, minRod: 3, minLine: 3,
    palette: { body: '#8a7458', belly: '#e0d2b8', fin: '#6b5942', eye: '#101020', spot: '#5e4b36' },
    locations: ['rocky_shore', 'deep_ocean'],
  },
  {
    id: 'sea_turtle', name: 'Green Sea Turtle', archetype: 'turtle', tier: 'rare',
    weight: 14, price: 520, weightIn: 6, minBait: 3, minRod: 3, minLine: 3,
    palette: { body: '#4f8a52', belly: '#d8e0b0', fin: '#3a6b3e', eye: '#101020' },
    locations: ['rocky_shore', 'deep_ocean', 'coral_reef'],
  },

  // ------------------------------------------------------------ Deep Ocean
  {
    id: 'barracuda', name: 'Barracuda', archetype: 'slim', tier: 'uncommon',
    weight: 7, price: 200, weightIn: 16, minBait: 1, minRod: 3, minLine: 2,
    palette: { body: '#7d94a8', belly: '#e6eef4', fin: '#5a7284', eye: '#101020' },
    locations: ['deep_ocean'],
  },
  {
    id: 'mahi', name: 'Mahi-Mahi', archetype: 'slim', tier: 'rare',
    weight: 9, price: 320, weightIn: 10, minBait: 2, minRod: 3, minLine: 3,
    palette: { body: '#3fbf8a', belly: '#f5e37a', fin: '#2a8f66', eye: '#101020' },
    locations: ['deep_ocean', 'coral_reef'],
  },
  {
    id: 'swordfish', name: 'Swordfish', archetype: 'shark', tier: 'rare',
    weight: 12, price: 430, weightIn: 7, minBait: 3, minRod: 3, minLine: 3,
    palette: { body: '#4a6b8a', belly: '#dfe9f2', fin: '#33506b', eye: '#101020' },
    locations: ['deep_ocean'],
  },
  {
    id: 'blobfish', name: 'Blobfish', archetype: 'blob', tier: 'rare',
    weight: 7, price: 340, weightIn: 6, minBait: 3, minRod: 3, minLine: 3,
    palette: { body: '#e2a0a0', belly: '#f4cdcd', fin: '#c07f7f', eye: '#101020' },
    locations: ['deep_ocean', 'the_abyss'],
  },
  {
    id: 'anglerfish', name: 'Anglerfish', archetype: 'blob', tier: 'rare',
    weight: 8, price: 380, weightIn: 6, minBait: 3, minRod: 3, minLine: 4,
    palette: { body: '#3f3550', belly: '#5f5470', fin: '#2b2438', eye: '#ffd45e', lure: '#a8e6ff' },
    locations: ['the_abyss', 'deep_ocean'],
  },
  {
    id: 'giant_horsefish', name: 'Giant Horsefish', archetype: 'slim', tier: 'legendary',
    weight: 20, price: 1400, weightIn: 2, minBait: 4, minRod: 4, minLine: 5,
    palette: { body: '#c05a3a', belly: '#f0c39a', fin: '#8f3d26', eye: '#ffd45e' },
    locations: ['deep_ocean'],
    joke: 'It pulled your boat three feet. Your boat has opinions now.',
  },
  {
    id: 'mako', name: 'Shortfin Mako', archetype: 'shark', tier: 'uncommon',
    weight: 15, price: 480, weightIn: 9, minBait: 3, minRod: 3, minLine: 4,
    palette: { body: '#3f6a8c', belly: '#eef4f9', fin: '#2b4a66', eye: '#101020' },
    locations: ['deep_ocean', 'the_abyss'],
  },
  {
    id: 'basking_shark', name: 'Basking Shark', archetype: 'whale', tier: 'rare',
    weight: 26, price: 900, weightIn: 5, minBait: 4, minRod: 4, minLine: 4,
    palette: { body: '#5f6d78', belly: '#c9d3da', fin: '#414d57', eye: '#101020' },
    locations: ['deep_ocean'],
  },
  {
    id: 'humpback', name: 'Humpback Whale', archetype: 'whale', tier: 'legendary',
    weight: 34, price: 2200, weightIn: 2, minBait: 5, minRod: 5, minLine: 5,
    palette: { body: '#3f4f63', belly: '#cfd8e0', fin: '#2b3746', eye: '#101020' },
    locations: ['deep_ocean', 'the_abyss'],
    joke: 'It sang for eleven minutes. You are not qualified to sell that.',
  },
  {
    id: 'manta_ray', name: 'Giant Manta Ray', archetype: 'ray', tier: 'legendary',
    weight: 24, price: 1500, weightIn: 2, minBait: 4, minRod: 4, minLine: 4,
    palette: { body: '#3f4a5c', belly: '#dfe6ee', fin: '#2a3341', eye: '#101020', spot: '#7f8b9c' },
    locations: ['deep_ocean', 'the_abyss'],
  },

  // ------------------------------------------------------------ Coral Reef
  {
    id: 'clownfish', name: 'Clownfish', archetype: 'round', tier: 'common',
    weight: 1.6, price: 42, weightIn: 24, minBait: 0, minRod: 2, minLine: 1,
    palette: { body: '#f08a3c', belly: '#fde8d0', fin: '#e0f0f5', eye: '#101020', stripe: '#fdf3d8' },
    locations: ['coral_reef'],
  },
  {
    id: 'tang', name: 'Blue Tang', archetype: 'round', tier: 'uncommon',
    weight: 3, price: 105, weightIn: 18, minBait: 1, minRod: 2, minLine: 2,
    palette: { body: '#3d7fd6', belly: '#ffd45e', fin: '#2b5f9c', eye: '#101020' },
    locations: ['coral_reef'],
  },
  {
    id: 'butterflyfish', name: 'Butterflyfish', archetype: 'slim', tier: 'uncommon',
    weight: 2.4, price: 120, weightIn: 16, minBait: 1, minRod: 2, minLine: 2,
    palette: { body: '#f0c95e', belly: '#fdf3d8', fin: '#3d7fd6', eye: '#101020', stripe: '#101020' },
    locations: ['coral_reef'],
  },
  {
    id: 'parrotfish', name: 'Parrotfish', archetype: 'slim', tier: 'rare',
    weight: 6, price: 300, weightIn: 10, minBait: 2, minRod: 3, minLine: 3,
    palette: { body: '#2f9c86', belly: '#e88fb0', fin: '#1f7463', eye: '#101020' },
    locations: ['coral_reef'],
  },
  {
    id: 'stonefish', name: 'Stonefish', archetype: 'blob', tier: 'rare',
    weight: 6.5, price: 340, weightIn: 8, minBait: 3, minRod: 3, minLine: 3,
    palette: { body: '#7a6a52', belly: '#b3a288', fin: '#5b4e3c', eye: '#ffd45e' },
    locations: ['coral_reef'],
  },
  {
    id: 'seahorse', name: 'Seahorse', archetype: 'eel', tier: 'rare',
    weight: 2, price: 360, weightIn: 7, minBait: 3, minRod: 3, minLine: 2,
    palette: { body: '#f0a63c', belly: '#ffd9a0', fin: '#c47a22', eye: '#101020' },
    locations: ['coral_reef'],
  },
  {
    id: 'crab', name: 'Crab', archetype: 'crab', tier: 'common',
    weight: 3.2, price: 60, weightIn: 18, minBait: 0, minRod: 2, minLine: 2,
    palette: { body: '#d1593a', belly: '#f2a077', fin: '#a13f28', eye: '#101020' },
    locations: ['coral_reef', 'rocky_shore'],
  },
  {
    id: 'starfish', name: 'Starfish', archetype: 'star', tier: 'common',
    weight: 2, price: 55, weightIn: 14, minBait: 0, minRod: 2, minLine: 1,
    palette: { body: '#e07a4a', belly: '#f5b48c', fin: '#b85a30', eye: '#101020' },
    locations: ['coral_reef'],
  },
  {
    id: 'damselfish', name: 'Blue Damselfish', archetype: 'round', tier: 'common',
    weight: 1.2, price: 46, weightIn: 15, minBait: 0, minRod: 2, minLine: 1,
    palette: { body: '#4a86c8', belly: '#d8ecf8', fin: '#2f639c', eye: '#101020' },
    locations: ['coral_reef'],
  },
  {
    id: 'triggerfish', name: 'Picasso Triggerfish', archetype: 'round', tier: 'uncommon',
    weight: 2.8, price: 160, weightIn: 11, minBait: 1, minRod: 2, minLine: 2,
    palette: { body: '#f0c95e', belly: '#fdf3d8', fin: '#3d7fd6', eye: '#101020', stripe: '#101020' },
    locations: ['coral_reef'],
  },
  {
    id: 'cleaner_shrimp', name: 'Cleaner Shrimp', archetype: 'shrimp', tier: 'uncommon',
    weight: 1, price: 130, weightIn: 11, minBait: 1, minRod: 2, minLine: 2,
    palette: { body: '#e8e4dc', belly: '#ffffff', fin: '#c0553f', eye: '#101020' },
    locations: ['coral_reef'],
  },
  {
    id: 'spotted_eel', name: 'Spotted Moray Eel', archetype: 'eel', tier: 'rare',
    weight: 7, price: 390, weightIn: 8, minBait: 3, minRod: 3, minLine: 3,
    palette: { body: '#7a8f4a', belly: '#d6dfa8', fin: '#556637', eye: '#ffd45e', spot: '#3f4a26' },
    locations: ['coral_reef', 'the_abyss'],
  },
  {
    id: 'lionfish', name: 'Lionfish', archetype: 'slim', tier: 'rare',
    weight: 5.5, price: 420, weightIn: 7, minBait: 2, minRod: 3, minLine: 3,
    palette: { body: '#c96a4a', belly: '#f2ddc8', fin: '#e8b552', eye: '#101020', stripe: '#fdf3d8' },
    locations: ['coral_reef'],
  },
  {
    id: 'napoleon_wrasse', name: 'Napoleon Wrasse', archetype: 'slim', tier: 'rare',
    weight: 13, price: 640, weightIn: 5, minBait: 3, minRod: 4, minLine: 3,
    palette: { body: '#4f6f9c', belly: '#d8e4f2', fin: '#37547a', eye: '#101020', spot: '#e8b552' },
    locations: ['coral_reef'],
  },
  {
    id: 'crown_of_thorns', name: 'Crown of Thorns', archetype: 'star', tier: 'rare',
    weight: 4, price: 480, weightIn: 6, minBait: 3, minRod: 3, minLine: 3,
    palette: { body: '#8f4a3a', belly: '#c08a72', fin: '#5f2c22', eye: '#101020' },
    locations: ['coral_reef'],
  },

  // ------------------------------------------------------------- The Abyss
  {
    id: 'vampire_squid', name: 'Vampire Squid', archetype: 'squid', tier: 'rare',
    weight: 6, price: 400, weightIn: 12, minBait: 3, minRod: 4, minLine: 4,
    palette: { body: '#5a2a3a', belly: '#8f4a5f', fin: '#3a1824', eye: '#ff6b6b' },
    locations: ['the_abyss'],
  },
  {
    id: 'lanternfish', name: 'Lanternfish', archetype: 'slim', tier: 'rare',
    weight: 3, price: 370, weightIn: 12, minBait: 3, minRod: 4, minLine: 3,
    palette: { body: '#2a3a5c', belly: '#4a6b8f', fin: '#1c2842', eye: '#a8ffdf' },
    locations: ['the_abyss'],
  },
  {
    id: 'gulper_eel', name: 'Gulper Eel', archetype: 'eel', tier: 'rare',
    weight: 9, price: 450, weightIn: 9, minBait: 4, minRod: 4, minLine: 4,
    palette: { body: '#3a2a3a', belly: '#5f4a5f', fin: '#241a24', eye: '#ff9b6b' },
    locations: ['the_abyss'],
  },
  {
    id: 'colossal_squid', name: 'Colossal Squid', archetype: 'squid', tier: 'legendary',
    weight: 22, price: 1700, weightIn: 2, minBait: 5, minRod: 5, minLine: 5,
    palette: { body: '#8f3a4a', belly: '#d16b7a', fin: '#5f2230', eye: '#ffd45e' },
    locations: ['the_abyss'],
  },
  {
    id: 'coelacanth', name: 'Coelacanth', archetype: 'slim', tier: 'legendary',
    weight: 16, price: 2000, weightIn: 1, minBait: 5, minRod: 5, minLine: 5,
    palette: { body: '#3a6b8f', belly: '#8fb8d6', fin: '#e0b552', eye: '#101020', spot: '#e8d08a' },
    locations: ['the_abyss'],
  },
  {
    id: 'ghost_shrimp', name: 'Ghost Shrimp', archetype: 'shrimp', tier: 'common',
    weight: 0.7, price: 60, weightIn: 10, minBait: 0, minRod: 3, minLine: 2,
    palette: { body: '#dce4ea', belly: '#f6f9fb', fin: '#b8c4ce', eye: '#101020' },
    locations: ['the_abyss'],
  },
  {
    id: 'deep_jelly', name: 'Deep Sea Jelly', archetype: 'jelly', tier: 'uncommon',
    weight: 3, price: 240, weightIn: 10, minBait: 2, minRod: 3, minLine: 3,
    palette: { body: '#7a5f9c', belly: '#c0a8dc', fin: '#8f6fb0', eye: '#101020' },
    locations: ['the_abyss', 'deep_ocean'],
  },
  {
    id: 'viperfish', name: 'Viperfish', archetype: 'slim', tier: 'rare',
    weight: 6, price: 500, weightIn: 6, minBait: 4, minRod: 4, minLine: 4,
    palette: { body: '#1f2a3a', belly: '#3f4f66', fin: '#141c28', eye: '#ff6b6b', lure: '#a8ffdf' },
    locations: ['the_abyss'],
  },
  {
    id: 'frilled_shark', name: 'Frilled Shark', archetype: 'eel', tier: 'rare',
    weight: 11, price: 700, weightIn: 4, minBait: 4, minRod: 4, minLine: 4,
    palette: { body: '#5a6a72', belly: '#c8d2d8', fin: '#3d4a52', eye: '#ffd45e' },
    locations: ['the_abyss'],
  },
  {
    id: 'dumbo_octopus', name: 'Dumbo Octopus', archetype: 'blob', tier: 'rare',
    weight: 5, price: 620, weightIn: 5, minBait: 4, minRod: 4, minLine: 4,
    palette: { body: '#b0889c', belly: '#e0c2d0', fin: '#8f6a7c', eye: '#101020' },
    locations: ['the_abyss'],
  },
  {
    id: 'abyssal_jelly', name: 'Abyssal Jelly', archetype: 'jelly', tier: 'legendary',
    weight: 8, price: 1300, weightIn: 2, minBait: 5, minRod: 4, minLine: 5,
    palette: { body: '#2a3a5c', belly: '#5f7fa8', fin: '#1c2842', eye: '#a8ffdf' },
    locations: ['the_abyss'],
  },

  // ------------------------------------------------------------- The jokes
  {
    id: 'old_shoe', name: 'An Old Shoe', archetype: 'boot', tier: 'joke',
    weight: 2, price: 4, weightIn: 9, minBait: 0, minRod: 0, minLine: 0,
    palette: { body: '#6b4a34', belly: '#8f6a4f', fin: '#4a3122', eye: '#101020' },
    locations: ['sunny_bay', 'rocky_shore', 'deep_ocean', 'coral_reef', 'the_abyss'],
    joke: 'It has been here since 2019. It knows things.',
  },
  {
    id: 'bottle', name: 'Message in a Bottle', archetype: 'bottle', tier: 'joke',
    weight: 1, price: 8, weightIn: 7, minBait: 0, minRod: 0, minLine: 0,
    palette: { body: '#9fe0c8', belly: '#d8f5e8', fin: '#6fb89e', eye: '#101020' },
    locations: ['sunny_bay', 'rocky_shore', 'deep_ocean', 'coral_reef', 'the_abyss'],
    joke: '"Help, I\'m a developer." — Signed, someone still waiting on a code review.',
  },
  {
    id: 'banana', name: 'A Soggy Banana', archetype: 'note', tier: 'joke',
    weight: 1, price: 3, weightIn: 6, minBait: 0, minRod: 0, minLine: 0,
    palette: { body: '#e8d264', belly: '#f5e79a', fin: '#bda63c', eye: '#101020' },
    locations: ['sunny_bay', 'rocky_shore', 'deep_ocean', 'coral_reef', 'the_abyss'],
    joke: 'It is not a fish. It is not food. It is committed.',
  },
  {
    id: 'toilet_seat', name: 'Golden Toilet Seat', archetype: 'seat', tier: 'joke',
    weight: 4, price: 6000, weightIn: 1, minBait: 4, minRod: 3, minLine: 3,
    palette: { body: '#ffd45e', belly: '#fff0b8', fin: '#c9992b', eye: '#101020' },
    locations: ['deep_ocean', 'the_abyss', 'coral_reef'],
    joke: 'Legendary. Rarer than the coelacanth. Questionable hygiene.',
    legendaryJoke: true,
  },
  {
    id: 'stolen_bait', name: 'A Very Interested Fish', archetype: 'slim', tier: 'joke',
    weight: 1, price: 0, weightIn: 5, minBait: 0, minRod: 0, minLine: 0,
    palette: { body: '#ff9ec4', belly: '#ffd9e6', fin: '#e87ba5', eye: '#101020' },
    locations: ['sunny_bay', 'rocky_shore', 'deep_ocean', 'coral_reef', 'the_abyss'],
    joke: 'It took your bait. It is not sorry. It is very smug.',
    stealsBait: true,
  },
  {
    id: 'giant_fish', name: 'The Giant One', archetype: 'shark', tier: 'joke',
    weight: 30, price: 0, weightIn: 2, minBait: 3, minRod: 3, minLine: 4,
    palette: { body: '#5f7a8f', belly: '#c8d8e4', fin: '#3f5566', eye: '#ffd45e' },
    locations: ['deep_ocean', 'the_abyss'],
    joke: 'It pulled your boat. Your boat has complaints now. You let it go.',
    escapes: true,
  },
  {
    id: 'rubber_duck', name: 'A Rubber Duck', archetype: 'note', tier: 'joke',
    weight: 1, price: 250, weightIn: 4, minBait: 0, minRod: 0, minLine: 0,
    palette: { body: '#ffd45e', belly: '#fff0b8', fin: '#c9992b', eye: '#101020' },
    locations: ['sunny_bay', 'rocky_shore', 'deep_ocean', 'coral_reef', 'the_abyss'],
    joke: 'It squeaked when you reeled it in. It cost more than your lunch.',
  },
  {
    id: 'tiny_fish', name: 'The Smallest Fish', archetype: 'slim', tier: 'joke',
    weight: 0.2, price: 1, weightIn: 6, minBait: 0, minRod: 0, minLine: 0,
    palette: { body: '#d8e4ec', belly: '#f4f9fc', fin: '#a8bccc', eye: '#101020' },
    locations: ['sunny_bay', 'rocky_shore', 'deep_ocean', 'coral_reef', 'the_abyss'],
    joke: 'You caught it. It was already dead. It was that small.',
  },
];

/**
 * Fishing locations.
 * unlock: { coins, boat, rod, line, bait }
 *   - boat/coins gate access
 *   - rod/line/bait gate access too, so you never travel somewhere your
 *     gear cannot actually fish profitably.
 */
export const LOCATIONS = [
  {
    id: 'sunny_bay',
    name: 'Sunny Bay',
    tagline: 'Calm water. Loud seagulls.',
    sky: ['#7fc4f0', '#bfe4f8'],
    water: ['#2f7fc4', '#1f5f9c'],
    waterDeep: '#14467a',
    sand: '#e8c98a',
    ambience: 'shore',
    unlock: { coins: 0, boat: 0, rod: 0, line: 0, bait: 0 },
    blurb: 'Where every fisherman starts. The water is warm and the fish are small.',
  },
  {
    id: 'rocky_shore',
    name: 'Rocky Shore',
    tagline: 'Waves. Rocks. Squid.',
    sky: ['#6ab0e0', '#a8d4ef'],
    water: ['#2878b0', '#1a5588'],
    waterDeep: '#123c68',
    sand: '#9a9a8a',
    ambience: 'rocks',
    unlock: { coins: 1200, boat: 1, rod: 1, line: 1, bait: 0 },
    blurb: 'Cliffsides full of hiding squid and flatter, angrier flounder.',
  },
  {
    id: 'deep_ocean',
    name: 'Deep Ocean',
    tagline: 'Now it gets serious.',
    sky: ['#3a6ea8', '#5f92c8'],
    water: ['#1f5f9c', '#14457a'],
    waterDeep: '#0c2f57',
    sand: '#5f7a8a',
    ambience: 'deep',
    unlock: { coins: 4500, boat: 2, rod: 2, line: 2, bait: 1 },
    blurb: 'The light stops reaching. Bring the good line.',
  },
  {
    id: 'coral_reef',
    name: 'Coral Reef',
    tagline: 'Pretty. Prickly. Expensive.',
    sky: ['#4fc0d8', '#a8e8ee'],
    water: ['#1f9cb0', '#157a90'],
    waterDeep: '#0f5a72',
    sand: '#e0a0b0',
    ambience: 'reef',
    unlock: { coins: 14000, boat: 3, rod: 2, line: 2, bait: 1 },
    blurb: 'Every third fish is worth more than your boat. Also, they sting.',
  },
  {
    id: 'the_abyss',
    name: 'The Abyss',
    tagline: 'Do not look down.',
    sky: ['#101a3d', '#1b2a52'],
    water: ['#0d1b3d', '#081227'],
    waterDeep: '#040a18',
    sand: '#2a3350',
    ambience: 'abyss',
    unlock: { coins: 20000, boat: 4, rod: 3, line: 3, bait: 3 },
    blurb: 'Lights that are not lights. Shapes that are not shapes. Bring everything.',
  },
];

/**
 * Upgrade tracks. Level 0 = none owned.
 * Each track has an array of levels; index = level.
 */
export const UPGRADES = {
  rod: {
    name: 'Better Rod',
    icon: 'rod',
    desc: 'A sturdier rod casts further and lands bigger fish.',
    levels: [
      { cost: 0, label: 'Bamboo Stick' },
      { cost: 60, label: 'Fiberglass Rod' },
      { cost: 280, label: 'Carbon Rod' },
      { cost: 1000, label: 'Steel Rod' },
      { cost: 3000, label: 'Graphite Pro' },
      { cost: 12000, label: 'Ancient Starlight' },
    ],
  },
  line: {
    name: 'Better Line',
    icon: 'line',
    desc: 'Stronger line holds against heavy fish. Weak line snaps.',
    levels: [
      { cost: 0, label: 'Cotton Thread' },
      { cost: 50, label: 'Braided Silk' },
      { cost: 220, label: 'Nylon Cord' },
      { cost: 900, label: 'Steel Leader' },
      { cost: 2800, label: 'Carbon Weave' },
      { cost: 12000, label: 'TITANIUM' },
    ],
  },
  bait: {
    name: 'Better Bait',
    icon: 'bait',
    desc: 'Better bait attracts rarer fish. Your bait box never runs empty.',
    levels: [
      { cost: 0, label: 'Worms' },
      { cost: 100, label: 'Shrimp' },
      { cost: 400, label: 'Squid Strips' },
      { cost: 1400, label: 'Scented Lure' },
      { cost: 4000, label: 'Glow Worm' },
      { cost: 18000, label: 'Pure Chaos' },
    ],
  },
  boat: {
    name: 'Bigger Rig',
    icon: 'boat',
    desc: 'A sturdier rig reaches deeper, stranger waters.',
    levels: [
      { cost: 0, label: 'Timber Platform' },
      { cost: 250, label: 'Steel Rig' },
      { cost: 1200, label: 'Offshore Rig' },
      { cost: 4000, label: 'Helideck Rig' },
      { cost: 16000, label: 'Research Platform' },
      { cost: 40000, label: 'The Ark' },
    ],
  },
  finder: {
    name: 'Fish Finder',
    icon: 'finder',
    desc: 'Reveals nearby rare fish and shows what is lurking below.',
    levels: [
      { cost: 0, label: 'None' },
      { cost: 200, label: 'Crude Sonar' },
      { cost: 800, label: 'Beeper' },
      { cost: 2600, label: 'Depth Sounder' },
      { cost: 9000, label: 'Thermal Scope' },
      { cost: 30000, label: 'Precognition' },
    ],
  },
};

/** Pack sizes for consumable bait, bought in the shop. */
export const BAIT_PACKS = [
  { amount: 5, cost: 0 },   // free starter pack, granted on new game
  { amount: 10, cost: 40 },
  { amount: 25, cost: 90 },
  { amount: 60, cost: 190 },
];

/** Shop goods. */
export const SHOP_ITEMS = [
  { id: 'bait5', name: 'Bait x5', desc: '5 worms. Enough for a few lucky casts.', cost: 40, kind: 'bait', amount: 5 },
  { id: 'bait10', name: 'Bait x10', desc: 'A proper handful of worms.', cost: 75, kind: 'bait', amount: 10 },
  { id: 'bait25', name: 'Bait x25', desc: 'Yes, twenty-five. For serious anglers.', cost: 160, kind: 'bait', amount: 25 },
];

/** XP needed to reach each level (index = level reached). */
export const XP_TABLE = [
  0, 40, 100, 200, 360, 580, 880, 1300, 1850, 2600, 3600, 5000, 6900, 9400, 12800,
];

export const FISH_BY_ID = Object.fromEntries(FISH.map((f) => [f.id, f]));
export const LOCATION_BY_ID = Object.fromEntries(LOCATIONS.map((l) => [l.id, l]));

/** Level needed for a given xp total. */
export function levelFromXp(xp) {
  let lvl = 0;
  while (lvl < XP_TABLE.length - 1 && xp >= XP_TABLE[lvl + 1]) lvl++;
  return lvl;
}

/** XP required to advance from `level` to the next. */
export function xpForNextLevel(level) {
  if (level >= XP_TABLE.length - 1) return Infinity;
  return XP_TABLE[level + 1] - XP_TABLE[level];
}
