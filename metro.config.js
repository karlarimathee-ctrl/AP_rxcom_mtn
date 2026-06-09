const { getDefaultConfig } = require("expo/metro-config");
 
const config = getDefaultConfig(__dirname);
 
// Résout le bug "Unable to resolve ./create from css-tree"
// css-tree est une dépendance de react-native-svg/css qui ne fonctionne
// pas avec Metro — on le redirige vers un module vide.
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === "css-tree") {
        return {
            type: "empty",
        };
    }
    return context.resolveRequest(context, moduleName, platform);
};
 
module.exports = config;