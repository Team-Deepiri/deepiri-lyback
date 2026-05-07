/**
 * Deepiri Livegrounds - Main Entry Point
 * 
 * Export all modules for easy importing
 */
const DeepiriLivegrounds = {
  Engine: InteractiveEngine,
  Encoder: InteractiveEncoder,
  Player: InteractivePlayer,
  Bundler: WallpaperBundler,
  Utils: Utils,
  VERSION: '1.0.0'
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeepiriLivegrounds;
}