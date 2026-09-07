const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['node_modules/**', '.expo/**', 'android/**', 'ios/**'],
  },
  {
    // eslint-config-expo@57 trae eslint-plugin-react-hooks@6 con reglas nuevas
    // orientadas al React Compiler. El patrón `useRef(new Animated.Value(0)).current`
    // (animaciones RN) dispara `react-hooks/refs` en decenas de archivos sin ser
    // un bug real. Se mantienen apagadas como antes de subir a SDK 57.
    rules: {
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];
