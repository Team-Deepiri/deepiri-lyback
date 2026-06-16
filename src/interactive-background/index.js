/**
 * Deepiri Lyback - Main Entry Point
 * 
 * Export all modules for easy importing
 */

/* global InteractiveWorld */
const DeepiriLyback = {
  Engine: InteractiveEngine,
  WorldEngine: InteractiveWorld,
  Encoder: InteractiveEncoder,
  Player: InteractivePlayer,
  Bundler: WallpaperBundler,
  Utils: Utils,
  VERSION: '1.0.0'
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeepiriLyback;
}