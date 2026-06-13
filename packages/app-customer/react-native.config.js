/** Bloqueia autolink do expo-updates (update via APK + version.json). */
module.exports = {
    dependencies: {
        'expo-updates': {
            platforms: {
                android: null,
                ios: null,
            },
        },
    },
};
